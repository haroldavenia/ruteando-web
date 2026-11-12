## Contexto

La sesión es del HanoIT Gateway (`POST /auth/login` con correo y contraseña devuelve `accessToken` y `refreshToken`); el servidor propio no autentica, solo retiene los tokens mientras se supera el segundo factor (`server/mfa/`). No hay endpoint conocido de SSO, OIDC o intercambio de token en el gateway. «Acceso social» figuraba como fuera de alcance en `gateway-api.md`.

## Decisiones

**Métodos (elegidos por la persona el 2026-11-12):** Google, GitHub, Apple y SSO empresarial (OIDC por empresa). Todos configurables, ninguno por defecto.

**Cómo se obtiene la sesión: intercambio de identidad en el gateway.** El servidor identifica a la persona con el proveedor y pide la sesión al gateway:

```
POST /api/v1/auth/sso/exchange        (cabecera X-Api-Key, de servidor a servidor)
{ "provider": "google" | "github" | "apple" | "enterprise:<tenantId>",
  "subject": "<sub del proveedor>", "email": "<correo verificado>", "emailVerified": true }

200  la misma sesión que POST /auth/login  { accessToken, refreshToken, expiresIn, user }
404  no existe una persona con ese correo   (NUNCA se crea la cuenta)
403  la cuenta está desactivada
400  faltan campos o emailVerified no es true
```

**El intercambio es solo de servidor.** El proxy `/gateway` añade la clave de API a todo lo que reenvía, así que sin protección cualquiera podría pedir una sesión con un correo: `server/gateway-proxy.js` y `proxy.conf.js` responden 404 a `/auth/sso/**` (normalizando mayúsculas, codificaciones, barras y `..`). El gateway real debería además exigir una credencial distinta de la clave de API que usa el proxy (o restringir el origen), y así no depender de este filtro.

Se descartó la contraseña técnica por persona (frágil y un riesgo de seguridad) y que el gateway valide el `id_token` (equivale a la anterior en cambios del gateway y duplica la validación). Está implementado en `scripts/mock-gateway.mjs`; **hay que pedirlo al equipo del gateway real**: sin él, un `404` genérico se mostraría como «No hay una cuenta con ese correo».

**Entrega de la sesión: ticket de un solo uso.** El regreso del proveedor es una navegación del navegador, así que no puede llevar tokens. El servidor guarda la sesión del gateway en memoria (como los retos del 2FA), redirige a `/access/sso#ticket=…` (el fragmento no viaja en peticiones ni en `Referer`) y el cliente lo canjea en `POST /gateway/sso/complete`, que responde exactamente lo que respondería el login: sesión, `mfaRequired` o `mfaEnrollRequired`. **El SSO no sustituye al segundo factor.**

**Vinculación.** El proveedor debe entregar el correo **verificado** (`email_verified`, o `primary` y `verified` en GitHub); si no, no hay inicio de sesión. La identidad `(proveedor, sub)` se enlaza a la persona la primera vez; después, si llegara con el correo de otra persona (el correo cambió de dueño en el proveedor), se rechaza (`IDENTITY_MISMATCH`). Desvincular es solo con sesión.

**Política por empresa.** Permitido por defecto, con interruptor por empresa en `/security`. Se comprueba al terminar, cuando ya se conoce la empresa de la persona. No se ofrece «obligatorio» (riesgo de bloqueo si el proveedor cae); queda para un cambio posterior.

**SSO empresarial.** Una configuración por empresa (emisor, cliente, secreto cifrado con AES-256-GCM, dominios). El dominio del correo escrito en el acceso elige la empresa; los dominios son únicos entre empresas. Salvaguardas: el correo del proveedor debe estar en los dominios de la empresa, la persona devuelta por el gateway debe ser de esa empresa, y el emisor debe ser `https` público y toda llamada saliente solo conecta a direcciones públicas (contra SSRF). Algunos proveedores (Azure AD) no envían `email_verified`: en el empresarial se acepta su ausencia (no un `false`) porque el dominio y la empresa ya acotan lo que puede afirmar.

**Seguridad del flujo.** `state` y `nonce` aleatorios de un solo uso; PKCE S256; cookie `HttpOnly` que liga el regreso al navegador que empezó (contra el *login CSRF*; `SameSite=Lax`, o `None; Secure` con `form_post` de Apple); el `:proveedor` de la dirección de regreso debe ser el del flujo; el `id_token` solo admite RS256 y ES256 y se valida contra el JWKS (`iss`, `aud`/`azp`, `exp`, `nbf`, `nonce`); las llamadas salientes tienen límite de tiempo y de tamaño y no siguen redirecciones; los flujos y tickets en memoria tienen caducidad y tope.

**Almacén y despliegue.** `node:sqlite` aparte (`SSO_DB_PATH`) con el mismo patrón de migraciones. Una sola instancia (flujos y tickets en memoria). En Render Free la base se pierde al dormir: las identidades se vuelven a enlazar solas, pero el proveedor de cada empresa se debe volver a registrar; con disco persistente no ocurre.

**CSP y PWA.** El regreso es una navegación (no `fetch`), así que `connect-src` no cambia; el service worker ya excluye `/gateway/**` de sus navegaciones.

## Riesgos y lo que falta verificar

- El gateway real no ofrece el intercambio: hasta entonces solo funciona con el simulado.
- Los tres proveedores externos (Google, GitHub, Apple) y un proveedor de empresa real no se han probado: las pruebas usan un proveedor OIDC simulado y `fetch` simulado.
- Las llamadas salientes (descubrimiento, JWKS, canje del código) resuelven el nombre y conectan solo a direcciones públicas (`safe-fetch.js`, la comprobación va en el `lookup` de la conexión: sin *DNS rebinding*); solo se relaja con `SSO_ALLOW_INSECURE`.
- El dominio de una empresa no se prueba (p. ej. con un registro DNS): quien administra una empresa puede afirmar, con su proveedor, el correo de cualquier persona de su empresa. Un `super_admin` no puede entrar por el SSO de una empresa (`ROLE_NOT_ALLOWED`); lo demás equivale a lo que ya puede hacer un administrador.
- «Cerrar sesión» no cierra la sesión del proveedor.
