# Proposal

## Why

El servidor Express publica la aplicación y reenvía `/gateway/**` sin ninguna cabecera de seguridad: no hay `Content-Security-Policy`, ni `X-Content-Type-Options`, ni `Referrer-Policy`, ni protección contra incrustación en `iframe` (estudio de seguridad S2, 2026-10-28). Además `TokenStorageService` guarda el refresh token en `localStorage` (S3): un único script inyectado (XSS) podría leerlo y mantener la sesión abierta durante días. Una CSP estricta de scripts es la defensa que hace aceptable esa decisión mientras no se cambie a una cookie `HttpOnly`.

La compilación actual lo permite: no contiene ningún `<script>` en línea y solo carga código de su propio origen. Los recursos externos son pocos y conocidos (fuentes de Google y teselas de OpenStreetMap).

## What Changes

- El servidor añade a **todas** las respuestas, antes del proxy y del estático, estas cabeceras: `Content-Security-Policy` (en modo solo informe por defecto), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (sin cámara, micrófono ni geolocalización), `Cross-Origin-Opener-Policy: same-origin`, y `Strict-Transport-Security` solo cuando la petición llegó por HTTPS (`X-Forwarded-Proto`). Se desactiva `X-Powered-By`.
- La política: `default-src 'self'`; `script-src 'self'`; `style-src 'self' 'unsafe-inline'` más Google Fonts; `font-src 'self'` más Google Fonts; `img-src 'self' data: blob:` más el servidor de teselas; `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`.
- El modo se controla con `CSP_MODE` (`report-only` por defecto, `enforce` o `off`) y los orígenes extra de imágenes con `CSP_IMG_SRC` (el proveedor de teselas se cambia en `environment*.ts`, y la política debe poder seguirlo sin tocar código).
- Se verifica la política en un navegador real **a través del servidor** (no solo con pruebas unitarias): sin violaciones en acceso, inicio, listados, mapa y editor de zonas. Pasar a `enforce` es una decisión aparte, con OK explícito, tras esa verificación.
- La compilación de producción desactiva `optimization.styles.inlineCritical` en `angular.json`: la carga diferida de estilos críticos añade un `onload` que una CSP en bloqueo impide (verificado: sin él, sin violaciones y sin diferencias visuales).
- Fuera de alcance: autohospedar las fuentes (S7, change aparte: permitiría quitar Google de la política), `style-src` sin `'unsafe-inline'` (Angular Material añade estilos en línea en tiempo de ejecución; exigiría nonces), cambiar el refresh token a cookie `HttpOnly` (S3, decisión pendiente), lista blanca del proxy (S4) y límite de intentos (S5).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities
- `frontend-serving`: el servidor responde con las cabeceras de seguridad y la CSP configurable.

## Impact

- `ng-ruteando/angular.json` (configuración de producción), `server/security-headers.js` (nuevo) y `server/server.js` (registro del middleware antes del proxy), `server/test/security-headers.test.js` (nuevo), `.env.example` y `README.md` (variables `CSP_MODE` y `CSP_IMG_SRC`), `CLAUDE.md` (una línea).
- Sin dependencias nuevas (no se usa `helmet`: son pocas cabeceras y la política es propia).
- Riesgo: una CSP en `enforce` mal calibrada rompe la aplicación (mapa, fuentes). Por eso arranca en solo informe, que no bloquea nada, y la verificación en navegador es una tarea del change.
