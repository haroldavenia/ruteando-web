/**
 * Proveedor OpenID Connect SIMULADO para probar el SSO sin cuentas reales (change add-sso). Descubrimiento, JWKS (RSA, RS256),
 * autorización con PKCE y canje del código. Lo usan las pruebas del servidor (`startMockIdp`) y, desde la terminal, el desarrollo:
 *
 *   node scripts/mock-oidc-provider.cjs            (puerto MOCK_IDP_PORT, 4030)
 *   SSO_ENABLED_PROVIDERS=google SSO_ALLOW_INSECURE=true SSO_GOOGLE_ISSUER=http://127.0.0.1:4030 \
 *   SSO_GOOGLE_CLIENT_ID=mock SSO_GOOGLE_CLIENT_SECRET=mock SSO_REDIRECT_BASE_URL=http://localhost:4200 pnpm start
 *
 * Sin `identity` preparada, /authorize muestra un formulario donde se escribe el correo con el que «entra» la persona. Es solo
 * desarrollo: no valida a nadie ni guarda nada, y no debe exponerse fuera de la máquina.
 */
const crypto = require('node:crypto');
const http = require('node:http');

const html = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function startMockIdp({ port = 0, clientId = 'mock', clientSecret = 'mock', now = Date.now } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'mock-1', use: 'sig', alg: 'RS256' };
  const codes = new Map();
  let origin = '';

  const idp = {
    /** Identidad con la que se entra sin pedir nada (pruebas); `null` = mostrar el formulario. */
    identity: null,
    /** Cambios a los reclamos del id_token (pruebas de validación): `{ aud: 'otro' }`, `{ nonce: 'x' }`… */
    claims: {},
    /** Firma el id_token con una clave que no es la publicada (prueba de firma falsa). */
    wrongKey: false,
    tokenRequests: [],
    issuer: '',
    close: () => server.close(),
  };

  function sign(payload) {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const signed = `${enc({ alg: 'RS256', typ: 'JWT', kid: 'mock-1' })}.${enc(payload)}`;
    const key = idp.wrongKey ? crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey : privateKey;
    return `${signed}.${crypto.sign('sha256', Buffer.from(signed), key).toString('base64url')}`;
  }

  function finishAuthorize(res, q, identity) {
    const code = crypto.randomBytes(16).toString('base64url');
    codes.set(code, { q, identity });
    const target = new URL(q.redirect_uri);
    target.searchParams.set('code', code);
    target.searchParams.set('state', q.state);
    if (q.response_mode === 'form_post') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        `<form method="post" action="${html(q.redirect_uri)}"><input name="code" value="${code}"><input name="state" value="${html(q.state)}"></form><script>document.forms[0].submit()</script>`
      );
      return;
    }
    res.writeHead(302, { Location: target.toString() });
    res.end();
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, origin || 'http://127.0.0.1');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (url.pathname === '/.well-known/openid-configuration') {
        return json(200, {
          issuer: origin,
          authorization_endpoint: `${origin}/authorize`,
          token_endpoint: `${origin}/token`,
          jwks_uri: `${origin}/jwks`,
          token_endpoint_auth_methods_supported: ['client_secret_post'],
        });
      }
      if (url.pathname === '/jwks') return json(200, { keys: [jwk] });
      if (url.pathname === '/authorize') {
        const q = Object.fromEntries(req.method === 'POST' ? new URLSearchParams(raw) : url.searchParams);
        if (req.method === 'GET' && !idp.identity) {
          const fields = Object.entries(q)
            .map(([k, v]) => `<input type="hidden" name="${html(k)}" value="${html(v)}">`)
            .join('');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(
            `<!doctype html><meta charset="utf-8"><title>Proveedor simulado</title><body style="font:16px sans-serif;max-width:24rem;margin:4rem auto">` +
              `<h1>Proveedor SSO simulado</h1><p>Solo desarrollo: escribe el correo con el que entras.</p>` +
              `<form method="post" action="/authorize">${fields}<input name="email" type="email" required autofocus style="width:100%;padding:.5rem"><button style="margin-top:1rem;padding:.5rem 1rem">Continuar</button></form>`
          );
        }
        const identity = idp.identity || { email: q.email, sub: `mock-${q.email}`, email_verified: true };
        return finishAuthorize(res, q, identity);
      }
      if (url.pathname === '/token' && req.method === 'POST') {
        const f = Object.fromEntries(new URLSearchParams(raw));
        idp.tokenRequests.push(f);
        const entry = codes.get(f.code);
        codes.delete(f.code);
        const challenge =
          entry &&
          crypto
            .createHash('sha256')
            .update(f.code_verifier || '')
            .digest('base64url');
        if (
          !entry ||
          f.client_id !== clientId ||
          (clientSecret !== null && f.client_secret !== clientSecret) || // null: acepta cualquiera (secreto firmado de Apple)
          challenge !== entry.q.code_challenge ||
          f.redirect_uri !== entry.q.redirect_uri
        ) {
          return json(400, { error: 'invalid_grant' });
        }
        const t = Math.floor(now() / 1000);
        const { email, sub, email_verified, name } = entry.identity;
        return json(200, {
          token_type: 'Bearer',
          access_token: 'mock-access',
          id_token: sign({
            iss: origin,
            aud: clientId,
            sub,
            email,
            ...(email_verified === undefined ? {} : { email_verified }),
            name,
            iat: t,
            exp: t + 300,
            nonce: entry.q.nonce,
            ...idp.claims,
          }),
        });
      }
      return json(404, { error: 'not_found' });
    });
  });

  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => {
      origin = `http://127.0.0.1:${server.address().port}`;
      idp.issuer = origin;
      resolve(idp);
    })
  );
}

module.exports = { startMockIdp };

if (require.main === module) {
  startMockIdp({ port: Number(process.env.MOCK_IDP_PORT) || 4030 }).then((idp) =>
    console.log(`Proveedor OIDC simulado en ${idp.issuer} (client_id y client_secret: «mock»)`)
  );
}
