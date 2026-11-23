## Why

El acceso solo admite correo y contraseña. Las personas piden entrar con su cuenta de Google, GitHub o Apple, y las empresas con su propio proveedor de identidad (SSO empresarial). El obstáculo central es que **la sesión es del HanoIT Gateway y solo se obtiene con correo y contraseña**: el servidor propio no autentica y el gateway no ofrece hoy ningún intercambio de identidad. Hace falta un SSO que se imponga en el servidor, que no cree cuentas ni vincule por correos sin verificar y que siga pasando por el segundo factor (`add-mfa`).

## What Changes

- Nuevo módulo de servidor `server/sso/` (mismo patrón que `server/mfa/`: `createSso(env)` + `mount(app)`, apagado sin sus variables): flujo de código de autorización con **PKCE**, `state` y `nonce`, ligado al navegador con una cookie `HttpOnly`; validación del `id_token` (firma RS256/ES256 contra el JWKS, `iss`, `aud`, `exp`, `nonce`) y del correo verificado.
- Proveedores configurables, ninguno activo por defecto (`SSO_ENABLED_PROVIDERS`): **Google** y **Apple** (OIDC), **GitHub** (OAuth 2.0, correo verificado desde su API) y **SSO empresarial** (OIDC propio de cada empresa, con emisor, cliente, secreto cifrado con `MFA_SECRET_KEY` y dominios de correo).
- La sesión del gateway se pide con un **intercambio de identidad** (`POST /auth/sso/exchange`, contrato propuesto en `design.md`; ya implementado en el gateway simulado). Hasta que el gateway real lo ofrezca, el SSO solo funciona con el simulado.
- La sesión se entrega por el mismo canal que el login: un **ticket de un solo uso** (5 min) que el cliente canjea en `POST /gateway/sso/complete`, y que pasa por el segundo factor si la persona o su empresa lo exigen (el SSO no lo sustituye).
- Política por empresa: el administrador permite o apaga el SSO en **Seguridad** y registra el proveedor OIDC de su empresa; cada persona ve y desvincula sus **cuentas vinculadas** en **Perfil**.
- Pantalla de acceso: botones «Continuar con …» solo para los proveedores que el servidor ofrece, y pantalla de regreso `/access/sso`.
- Almacén propio `node:sqlite` (`SSO_DB_PATH`, por defecto `data/sso.sqlite`): identidades enlazadas, política, proveedor de cada empresa y eventos.
- Se extrae `afterLogin(session)` de `server/mfa/` para que login y SSO compartan el segundo paso.
- Proveedor OIDC simulado para pruebas y desarrollo (`scripts/mock-oidc-provider.cjs`).

No se toca: el registro, la contraseña olvidada ni el 2FA (salvo la extracción de `afterLogin`). No hay dependencias nuevas (todo con `node:crypto` y `fetch`).

## Capabilities

### New Capabilities
- `single-sign-on`: flujo de autorización, validación de identidad, vinculación, política por empresa, proveedor propio de cada empresa y entrega de la sesión.

### Modified Capabilities
Ninguna formal: el inicio de sesión (`auth-session`) y el proxy (`gateway-proxy`) se amplían con el regreso de un proveedor (`/access/sso`) y con `/gateway/sso/**`, y eso queda descrito en `single-sign-on`.

## Impact

- Servidor: `server/sso/**`, `server/server.js`, `server/mfa/index.js`, pruebas en `server/test/sso-flow.test.js`.
- Frontend: `features/access/sso/`, `shared/sso/`, `features/security/sso-settings.component.ts`, `core/api/data/sso.api.ts`, ruta `/access/sso`.
- Configuración: variables `SSO_*` (`.env.example`, README), `SSO_REDIRECT_BASE_URL` registrada en cada proveedor.
- Despliegue: la base de identidades necesita disco persistente (en Render Free se pierde al dormir; las personas se vuelven a vincular solas al entrar, el SSO de empresa hay que volver a registrarlo).
- Dependencia externa: el endpoint de intercambio del gateway real.
