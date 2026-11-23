/**
 * Inicio de sesión único (change add-sso): Google, GitHub, Apple y el proveedor OIDC propio de cada empresa. La sesión es del HanoIT
 * Gateway y solo se obtiene con correo y contraseña, así que tras identificar a la persona el servidor pide la sesión al gateway con
 * `POST /auth/sso/exchange` (contrato en openspec/changes/add-sso/design.md) y la entrega por el mismo canal que el login: un ticket de
 * un solo uso (5 min) que el cliente canjea en `POST /gateway/sso/complete`, pasando por el segundo factor si corresponde.
 *
 * `createSso(env, { mfa, ...overrides })` devuelve `{ enabled, providers, mount(app) }`. Sin proveedores configurados (o sin
 * `SSO_REDIRECT_BASE_URL` o `MFA_SECRET_KEY`) queda apagado: `/gateway/sso/providers` responde una lista vacía y el resto 503.
 */
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { createCrypto, parseMasterKey } = require('../mfa/crypto');
const { createGatewayClient, GatewayError } = require('../mfa/gateway');
const { createGithubClient } = require('./github');
const { SsoError } = require('./http');
const { signEs256 } = require('./jwt');
const { checkIssuer, createOidcClient } = require('./oidc');
const { safeFetch } = require('./safe-fetch');
const { openStore } = require('./store');

const ADMIN_ROLES = ['tenant_admin', 'super_admin'];
const KNOWN = ['google', 'github', 'apple', 'enterprise'];
const LABELS = { google: 'Google', github: 'GitHub', apple: 'Apple', enterprise: 'SSO' };
const FLOW_TTL_MS = 10 * 60 * 1000;
const TICKET_TTL_MS = 5 * 60 * 1000;
const MAX_PENDING = 500;
const COOKIE = 'ruteando_sso';
const DOMAIN = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const fail = (res, status, code, message, extra = {}) => res.status(status).json({ code, message, ...extra });
const rand = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('base64url');
const equal = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const cookieOf = (req, name) =>
  (req.headers.cookie || '')
    .split(';')
    .map((p) => p.trim().split('='))
    .find(([k]) => k === name)?.[1] || '';

/** Mapa con caducidad y tope: el que se llena descarta lo más antiguo (un `start` repetido no agota la memoria). */
function createExpiringMap(ttlMs, now) {
  const items = new Map();
  const sweep = () => {
    const t = now();
    for (const [k, v] of items) if (v.expiresAt <= t) items.delete(k);
  };
  return {
    put(key, value) {
      sweep();
      if (items.size >= MAX_PENDING) items.delete(items.keys().next().value);
      items.set(key, { value, expiresAt: now() + ttlMs });
    },
    /** Entrega y olvida (de un solo uso). */
    take(key) {
      sweep();
      const entry = items.get(String(key || ''));
      items.delete(String(key || ''));
      return entry ? entry.value : null;
    },
    size: () => items.size,
  };
}

function createSso(env = process.env, overrides = {}) {
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
  if (reason) {
    return {
      enabled: false,
      reason,
      providers: [],
      mount(app) {
        const router = express.Router();
        router.get('/providers', (req, res) => res.json({ providers: [] }));
        router.use((req, res) => fail(res, 503, 'SSO_DISABLED', 'El inicio de sesión único no está activado.'));
        app.use('/gateway/sso', router);
      },
    };
  }

  const allowInsecure = env.SSO_ALLOW_INSECURE === 'true';
  // Salvo en pruebas y desarrollo (SSO_ALLOW_INSECURE), las llamadas salientes solo conectan con direcciones públicas
  const fetchImpl = overrides.fetchImpl || (allowInsecure ? fetch : safeFetch);
  const codec = createCrypto(masterKey);
  const gateway = overrides.gateway || createGatewayClient(env, fetchImpl);
  const store =
    overrides.store ||
    openStore(env.SSO_DB_PATH || path.join(__dirname, '..', '..', 'data', 'sso.sqlite'), {
      now: () => new Date(now()),
    });
  const mfa = overrides.mfa || null; // con el segundo factor activo, el SSO pasa por el mismo segundo paso
  const flows = createExpiringMap(FLOW_TTL_MS, now);
  const tickets = createExpiringMap(TICKET_TTL_MS, now);
  const secureCookie = rawBase.startsWith('https:');

  // ---------- proveedores ----------
  const credentials = {
    google: () => env.SSO_GOOGLE_CLIENT_ID && env.SSO_GOOGLE_CLIENT_SECRET,
    github: () => env.SSO_GITHUB_CLIENT_ID && env.SSO_GITHUB_CLIENT_SECRET,
    apple: () => env.SSO_APPLE_CLIENT_ID && env.SSO_APPLE_TEAM_ID && env.SSO_APPLE_KEY_ID && env.SSO_APPLE_PRIVATE_KEY,
    enterprise: () => true,
  };
  const providers = requested.filter((p) => credentials[p]());
  const issuerOverride = (name) => (allowInsecure ? env[`SSO_${name}_ISSUER`] : undefined); // solo pruebas y desarrollo

  /** Secreto de cliente de Apple: un JWT firmado con la clave de la cuenta (vale 5 minutos, se firma en cada canje). */
  const appleSecret = () =>
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
  const builders = {
    google: () =>
      createOidcClient({
        issuer: issuerOverride('GOOGLE') || 'https://accounts.google.com',
        clientId: env.SSO_GOOGLE_CLIENT_ID,
        getClientSecret: async () => env.SSO_GOOGLE_CLIENT_SECRET,
        ...common,
      }),
    apple: () =>
      createOidcClient({
        issuer: issuerOverride('APPLE') || 'https://appleid.apple.com',
        clientId: env.SSO_APPLE_CLIENT_ID,
        getClientSecret: async () => appleSecret(),
        scopes: ['openid', 'email', 'name'],
        extraParams: { response_mode: 'form_post' }, // Apple exige form_post al pedir email y nombre
        ...common,
      }),
    github: () =>
      createGithubClient({
        clientId: env.SSO_GITHUB_CLIENT_ID,
        clientSecret: env.SSO_GITHUB_CLIENT_SECRET,
        fetchImpl,
        urls: allowInsecure && env.SSO_GITHUB_BASE ? JSON.parse(env.SSO_GITHUB_BASE) : {},
      }),
  };
  const clients = new Map();
  const clientFor = (name) => {
    if (!clients.has(name)) clients.set(name, builders[name]());
    return clients.get(name);
  };
  /** El cliente OIDC de una empresa se arma con lo guardado (el secreto se descifra solo al canjear el código). */
  const enterpriseClient = (cfg) =>
    createOidcClient({
      issuer: cfg.issuer,
      clientId: cfg.clientId,
      getClientSecret: async () => (cfg.secretEnc ? codec.decrypt(cfg.secretEnc) : ''),
      ...common,
    });

  const redirectUri = (name) => `${rawBase}/gateway/sso/${name}/callback`;
  const goto = (res, hash) => res.redirect(302, `/access/sso#${hash}`);
  const failTo = (res, code, user) => {
    if (user) store.addEvent({ userId: user.id, tenantId: user.tenantId, kind: 'login_failed', detail: code });
    return goto(res, `error=${encodeURIComponent(code)}`);
  };

  // ---------- inicio y regreso del proveedor ----------
  async function start(req, res) {
    const name = req.params.provider;
    if (!providers.includes(name)) return failTo(res, 'NO_PROVIDER');
    let client;
    let tenantId = null;
    let enterprise = null;
    if (name === 'enterprise') {
      const email = String(req.query.email || '')
        .trim()
        .toLowerCase();
      const owner = store.domainOwner(email.split('@')[1] || '');
      enterprise = owner ? store.getEnterprise(owner) : null;
      // Mismo error para «dominio desconocido» y «SSO apagado»: no se revela qué empresas lo tienen
      if (!enterprise || !store.getPolicy(owner).enabled) return failTo(res, 'NO_PROVIDER');
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
    res.setHeader(
      'Set-Cookie',
      `${COOKIE}=${binding}; Path=/gateway/sso; HttpOnly; SameSite=${sameSite}; Max-Age=600${secure}`
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, url);
  }

  /** Pide la sesión al gateway; devuelve `{ session }` o `{ code }`. */
  async function exchange(identity, key) {
    const out = await gateway.call('POST', '/auth/sso/exchange', {
      body: { provider: key, subject: identity.subject, email: identity.email, emailVerified: true },
    });
    if (out.status === 200 && out.json?.user?.id && out.json.accessToken) return { session: out.json };
    if (out.status === 404) return { code: 'NO_ACCOUNT' };
    if (out.status === 403) return { code: 'ACCOUNT_DISABLED' };
    return { code: 'GATEWAY_ERROR' };
  }

  async function callback(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const params = req.method === 'POST' ? req.body || {} : req.query;
    const flow = flows.take(params.state);
    const bound = flow && equal(cookieOf(req, COOKIE), flow.binding);
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/gateway/sso; HttpOnly; Max-Age=0`);
    // `:provider` de la dirección debe ser el del flujo: un código de un proveedor no se canjea en otro
    if (!flow || !bound || flow.name !== req.params.provider) return failTo(res, 'STATE_INVALID');
    if (params.error) return failTo(res, params.error === 'access_denied' ? 'DENIED' : 'PROVIDER_ERROR');
    if (typeof params.code !== 'string' || !params.code) return failTo(res, 'PROVIDER_ERROR');

    try {
      const client = flow.name === 'enterprise' ? enterpriseClient(flow.enterprise) : clientFor(flow.name);
      const identity = await client.complete({
        code: params.code,
        redirectUri: redirectUri(flow.name),
        codeVerifier: flow.codeVerifier,
        nonce: flow.nonce,
      });
      if (!identity.email) return failTo(res, 'EMAIL_MISSING');
      if (flow.tenantId) {
        // Empresa: su propio proveedor es la autoridad de sus dominios (algunos, como Azure AD, no mandan `email_verified`)
        const domain = identity.email.split('@')[1];
        if (identity.emailVerified === false) return failTo(res, 'EMAIL_NOT_VERIFIED');
        if (!flow.enterprise.domains.includes(domain)) return failTo(res, 'WRONG_DOMAIN');
      } else if (identity.emailVerified !== true) {
        return failTo(res, 'EMAIL_NOT_VERIFIED'); // nunca se vincula por un correo que el proveedor no verificó
      }
      const key = flow.tenantId ? `enterprise:${flow.tenantId}` : flow.name;
      const ex = await exchange(identity, key);
      if (!ex.session) return failTo(res, ex.code);
      const user = ex.session.user;
      if (flow.tenantId && user.tenantId !== flow.tenantId) return failTo(res, 'WRONG_TENANT', user);
      // El administrador de una empresa controla su proveedor: con él podría afirmar el correo de un super_admin de su empresa
      if (flow.tenantId && user.role === 'super_admin') return failTo(res, 'ROLE_NOT_ALLOWED', user);
      if (!store.getPolicy(user.tenantId).enabled) return failTo(res, 'SSO_DISABLED', user);
      // Una identidad ya enlazada a otra persona no se reasigna sola (el correo pudo cambiar de dueño en el proveedor)
      const linked = store.getIdentity(key, identity.subject);
      if (linked && linked.userId !== user.id) return failTo(res, 'IDENTITY_MISMATCH', user);
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
      return goto(res, `ticket=${ticket}`);
    } catch (err) {
      if (err instanceof SsoError) return failTo(res, err.code);
      if (err instanceof GatewayError) return failTo(res, 'GATEWAY_ERROR');
      console.error('[sso]', err?.message || err);
      return failTo(res, 'PROVIDER_ERROR');
    }
  }

  // ---------- rutas ----------
  const router = express.Router();
  router.get('/providers', (req, res) => res.json({ providers: providers.map((id) => ({ id, label: LABELS[id] })) }));
  router.get('/:provider/start', (req, res) =>
    start(req, res).catch((err) => {
      if (!(err instanceof SsoError)) console.error('[sso]', err?.message || err);
      failTo(res, err instanceof SsoError ? err.code : 'PROVIDER_ERROR');
    })
  );
  router.get('/:provider/callback', (req, res) => void callback(req, res));
  router.post(
    '/:provider/callback',
    express.urlencoded({ extended: false, limit: '20kb' }),
    (req, res) => void callback(req, res)
  );

  router.use(express.json({ limit: '20kb' }));
  /** Canjea el ticket del regreso por lo mismo que daría un login: sesión, reto de segundo factor o activación obligatoria. */
  router.post('/complete', (req, res) => {
    const session = tickets.take(req.body?.ticket);
    if (!session) return fail(res, 401, 'TICKET_EXPIRED', 'El inicio de sesión caducó. Inténtalo de nuevo.');
    const next = mfa?.enabled ? mfa.afterLogin(session) : null;
    return next ? res.status(next.status).json(next.json) : res.json(session);
  });

  // ---------- gestión (con sesión) ----------
  const wrap = (fn) => (req, res) =>
    fn(req, res).catch((err) => {
      if (err instanceof GatewayError) return fail(res, err.status, 'GATEWAY_ERROR', err.message);
      console.error('[sso]', err?.message || err);
      return fail(res, 500, 'SSO_ERROR', 'No se pudo completar la operación.');
    });
  const authenticate = (req, res, next) =>
    wrap(async () => {
      const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!token) return fail(res, 401, 'UNAUTHORIZED', 'Hace falta iniciar sesión.');
      const me = await gateway.call('GET', '/auth/me', { token });
      if (me.status !== 200 || !me.json?.id) return fail(res, 401, 'UNAUTHORIZED', 'La sesión no es válida.');
      req.ssoUser = me.json;
      return next();
    })(req, res);
  const adminOnly = (req, res, next) =>
    ADMIN_ROLES.includes(req.ssoUser.role)
      ? next()
      : fail(res, 403, 'FORBIDDEN', 'No tienes permiso para esta acción.');
  /** Empresa sobre la que actúa un administrador: la suya; `super_admin` puede indicar otra con `tenantId`. */
  function targetTenant(req, res) {
    const asked = req.query.tenantId || req.body?.tenantId;
    if (!asked || asked === req.ssoUser.tenantId) return req.ssoUser.tenantId;
    if (req.ssoUser.role === 'super_admin') return String(asked);
    fail(res, 403, 'FORBIDDEN', 'No puedes actuar sobre otra empresa.');
    return null;
  }
  const publicName = (provider) => (provider.startsWith('enterprise:') ? 'enterprise' : provider);

  router.use(authenticate);

  router.get('/identities', (req, res) =>
    res.json({
      identities: store.identitiesOf(req.ssoUser.id).map((i) => ({
        provider: publicName(i.provider),
        label: LABELS[publicName(i.provider)] || i.provider,
        email: i.email,
        linkedAt: i.createdAt,
        lastLoginAt: i.lastLoginAt,
      })),
    })
  );

  router.delete('/identities/:provider', (req, res) => {
    const name = req.params.provider;
    if (!KNOWN.includes(name)) return fail(res, 404, 'NOT_FOUND', 'Proveedor desconocido.');
    const key = name === 'enterprise' ? `enterprise:${req.ssoUser.tenantId}` : name;
    if (store.deleteIdentities(req.ssoUser.id, key) === 0)
      return fail(res, 404, 'NOT_FOUND', 'Esa cuenta no está vinculada.');
    store.addEvent({ userId: req.ssoUser.id, tenantId: req.ssoUser.tenantId, kind: 'identity_unlinked', detail: key });
    return res.json({ unlinked: true });
  });

  router.get('/policy', adminOnly, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (tenantId)
      res.json({ ...store.getPolicy(tenantId), providers: providers.map((id) => ({ id, label: LABELS[id] })) });
  });
  router.put('/policy', adminOnly, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (!tenantId) return;
    if (typeof req.body?.enabled !== 'boolean') return fail(res, 400, 'INVALID_POLICY', 'La política no es válida.');
    store.setPolicy({ tenantId, enabled: req.body.enabled });
    store.addEvent({ userId: req.ssoUser.id, tenantId, kind: 'policy_changed', detail: String(req.body.enabled) });
    return res.json(store.getPolicy(tenantId));
  });

  const enterpriseView = (tenantId) => {
    const e = store.getEnterprise(tenantId);
    return {
      available: providers.includes('enterprise'),
      configured: Boolean(e),
      name: e?.name ?? '',
      issuer: e?.issuer ?? '',
      clientId: e?.clientId ?? '',
      hasSecret: Boolean(e?.secretEnc), // el secreto nunca vuelve al navegador
      domains: e?.domains ?? [],
      redirectUri: redirectUri('enterprise'),
    };
  };
  const needEnterprise = (req, res, next) =>
    providers.includes('enterprise')
      ? next()
      : fail(res, 503, 'SSO_DISABLED', 'El SSO empresarial no está activado en el servidor.');

  router.get('/enterprise', adminOnly, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (tenantId) res.json(enterpriseView(tenantId));
  });
  router.put('/enterprise', adminOnly, needEnterprise, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (!tenantId) return;
    const b = req.body || {};
    const current = store.getEnterprise(tenantId);
    const name = String(b.name || '').trim();
    const issuer = String(b.issuer || '')
      .trim()
      .replace(/\/+$/, '');
    const clientId = String(b.clientId || '').trim();
    const secret = String(b.clientSecret || '');
    const domains = [
      ...new Set((Array.isArray(b.domains) ? b.domains : []).map((d) => String(d).trim().toLowerCase())),
    ];
    const invalid = (message) => fail(res, 400, 'INVALID_PROVIDER', message);
    if (!name || name.length > 80) return invalid('Escribe un nombre de hasta 80 caracteres.');
    if (!checkIssuer(issuer, allowInsecure)) return invalid('El emisor debe ser una dirección https pública.');
    if (!clientId || clientId.length > 300) return invalid('Escribe el identificador de cliente.');
    if (secret.length > 1000) return invalid('El secreto es demasiado largo.');
    if (!secret && !current?.secretEnc) return invalid('Escribe el secreto de cliente.');
    if (domains.length < 1 || domains.length > 10 || domains.some((d) => !DOMAIN.test(d))) {
      return invalid('Escribe entre 1 y 10 dominios de correo válidos, por ejemplo empresa.com.');
    }
    const taken = domains.find((d) => {
      const owner = store.domainOwner(d);
      return owner && owner !== tenantId;
    });
    if (taken) return fail(res, 409, 'DOMAIN_TAKEN', `El dominio ${taken} ya lo usa otra empresa.`);
    // Cambiar de emisor o de cliente invalida las identidades enlazadas con el anterior (otro `sub`)
    const changed = current && (current.issuer !== issuer || current.clientId !== clientId);
    store.putEnterprise({
      tenantId,
      name,
      issuer,
      clientId,
      secretEnc: secret ? codec.encrypt(secret) : current.secretEnc,
      domains,
    });
    if (changed) store.deleteProviderIdentities(tenantId, `enterprise:${tenantId}`);
    store.addEvent({ userId: req.ssoUser.id, tenantId, kind: 'enterprise_saved', detail: issuer });
    return res.json(enterpriseView(tenantId));
  });
  router.delete('/enterprise', adminOnly, (req, res) => {
    const tenantId = targetTenant(req, res);
    if (!tenantId) return;
    if (!store.getEnterprise(tenantId)) return fail(res, 404, 'NOT_FOUND', 'No hay un proveedor configurado.');
    store.deleteEnterprise(tenantId);
    store.addEvent({ userId: req.ssoUser.id, tenantId, kind: 'enterprise_deleted' });
    return res.json(enterpriseView(tenantId));
  });

  router.use((req, res) => fail(res, 404, 'NOT_FOUND', 'Not found'));
  router.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
      return fail(res, 400, 'BAD_REQUEST', 'La petición no es válida.');
    }
    console.error('[sso]', err?.message || err);
    return fail(res, 500, 'SSO_ERROR', 'No se pudo completar la operación.');
  });

  return {
    enabled: true,
    providers,
    store,
    mount(app) {
      app.use('/gateway/sso', router);
    },
  };
}

module.exports = { createSso };
