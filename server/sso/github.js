/**
 * GitHub (OAuth 2.0, no OIDC): no hay `id_token`, así que el correo verificado se lee de la API (`/user/emails`, el principal y
 * verificado). El `subject` es el id numérico del usuario (el login puede cambiar; el id no).
 */
const { request, SsoError } = require('./http');

const AUTHORIZE = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';
const API = 'https://api.github.com';

function createGithubClient({ clientId, clientSecret, fetchImpl = fetch, urls = {} }) {
  const u = { authorize: AUTHORIZE, token: TOKEN, api: API, ...urls };
  return {
    usesFormPost: false,

    async authorizationUrl({ redirectUri, state, codeChallenge }) {
      const url = new URL(u.authorize);
      const params = {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      };
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      return url.toString();
    },

    async complete({ code, redirectUri, codeVerifier }) {
      const tokens = await request(fetchImpl, u.token, {
        method: 'POST',
        form: {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        },
      });
      const accessToken = tokens.json?.access_token;
      // GitHub responde 200 con `error` en el cuerpo cuando el código no vale
      if (tokens.status !== 200 || typeof accessToken !== 'string') {
        throw new SsoError('PROVIDER_ERROR', 'GitHub rechazó el código');
      }
      const headers = { Authorization: `Bearer ${accessToken}`, 'X-GitHub-Api-Version': '2022-11-28' };
      const [user, emails] = await Promise.all([
        request(fetchImpl, `${u.api}/user`, { headers }),
        request(fetchImpl, `${u.api}/user/emails`, { headers }),
      ]);
      if (user.status !== 200 || user.json?.id === undefined || emails.status !== 200 || !Array.isArray(emails.json)) {
        throw new SsoError('PROVIDER_ERROR', 'GitHub no entregó el perfil');
      }
      const primary = emails.json.find((e) => e.primary && e.verified);
      return {
        subject: String(user.json.id),
        email: primary ? String(primary.email).trim().toLowerCase() : '',
        emailVerified: Boolean(primary),
        name: typeof user.json.name === 'string' ? user.json.name : '',
      };
    },
  };
}

module.exports = { createGithubClient };
