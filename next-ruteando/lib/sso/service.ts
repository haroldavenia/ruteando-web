/**
 * Inicio de sesión único: Google, GitHub, Apple y el proveedor OIDC propio de cada empresa. La sesión es del HanoIT Gateway y solo se
 * obtiene con correo y contraseña, así que tras identificar a la persona el BFF pide la sesión al gateway con `POST /auth/sso/exchange`
 * (contrato en openspec/changes/add-sso/design.md; hay que pedirlo al gateway real) y la entrega por el mismo canal que el login: un
 * ticket de un solo uso (5 min) que el cliente canjea en `POST /middleware/sso/complete`, pasando por el segundo factor si corresponde.
 *
 * Portado de server/sso/index.js sin Express. Las URI de redirección registradas en los proveedores no cambian
 * (`<SSO_REDIRECT_BASE_URL>/gateway/sso/<proveedor>/callback`): `next.config.ts` reescribe `/gateway/sso/*` a `/middleware/sso/*`.
 * Apagado sin `SSO_ENABLED_PROVIDERS`, `SSO_REDIRECT_BASE_URL` o `MFA_SECRET_KEY`.
 */
import crypto from 'node:crypto';
import dns from 'node:dns';
import path from 'node:path';

import { readCapped } from '../body';
import { gatewayFetch, GatewayUnavailable } from '../gateway';
import { createCrypto, parseMasterKey } from '../mfa/crypto';
import { getMfa, type MfaAuth, type MfaOut } from '../mfa/service';
import type { GatewaySession } from '../session';
import { createGithubClient } from './github';
import { type FetchLike, SsoError } from './http';
import { signEs256 } from './jwt';
import { checkIssuer, createOidcClient, type SsoClient } from './oidc';
import { safeFetch } from './safe-fetch';
import { type Enterprise, openSsoStore, type SsoStore } from './store';

const ADMIN_ROLES = ['tenant_admin', 'super_admin'];
const KNOWN = ['google', 'github', 'apple', 'enterprise'];
const LABELS: Record<string, string> = { google: 'Google', github: 'GitHub', apple: 'Apple', enterprise: 'SSO' };
const FLOW_TTL_MS = 10 * 60 * 1000;
const TICKET_TTL_MS = 5 * 60 * 1000;
const MAX_PENDING = 500;
export const SSO_COOKIE = 'ruteando_sso';
/** Dominios de correo públicos: nadie puede ser «dueño» de ellos, así que nunca se aceptan (ni verificables por casualidad). */
const PUBLIC_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.es',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'qq.com',
  '163.com',
  'hotmail.es',
  'outlook.es',
  'live.com.mx',
  'hotmail.com.mx',
]);
/** Para demostrar que controla el dominio, el administrador publica `ruteando-verify=<valor>` como TXT en `_ruteando-verify.<dominio>`. */
const VERIFY_LABEL = '_ruteando-verify';
const DNS_TIMEOUT_MS = 5000;
const DOMAIN = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

type Env = Record<string, string | undefined>;
type GatewayCall = (path: string, init?: RequestInit & { token?: string }) => Promise<Response>;

export interface SsoOverrides {
  now?: () => number;
  fetchImpl?: FetchLike;
  gateway?: GatewayCall;
  store?: SsoStore;
  /** Resolución de registros TXT (pruebas); por defecto, el DNS del sistema. */
  resolveTxt?: (host: string) => Promise<string[][]>;
  /** Con el segundo factor activo, el SSO pasa por el mismo segundo paso. */
  mfa?: { enabled: boolean; afterLogin(session: GatewaySession): MfaOut | null } | null;
}

/** Redirección que el Route Handler traduce a una respuesta 302 con su cookie. */
export interface SsoRedirect {
  location: string;
  /** Valor completo de `Set-Cookie`. */
  cookie?: string;
}

class Fail extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}
const out = (status: number, json: unknown, session?: GatewaySession): MfaOut => ({ status, json, session });
const failOut = (f: Fail): MfaOut => out(f.status, { code: f.code, message: f.message });

const rand = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('base64url');
const equal = (a: string, b: string) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Mapa con caducidad y tope: el que se llena descarta lo más antiguo (un `start` repetido no agota la memoria). */
function createExpiringMap<T>(ttlMs: number, now: () => number) {
  const items = new Map<string, { value: T; expiresAt: number }>();
  const sweep = () => {
    const t = now();
    for (const [k, v] of items) if (v.expiresAt <= t) items.delete(k);
  };
  return {
    put(key: string, value: T) {
      sweep();
      if (items.size >= MAX_PENDING) items.delete(items.keys().next().value!);
      items.set(key, { value, expiresAt: now() + ttlMs });
    },
    /** Entrega y olvida (de un solo uso). */
    take(key: unknown): T | null {
      sweep();
      const k = String(key || '');
      const entry = items.get(k);
      items.delete(k);
      return entry ? entry.value : null;
    },
    size: () => items.size,
  };
}

interface Flow {
  name: string;
  tenantId: string | null;
  enterprise: Enterprise | null;
  nonce: string;
  codeVerifier: string;
  binding: string;
}

export function createSso(env: Env = process.env, overrides: SsoOverrides = {}) {
  const now = overrides.now || Date.now;
  const requested = String(env.SSO_ENABLED_PROVIDERS || '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => KNOWN.includes(p));
  const masterKey = parseMasterKey(env.MFA_SECRET_KEY);
  const rawBase = String(env.SSO_REDIRECT_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const baseOk = /^https?:\/\/[^/]+$/i.test(rawBase);
  const reason = !requested.length
    ? 'Falta SSO_ENABLED_PROVIDERS'
    : !baseOk
      ? 'Falta SSO_REDIRECT_BASE_URL (por ejemplo https://ruteando.example.com)'
      : !masterKey
        ? 'Falta MFA_SECRET_KEY (cifra el secreto de cada empresa)'
        : null;
  const goto = (hash: string): SsoRedirect => ({ location: `/access/sso#${hash}` });
  const providerList = (ids: string[]) => ids.map((id) => ({ id, label: LABELS[id] }));

  if (reason || !masterKey) {
    const disabled = async () => failOut(new Fail(503, 'SSO_DISABLED', 'El inicio de sesión único no está activado.'));
    return {
      enabled: false as const,
      reason,
      providers: [] as string[],
      listProviders: () => ({ providers: [] as { id: string; label: string }[] }),
      start: async (): Promise<SsoRedirect> => goto('error=NO_PROVIDER'),
      callback: async (): Promise<SsoRedirect> => goto('error=NO_PROVIDER'),
      complete: (_ticket?: unknown) =>
        failOut(new Fail(503, 'SSO_DISABLED', 'El inicio de sesión único no está activado.')),
      manage: disabled as (r: Request, p: string, a: MfaAuth) => Promise<MfaOut>,
    };
  }

  const allowInsecure = env.SSO_ALLOW_INSECURE === 'true';
  // Salvo en pruebas y desarrollo (SSO_ALLOW_INSECURE), las llamadas salientes solo conectan con direcciones públicas
  const fetchImpl: FetchLike = overrides.fetchImpl || (allowInsecure ? (fetch as unknown as FetchLike) : safeFetch);
  const codec = createCrypto(masterKey);
  const gateway: GatewayCall = overrides.gateway || ((p, init) => gatewayFetch(p, init));
  const store =
    overrides.store ||
    openSsoStore(env.SSO_DB_PATH || path.join(process.cwd(), 'data', 'sso.sqlite'), { now: () => new Date(now()) });
  const mfa = overrides.mfa || null;
  const resolveTxt =
    overrides.resolveTxt ||
    ((host: string) =>
      Promise.race([
        dns.promises.resolveTxt(host),
        new Promise<string[][]>((_, no) => setTimeout(() => no(new Error('dns')), DNS_TIMEOUT_MS)),
      ]));
  const flows = createExpiringMap<Flow>(FLOW_TTL_MS, now);
  const tickets = createExpiringMap<GatewaySession>(TICKET_TTL_MS, now);
  const secureCookie = rawBase.startsWith('https:');

  // ---------- proveedores ----------
  const credentials: Record<string, () => unknown> = {
    google: () => env.SSO_GOOGLE_CLIENT_ID && env.SSO_GOOGLE_CLIENT_SECRET,
    github: () => env.SSO_GITHUB_CLIENT_ID && env.SSO_GITHUB_CLIENT_SECRET,
    apple: () => env.SSO_APPLE_CLIENT_ID && env.SSO_APPLE_TEAM_ID && env.SSO_APPLE_KEY_ID && env.SSO_APPLE_PRIVATE_KEY,
    enterprise: () => true,
  };
  const providers = requested.filter((p) => credentials[p]());
  const issuerOverride = (name: string) => (allowInsecure ? env[`SSO_${name}_ISSUER`] : undefined); // solo pruebas y desarrollo

  /** Secreto de cliente de Apple: un JWT firmado con la clave de la cuenta (vale 5 minutos, se firma en cada canje). */
  const appleSecret = async () =>
    signEs256(
      { kid: env.SSO_APPLE_KEY_ID },
      {
        iss: env.SSO_APPLE_TEAM_ID,
        iat: Math.floor(now() / 1000),
        exp: Math.floor(now() / 1000) + 300,
        aud: 'https://appleid.apple.com',
        sub: env.SSO_APPLE_CLIENT_ID,
      },
      String(env.SSO_APPLE_PRIVATE_KEY).replace(/\\n/g, '\n')
    );

  const common = { fetchImpl, now, allowInsecure };
  const builders: Record<string, () => SsoClient> = {
    google: () =>
      createOidcClient({
        issuer: issuerOverride('GOOGLE') || 'https://accounts.google.com',
        clientId: env.SSO_GOOGLE_CLIENT_ID!,
        getClientSecret: async () => env.SSO_GOOGLE_CLIENT_SECRET!,
        ...common,
      }),
    apple: () =>
      createOidcClient({
        issuer: issuerOverride('APPLE') || 'https://appleid.apple.com',
        clientId: env.SSO_APPLE_CLIENT_ID!,
        getClientSecret: appleSecret,
        scopes: ['openid', 'email', 'name'],
        extraParams: { response_mode: 'form_post' }, // Apple exige form_post al pedir email y nombre
        ...common,
      }),
    github: () =>
      createGithubClient({
        clientId: env.SSO_GITHUB_CLIENT_ID!,
        clientSecret: env.SSO_GITHUB_CLIENT_SECRET!,
        fetchImpl,
        urls: allowInsecure && env.SSO_GITHUB_BASE ? JSON.parse(env.SSO_GITHUB_BASE) : {},
      }),
  };
  const clients = new Map<string, SsoClient>();
  const clientFor = (name: string) => {
    if (!clients.has(name)) clients.set(name, builders[name]());
    return clients.get(name)!;
  };
  /** El cliente OIDC de una empresa se arma con lo guardado (el secreto se descifra solo al canjear el código). */
  const enterpriseClient = (cfg: Enterprise) =>
    createOidcClient({
      issuer: cfg.issuer,
      clientId: cfg.clientId,
      getClientSecret: async () => (cfg.secretEnc ? codec.decrypt(cfg.secretEnc) : ''),
      ...common,
    });

  const redirectUri = (name: string) => `${rawBase}/gateway/sso/${name}/callback`;
  const failTo = (code: string, user?: { id: string; tenantId: string }): SsoRedirect => {
    if (user) store.addEvent({ userId: user.id, tenantId: user.tenantId, kind: 'login_failed', detail: code });
    return goto(`error=${encodeURIComponent(code)}`);
  };
  const clearCookie = `${SSO_COOKIE}=; Path=/gateway/sso; HttpOnly; Max-Age=0`;

  // ---------- inicio y regreso del proveedor ----------
  async function start(name: string, emailParam: unknown): Promise<SsoRedirect> {
    try {
      if (!providers.includes(name)) return failTo('NO_PROVIDER');
      let client: SsoClient;
      let tenantId: string | null = null;
      let enterprise: Enterprise | null = null;
      if (name === 'enterprise') {
        const email = String(emailParam || '')
          .trim()
          .toLowerCase();
        const owner = store.domainOwner(email.split('@')[1] || '');
        enterprise = owner ? store.getEnterprise(owner) : null;
        // Mismo error para «dominio desconocido» y «SSO apagado»: no se revela qué empresas lo tienen
        if (!owner || !enterprise || !store.getPolicy(owner).enabled) return failTo('NO_PROVIDER');
        tenantId = owner;
        client = enterpriseClient(enterprise);
      } else {
        client = clientFor(name);
      }
      const state = rand();
      const nonce = rand(16);
      const codeVerifier = rand(48);
      const binding = rand();
      const url = await client.authorizationUrl({
        redirectUri: redirectUri(name),
        state,
        nonce,
        codeChallenge: sha256(codeVerifier),
      });
      flows.put(state, { name, tenantId, enterprise, nonce, codeVerifier, binding });
      // La cookie liga el regreso al navegador que empezó (contra el «login CSRF»). Con form_post (Apple) el regreso es un POST entre
      // sitios: solo viaja con SameSite=None, que exige Secure.
      const sameSite = client.usesFormPost ? 'None' : 'Lax';
      const secure = secureCookie || client.usesFormPost ? '; Secure' : '';
      return {
        location: url,
        cookie: `${SSO_COOKIE}=${binding}; Path=/gateway/sso; HttpOnly; SameSite=${sameSite}; Max-Age=600${secure}`,
      };
    } catch (err) {
      if (!(err instanceof SsoError)) console.error('[sso]', err instanceof Error ? err.name : typeof err);
      return failTo(err instanceof SsoError ? err.code : 'PROVIDER_ERROR');
    }
  }

  /** Pide la sesión al gateway; devuelve `{ session }` o `{ code }`. */
  async function exchange(identity: { subject: string; email: string }, key: string) {
    const res = await gateway('/auth/sso/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: key, subject: identity.subject, email: identity.email, emailVerified: true }),
    });
    const json = (await res.json().catch(() => null)) as GatewaySession | null;
    if (res.status === 200 && json?.user?.id && json.accessToken) return { session: json };
    if (res.status === 404) return { code: 'NO_ACCOUNT' };
    if (res.status === 403) return { code: 'ACCOUNT_DISABLED' };
    return { code: 'GATEWAY_ERROR' };
  }

  /** `params` es la consulta (GET) o el formulario (POST, Apple); `binding` la cookie `ruteando_sso` del navegador. */
  async function callback(
    name: string,
    params: Record<string, string | undefined>,
    binding: string
  ): Promise<SsoRedirect> {
    const flow = flows.take(params.state);
    const bound = flow && equal(binding, flow.binding);
    const redirect = (r: SsoRedirect): SsoRedirect => ({ ...r, cookie: clearCookie });
    // `:provider` de la dirección debe ser el del flujo: un código de un proveedor no se canjea en otro
    if (!flow || !bound || flow.name !== name) return redirect(failTo('STATE_INVALID'));
    if (params.error) return redirect(failTo(params.error === 'access_denied' ? 'DENIED' : 'PROVIDER_ERROR'));
    if (typeof params.code !== 'string' || !params.code) return redirect(failTo('PROVIDER_ERROR'));

    try {
      // Lo guardado AHORA, no lo de hace unos minutos: si el administrador cambió el emisor o quitó el dominio, ese flujo ya no vale.
      const enterprise = flow.tenantId ? store.getEnterprise(flow.tenantId) : null;
      if (flow.tenantId && !enterprise) return redirect(failTo('NO_PROVIDER'));
      const client = flow.name === 'enterprise' ? enterpriseClient(enterprise!) : clientFor(flow.name);
      const identity = await client.complete({
        code: params.code,
        redirectUri: redirectUri(flow.name),
        codeVerifier: flow.codeVerifier,
        nonce: flow.nonce,
      });
      if (!identity.email) return redirect(failTo('EMAIL_MISSING'));
      if (flow.tenantId) {
        // Empresa: su propio proveedor es la autoridad de sus dominios (algunos, como Azure AD, no mandan `email_verified`)
        const domain = identity.email.split('@')[1];
        if (identity.emailVerified === false) return redirect(failTo('EMAIL_NOT_VERIFIED'));
        if (!enterprise!.verifiedDomains.includes(domain)) return redirect(failTo('WRONG_DOMAIN'));
      } else if (identity.emailVerified !== true) {
        return redirect(failTo('EMAIL_NOT_VERIFIED')); // nunca se vincula por un correo que el proveedor no verificó
      }
      const key = flow.tenantId ? `enterprise:${flow.tenantId}` : flow.name;
      const ex = await exchange(identity, key);
      if (!ex.session) return redirect(failTo(ex.code!));
      const user = ex.session.user;
      if (flow.tenantId && user.tenantId !== flow.tenantId) return redirect(failTo('WRONG_TENANT', user));
      // El administrador de una empresa controla su proveedor: con él podría afirmar el correo de un super_admin de su empresa
      if (flow.tenantId && user.role === 'super_admin') return redirect(failTo('ROLE_NOT_ALLOWED', user));
      if (!store.getPolicy(user.tenantId).enabled) return redirect(failTo('SSO_DISABLED', user));
      // Una identidad ya enlazada a otra persona no se reasigna sola (el correo pudo cambiar de dueño en el proveedor)
      const linked = store.getIdentity(key, identity.subject);
      if (linked && linked.userId !== user.id) return redirect(failTo('IDENTITY_MISMATCH', user));
      store.putIdentity({
        provider: key,
        subject: identity.subject,
        userId: user.id,
        tenantId: user.tenantId,
        email: identity.email,
      });
      store.addEvent({
        userId: user.id,
        tenantId: user.tenantId,
        kind: linked ? 'login_ok' : 'identity_linked',
        detail: key,
      });
      const ticket = rand();
      tickets.put(ticket, ex.session);
      return redirect(goto(`ticket=${ticket}`));
    } catch (err) {
      if (err instanceof SsoError) return redirect(failTo(err.code));
      if (err instanceof GatewayUnavailable) return redirect(failTo('GATEWAY_ERROR'));
      console.error('[sso]', err instanceof Error ? err.name : typeof err);
      return redirect(failTo('PROVIDER_ERROR'));
    }
  }

  /** Canjea el ticket del regreso por lo mismo que daría un login: sesión (que el Route Handler vuelve cookies), reto de segundo factor o activación obligatoria. */
  function complete(ticket: unknown): MfaOut {
    const session = tickets.take(ticket);
    if (!session) return failOut(new Fail(401, 'TICKET_EXPIRED', 'El inicio de sesión caducó. Inténtalo de nuevo.'));
    const next = mfa?.enabled ? mfa.afterLogin(session) : null;
    return next ?? out(200, { user: session.user }, session);
  }

  // ---------- gestión (con sesión) ----------
  type Body = Record<string, unknown>;
  const publicName = (provider: string) => (provider.startsWith('enterprise:') ? 'enterprise' : provider);

  /** Empresa sobre la que actúa un administrador: la suya; `super_admin` puede indicar otra con `tenantId`. */
  function targetTenant(user: { tenantId: string; role: string }, asked: unknown) {
    if (!asked || asked === user.tenantId) return user.tenantId;
    if (user.role === 'super_admin') return String(asked);
    throw new Fail(403, 'FORBIDDEN', 'No puedes actuar sobre otra empresa.');
  }

  /** Valor del TXT: derivado de la clave maestra, la empresa y el dominio (no hay nada que guardar y no se puede adivinar ni copiar de otra empresa). */
  const domainProof = (tenantId: string, domain: string) =>
    `ruteando-verify=${codec.hash('sso-domain', `${tenantId}:${domain}`).slice(0, 48)}`;

  const enterpriseView = (tenantId: string) => {
    const e = store.getEnterprise(tenantId);
    return {
      available: providers.includes('enterprise'),
      configured: Boolean(e),
      name: e?.name ?? '',
      issuer: e?.issuer ?? '',
      clientId: e?.clientId ?? '',
      hasSecret: Boolean(e?.secretEnc), // el secreto nunca vuelve al navegador
      domains: (e?.domains ?? []).map((domain) => ({
        domain,
        verified: e!.verifiedDomains.includes(domain),
        // Lo que debe publicar en DNS para demostrar que el dominio es suyo
        txtHost: `${VERIFY_LABEL}.${domain}`,
        txtValue: domainProof(tenantId, domain),
      })),
      redirectUri: redirectUri('enterprise'),
    };
  };

  async function route(request: Request, p: string, auth: MfaAuth): Promise<MfaOut> {
    const method = request.method;
    const user = auth.user;
    if (!user) throw new Fail(401, 'UNAUTHORIZED', 'Hace falta iniciar sesión.');
    let body: Body = {};
    if (method === 'PUT' || method === 'POST') {
      const raw = await readCapped(request, 20 * 1024);
      if (raw === null) throw new Fail(400, 'BAD_REQUEST', 'La petición no es válida.');
      try {
        const parsed = raw.byteLength ? JSON.parse(new TextDecoder().decode(raw)) : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed;
      } catch {
        throw new Fail(400, 'BAD_REQUEST', 'La petición no es válida.');
      }
    }
    const query = new URL(request.url).searchParams;
    const adminOnly = () => {
      if (!ADMIN_ROLES.includes(user.role)) throw new Fail(403, 'FORBIDDEN', 'No tienes permiso para esta acción.');
    };
    const needEnterprise = () => {
      if (!providers.includes('enterprise'))
        throw new Fail(503, 'SSO_DISABLED', 'El SSO empresarial no está activado en el servidor.');
    };

    if (method === 'GET' && p === '/identities') {
      return out(200, {
        identities: store.identitiesOf(user.id).map((i) => ({
          provider: publicName(i.provider),
          label: LABELS[publicName(i.provider)] || i.provider,
          email: i.email,
          linkedAt: i.createdAt,
          lastLoginAt: i.lastLoginAt,
        })),
      });
    }

    if (method === 'DELETE' && p.startsWith('/identities/')) {
      const name = p.slice('/identities/'.length);
      if (!KNOWN.includes(name)) throw new Fail(404, 'NOT_FOUND', 'Proveedor desconocido.');
      const key = name === 'enterprise' ? `enterprise:${user.tenantId}` : name;
      if (store.deleteIdentities(user.id, key) === 0) throw new Fail(404, 'NOT_FOUND', 'Esa cuenta no está vinculada.');
      store.addEvent({ userId: user.id, tenantId: user.tenantId, kind: 'identity_unlinked', detail: key });
      return out(200, { unlinked: true });
    }

    if (method === 'GET' && p === '/policy') {
      adminOnly();
      return out(200, {
        ...store.getPolicy(targetTenant(user, query.get('tenantId'))),
        providers: providerList(providers),
      });
    }
    if (method === 'PUT' && p === '/policy') {
      adminOnly();
      const tenantId = targetTenant(user, query.get('tenantId') || body.tenantId);
      if (typeof body.enabled !== 'boolean') throw new Fail(400, 'INVALID_POLICY', 'La política no es válida.');
      store.setPolicy({ tenantId, enabled: body.enabled });
      store.addEvent({ userId: user.id, tenantId, kind: 'policy_changed', detail: String(body.enabled) });
      return out(200, store.getPolicy(tenantId));
    }

    if (method === 'GET' && p === '/enterprise') {
      adminOnly();
      return out(200, enterpriseView(targetTenant(user, query.get('tenantId'))));
    }
    if (method === 'PUT' && p === '/enterprise') {
      adminOnly();
      needEnterprise();
      const tenantId = targetTenant(user, query.get('tenantId') || body.tenantId);
      const current = store.getEnterprise(tenantId);
      const name = String(body.name || '').trim();
      const issuer = String(body.issuer || '')
        .trim()
        .replace(/\/+$/, '');
      const clientId = String(body.clientId || '').trim();
      const secret = String(body.clientSecret || '');
      const domains = [
        ...new Set((Array.isArray(body.domains) ? body.domains : []).map((d) => String(d).trim().toLowerCase())),
      ];
      const invalid = (message: string) => new Fail(400, 'INVALID_PROVIDER', message);
      if (!name || name.length > 80) throw invalid('Escribe un nombre de hasta 80 caracteres.');
      if (!checkIssuer(issuer, allowInsecure)) throw invalid('El emisor debe ser una dirección https pública.');
      if (!clientId || clientId.length > 300) throw invalid('Escribe el identificador de cliente.');
      if (secret.length > 1000) throw invalid('El secreto es demasiado largo.');
      if (!secret && !current?.secretEnc) throw invalid('Escribe el secreto de cliente.');
      if (domains.length < 1 || domains.length > 10 || domains.some((d) => !DOMAIN.test(d))) {
        throw invalid('Escribe entre 1 y 10 dominios de correo válidos, por ejemplo empresa.com.');
      }
      const publicDomain = domains.find((d) => PUBLIC_DOMAINS.has(d));
      if (publicDomain)
        throw invalid(`${publicDomain} es un correo público: solo se admiten dominios propios de la empresa.`);
      // Solo choca con un dominio que otra empresa ya VERIFICÓ; reclamar es libre pero no sirve de nada hasta demostrarlo
      const taken = domains.find((d) => {
        const owner = store.domainOwner(d);
        return owner && owner !== tenantId;
      });
      if (taken) throw new Fail(409, 'DOMAIN_TAKEN', `El dominio ${taken} ya lo usa otra empresa.`);
      // Cambiar de emisor o de cliente invalida las identidades enlazadas con el anterior (otro `sub`)
      const changed = current && (current.issuer !== issuer || current.clientId !== clientId);
      store.putEnterprise({
        tenantId,
        name,
        issuer,
        clientId,
        secretEnc: secret ? codec.encrypt(secret) : (current?.secretEnc ?? null),
        domains,
      });
      if (changed) store.deleteProviderIdentities(tenantId, `enterprise:${tenantId}`);
      store.addEvent({ userId: user.id, tenantId, kind: 'enterprise_saved', detail: issuer });
      return out(200, enterpriseView(tenantId));
    }
    if (method === 'POST' && p === '/enterprise/verify') {
      adminOnly();
      needEnterprise();
      const tenantId = targetTenant(user, query.get('tenantId') || body.tenantId);
      const domain = String(body.domain || '')
        .trim()
        .toLowerCase();
      const current = store.getEnterprise(tenantId);
      if (!current?.domains.includes(domain))
        throw new Fail(404, 'NOT_FOUND', 'Ese dominio no está en la lista de la empresa.');
      if (current.verifiedDomains.includes(domain)) return out(200, enterpriseView(tenantId));
      const expected = domainProof(tenantId, domain);
      const records = await resolveTxt(`${VERIFY_LABEL}.${domain}`).catch(() => [] as string[][]);
      // Cada registro TXT llega partido en trozos de 255 bytes: se unen antes de comparar
      if (!records.some((chunks) => equal(chunks.join('').trim(), expected))) {
        throw new Fail(
          409,
          'DOMAIN_NOT_VERIFIED',
          `No se encontró el registro TXT. Publica ${expected} en ${VERIFY_LABEL}.${domain} y vuelve a intentarlo (el DNS puede tardar unos minutos).`
        );
      }
      if (!store.verifyDomain(tenantId, domain))
        throw new Fail(409, 'DOMAIN_TAKEN', `El dominio ${domain} ya lo verificó otra empresa.`);
      store.addEvent({ userId: user.id, tenantId, kind: 'domain_verified', detail: domain });
      return out(200, enterpriseView(tenantId));
    }
    if (method === 'DELETE' && p === '/enterprise') {
      adminOnly();
      const tenantId = targetTenant(user, query.get('tenantId'));
      if (!store.getEnterprise(tenantId)) throw new Fail(404, 'NOT_FOUND', 'No hay un proveedor configurado.');
      store.deleteEnterprise(tenantId);
      store.addEvent({ userId: user.id, tenantId, kind: 'enterprise_deleted' });
      return out(200, enterpriseView(tenantId));
    }

    throw new Fail(404, 'NOT_FOUND', 'Not found');
  }

  return {
    enabled: true as const,
    reason: null,
    providers,
    store,
    listProviders: () => ({ providers: providerList(providers) }),
    start,
    callback,
    complete,
    async manage(request: Request, p: string, auth: MfaAuth): Promise<MfaOut> {
      try {
        return await route(request, p, auth);
      } catch (err) {
        if (err instanceof Fail) return failOut(err);
        if (err instanceof GatewayUnavailable)
          return failOut(new Fail(err.status, 'GATEWAY_ERROR', 'El servicio no está disponible.'));
        // Solo la clase: el mensaje puede citar direcciones o credenciales
        console.error('[sso]', err instanceof Error ? err.name : typeof err);
        return failOut(new Fail(500, 'SSO_ERROR', 'No se pudo completar la operación.'));
      }
    },
  };
}

export type Sso = ReturnType<typeof createSso>;

let instance: Sso | undefined;
/** Una instancia por proceso: los flujos y tickets viven en memoria (una sola réplica). */
export function getSso(): Sso {
  return (instance ??= createSso(process.env, { mfa: getMfa() }));
}
export const resetSsoForTests = () => void (instance = undefined);
