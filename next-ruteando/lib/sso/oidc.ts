/**
 * Cliente OpenID Connect (código de autorización + PKCE) para Google, Apple y el proveedor propio de cada empresa. Descubre los
 * endpoints en `/.well-known/openid-configuration`, canjea el código y valida el `id_token`: firma (JWKS), `iss`, `aud`, `exp` y `nonce`.
 * El resultado es una identidad `{ subject, email, emailVerified, name }`; decidir si el correo basta es de quien llama.
 */
import { request, SsoError, type FetchLike } from './http';
import { verifyJwt, type Jwks } from './jwt';

const LEEWAY_S = 60;
const CACHE_MS = 60 * 60 * 1000;

export interface Identity {
  subject: string;
  email: string;
  /** `null` = el proveedor no lo dice (lo decide quien llama). */
  emailVerified: boolean | null;
  name: string;
}

/** Lo común a OIDC y a GitHub: el servicio no distingue entre ellos. */
export interface SsoClient {
  usesFormPost: boolean;
  authorizationUrl(p: { redirectUri: string; state: string; nonce: string; codeChallenge: string }): Promise<string>;
  complete(p: { code: string; redirectUri: string; codeVerifier: string; nonce: string }): Promise<Identity>;
}

/**
 * Dirección de un emisor aceptable: https, sin IP literal ni `localhost` (un administrador de empresa escribe el emisor y el servidor
 * lo consulta: sin este filtro sería un SSRF hacia la red interna). `allowInsecure` solo lo usan las pruebas y el desarrollo.
 * El nombre se resuelve y se filtra la IP en cada conexión (`safe-fetch.ts`); aquí solo se descarta lo evidente antes de llegar a conectar.
 */
export function checkIssuer(issuer: unknown, allowInsecure: boolean): boolean {
  let url: URL;
  try {
    url = new URL(String(issuer));
  } catch {
    return false;
  }
  if (allowInsecure) return url.protocol === 'https:' || url.protocol === 'http:';
  const host = url.hostname;
  const literalIp = /^[\d.]+$/.test(host) || host.includes(':');
  return (
    url.protocol === 'https:' && !literalIp && host !== 'localhost' && !host.endsWith('.localhost') && !host.endsWith('.internal')
  );
}

interface Discovery {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  token_endpoint_auth_methods_supported?: string[];
}

export function createOidcClient({
  issuer,
  clientId,
  getClientSecret,
  scopes = ['openid', 'email', 'profile'],
  extraParams = {},
  fetchImpl = fetch as unknown as FetchLike,
  now = Date.now,
  allowInsecure = false,
}: {
  issuer: string;
  clientId: string;
  getClientSecret: () => Promise<string>;
  scopes?: string[];
  extraParams?: Record<string, string>;
  fetchImpl?: FetchLike;
  now?: () => number;
  allowInsecure?: boolean;
}): SsoClient {
  const base = String(issuer).replace(/\/+$/, '');
  if (!checkIssuer(base, allowInsecure)) throw new SsoError('PROVIDER_CONFIG', 'Emisor no válido');
  let cached: { doc: Discovery; expiresAt: number; jwks?: Jwks; jwksAt?: number } | null = null;

  async function metadata(): Promise<Discovery> {
    if (cached && cached.expiresAt > now()) return cached.doc;
    const res = await request(fetchImpl, `${base}/.well-known/openid-configuration`);
    const doc = res.json as Discovery | null;
    // El documento debe declarar el mismo emisor que se configuró (OIDC Discovery §4.3)
    if (res.status !== 200 || !doc || String(doc.issuer || '').replace(/\/+$/, '') !== base) {
      throw new SsoError('PROVIDER_ERROR', 'Descubrimiento no válido');
    }
    for (const key of ['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as const) {
      if (!checkIssuer(doc[key], allowInsecure)) throw new SsoError('PROVIDER_ERROR', 'Endpoint no válido');
    }
    cached = { doc, expiresAt: now() + CACHE_MS };
    return doc;
  }

  async function jwks(doc: Discovery, force: boolean): Promise<Jwks> {
    if (!force && cached?.jwks && (cached.jwksAt ?? 0) > now()) return cached.jwks;
    const res = await request(fetchImpl, doc.jwks_uri);
    if (res.status !== 200 || !Array.isArray(res.json?.keys)) throw new SsoError('PROVIDER_ERROR', 'JWKS no válido');
    cached!.jwks = res.json as Jwks;
    cached!.jwksAt = now() + CACHE_MS;
    return res.json as Jwks;
  }

  return {
    usesFormPost: extraParams.response_mode === 'form_post',

    async authorizationUrl({ redirectUri, state, nonce, codeChallenge }) {
      const doc = await metadata();
      const url = new URL(doc.authorization_endpoint);
      const params: Record<string, string> = {
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        ...extraParams,
      };
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      return url.toString();
    },

    async complete({ code, redirectUri, codeVerifier, nonce }) {
      const doc = await metadata();
      const form: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      };
      const headers: Record<string, string> = {};
      const secret = await getClientSecret();
      const methods = doc.token_endpoint_auth_methods_supported;
      if (secret && Array.isArray(methods) && !methods.includes('client_secret_post') && methods.includes('client_secret_basic')) {
        headers.Authorization = `Basic ${Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(secret)}`).toString('base64')}`;
      } else if (secret) {
        form.client_secret = secret;
      }
      const tokens = await request(fetchImpl, doc.token_endpoint, { method: 'POST', form, headers });
      if (tokens.status !== 200 || typeof tokens.json?.id_token !== 'string') {
        throw new SsoError('PROVIDER_ERROR', `El proveedor rechazó el código (${tokens.status})`);
      }
      let verified;
      try {
        // Si la clave rotó, el JWKS en caché no la tiene: se vuelve a pedir una vez
        try {
          verified = verifyJwt(tokens.json.id_token, await jwks(doc, false));
        } catch {
          verified = verifyJwt(tokens.json.id_token, await jwks(doc, true));
        }
      } catch {
        throw new SsoError('INVALID_TOKEN', 'Firma del id_token no válida');
      }
      const claims = verified.payload;
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      const t = Math.floor(now() / 1000);
      const valid =
        String(claims.iss || '').replace(/\/+$/, '') === base &&
        audiences.includes(clientId) &&
        (audiences.length === 1 || claims.azp === clientId) &&
        Number(claims.exp) + LEEWAY_S > t &&
        (claims.nbf === undefined || Number(claims.nbf) - LEEWAY_S <= t) &&
        claims.nonce === nonce &&
        typeof claims.sub === 'string' &&
        claims.sub !== '';
      if (!valid) throw new SsoError('INVALID_TOKEN', 'Reclamaciones del id_token no válidas');
      const flag = claims.email_verified;
      return {
        subject: claims.sub as string,
        email: typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '',
        // Apple manda "true" como texto; ausente = el proveedor no lo dice (lo decide quien llama)
        emailVerified: flag === true || flag === 'true' ? true : flag === undefined ? null : false,
        name: typeof claims.name === 'string' ? claims.name : '',
      };
    },
  };
}
