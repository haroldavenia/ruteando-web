# ACC-001: Inicio de sesión, sesión JWT, renovación y cierre

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f1-acceso` |
| Clave anterior | F1-01 · `AUTH-SESSION` |
| Depende de | FND-002, FND-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-auth-session` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Maqueta | `docs/ui/maquetas/index.html#acc-001` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Sustituir OAuth password/refresh con Basic `HANOIT-APP:123456` por login JSON con JWT, renovación transparente y cierre de sesión que revoca el refresh token.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Login con `POST /oauth/token grant_type=password` y Basic auth | `authHttp.js; login_controller.js` | Cambia: `POST /auth/login {email,password}` |
| L2 | Guarda `access_token`/`refresh_token` en localStorage | `tokenStorage.js` | Cambia: access en memoria; refresh + expiresAt en localStorage (claves compatibles) |
| L3 | Cada listado envuelve sus cargas en `resincTknRefresh(ok, fail)` | `resincTknRefresh.js y 12 controladores` | Cambia: renovación en interceptor; controladores sin envoltorio |
| L4 | `app.home/:tknrefresh` dispara refresh desde main.js | `modules/controllers/main.js; config.js:81` | Se retira: estado `app.home` sin parámetro |
| L5 | Interceptor redirige a login si `error: invalid_token` | `authResponseInterceptor.js` | Cambia: 401 → refresh único → reintento → login con returnTo |
| L6 | Logout borra token local y va a `access.login` | `logout_controller.js` | Cambia: además `POST /auth/logout {refreshToken}` |
| L7 | Mensajes de error OAuth (`error_description`) | `login_controller.js` | Cambia: códigos INVALID_CREDENTIALS, ACCOUNT_DISABLED, EMAIL_NOT_VERIFIED, ACCOUNT_LOCKED, RATE_LIMIT_EXCEEDED |
| L8 | Dos vistas de login (login.html, login2.html con el mismo estado) | `modules/config.js:32-43` | Cambia: una sola vista `login` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | `{email,password}` (email trim+minúsculas) | 200 `{accessToken,refreshToken,expiresIn,user{id,email,firstName,lastName,phone,role,tenantId,emailVerified,phoneVerified,createdAt}}` | 400 VALIDATION_ERROR/EMAIL_NOT_VERIFIED, 401 INVALID_CREDENTIALS/ACCOUNT_DISABLED, 423 ACCOUNT_LOCKED (`details.lockedUntil`), 429 (5/15 min IP+email) | `post__auth__login.json` |
| POST | `/api/v1/auth/refresh` | `{refreshToken}` | 200 `LoginResponse` con **refresh nuevo**; el usado queda revocado | 401 JSON `INVALID_TOKEN` (inexistente, revocado o ya rotado) / `TOKEN_EXPIRED` (caducado) | `post__auth__refresh.json` |
| POST | `/api/v1/auth/logout` | `{refreshToken}` | 200 `{message:'Logout exitoso'}` | — | `post__auth__logout.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como usuario del panel, quiero iniciar sesión y mantenerla viva de forma segura, para trabajar sin cortes y sin exponer credenciales del cliente.

## 3. Alcance

**Incluye**

- Pantalla de login, interceptor Bearer + renovación única ante 401 con reintento, renovación anticipada, restauración de sesión al recargar, logout, manejo de 401/400/423/429, retirada de `resincTknRefresh` y `app.home/:tknrefresh`, retirada de client_id/secret.

**Excluye (no tocar)**

- Registro, recuperación, perfil (ACC-002…ACC-004); roles y menú (ACC-005).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/login.jade`
- `master/jade/views/pages/login2.jade`
- `master/js/custom/access/login_controller.js`
- `master/js/custom/access/logout_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/authHttp.js`
- `master/js/modules/services/authRequestInterceptor.js`
- `master/js/modules/services/authResponseInterceptor.js`
- `master/js/modules/services/auth_interceptor.js`
- `master/js/modules/services/auth_session.js`
- `master/js/modules/services/constant.js`
- `master/js/modules/services/login_controller.js`
- `master/js/modules/services/logout_controller.js`
- `master/js/modules/services/main.js`
- `master/js/modules/services/resincTknRefresh.js`
- `master/js/modules/services/tokenManager.js`
- `master/js/modules/services/tokenStorage.js`
- `server/sidebar-menu.json`
- `tests/api/auth-session.api.test.mjs`
- `tests/e2e/auth-session.e2e.mjs`
- `tests/integration/auth-session/**`
- `tests/unit/auth-session/**`
- `specs/migracion-api-v1/f1-acceso/evidencia/ACC-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Iniciar sesión con correo y contraseña y guardar la sesión
- **RF-2** — Adjuntar `Authorization: Bearer` a toda petición `/api/v1` salvo las públicas
- **RF-3** — Ante 401 de una petición autenticada, renovar el token una sola vez aunque haya varias peticiones concurrentes, y reintentarlas una vez
- **RF-4** — Renovar anticipadamente si quedan menos de 60 s de vida al hacer una petición
- **RF-5** — Restaurar la sesión al recargar la página usando el refresh token
- **RF-6** — Cerrar sesión revocando el refresh token en el backend y limpiando el estado local, aunque el backend falle
- **RF-7** — Expirar la sesión si la renovación falla, llevando a login y volviendo al estado previo tras autenticarse
- **RF-8** — Mostrar mensajes específicos por código de error de login, incluido bloqueo con hora y límite con cuenta atrás
- **RF-9** — Eliminar del front `client_id`, `client_secret`, Basic auth y `resincTknRefresh`
- **RF-10** — Explicar el cierre por sesión iniciada en otro dispositivo (una sola sesión de refresh por usuario)

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado credenciales válidas, Cuando envío el login, Entonces se llama `POST /api/v1/auth/login` con `{email,password}`, se guarda la sesión y navega a `app.home`
- **CA-2** (RF-2) — Dado una sesión, Cuando pido `GET /api/v1/places`, Entonces lleva `Authorization: Bearer <accessToken>`; `POST /auth/login` no lo lleva
- **CA-3** (RF-3) — Dado 3 peticiones que reciben 401 a la vez, Cuando el interceptor actúa, Entonces hay exactamente 1 `POST /auth/refresh` (single-flight), se guarda el refresh NUEVO y las 3 se reintentan con el token nuevo
- **CA-4** (RF-3) — Dado una petición reintentada que vuelve a dar 401, Cuando el interceptor actúa, Entonces no reintenta de nuevo y expira la sesión
- **CA-5** (RF-4) — Dado `expiresAt` en 30 s, Cuando hago una petición, Entonces primero se renueva (jasmine.clock)
- **CA-6** (RF-5) — Dado una sesión iniciada, Cuando recargo `#/app/places/list`, Entonces sigo en esa pantalla sin pasar por login
- **CA-7** (RF-6) — Dado un refresh que responde 401 `INVALID_TOKEN` o `TOKEN_EXPIRED`, Cuando navego a vehículos, Entonces llego a login y tras autenticarme vuelvo a `app.vehicles.list`
- **CA-8** (RF-7) — Dado un refresh que responde 401, Cuando navego a vehículos, Entonces llego a login y tras autenticarme vuelvo a `app.vehicles.list`
- **CA-9** (RF-8) — Dado 401 `INVALID_CREDENTIALS`, Entonces el mensaje es «Correo o contraseña incorrectos» sin indicar cuál
- **CA-10** (RF-8) — Dado 423 con `details.lockedUntil`, Entonces el mensaje muestra la hora local de desbloqueo y deshabilita el botón
- **CA-11** (RF-8) — Dado 429 con `Retry-After: 875`, Entonces el botón queda deshabilitado con cuenta atrás de 875 s
- **CA-12** (RF-8) — Dado 400 `EMAIL_NOT_VERIFIED`, Entonces se ofrece «Reenviar verificación» (enlaza ACC-002)
- **CA-13** (RF-8) — Dado 401 `ACCOUNT_DISABLED`, Entonces mensaje de cuenta o empresa desactivada
- **CA-14** (RF-9) — Dado el build, Cuando `legacy-scan`, Entonces no hay `oauth/token`, `client_secret`, `CLIENT_SECRECT`, `resincTknRefresh` ni `Basic SEFOT0lU`
- **CA-15** (RF-1) — Dado credenciales de prueba en `.env`, Cuando la sonda hace login, refresh y logout, Entonces las formas coinciden con los fixtures y el refresh posterior al logout da 401
- **CA-16** (RF-1) — Dado un login correcto, Entonces el shell usa el `user` de la respuesta (nombre, rol, tenant) sin hacer `GET /auth/me`; el access token no se escribe en `localStorage`
- **CA-17** (RF-10) — Dado un refresh que da 401 `INVALID_TOKEN` tras haber funcionado antes en esta pestaña, Entonces el aviso de login dice «Tu sesión se cerró porque se inició en otro dispositivo o expiró»
- **CA-18** (RF-5) — Dado dos pestañas abiertas, Cuando una renueva, Entonces la otra toma el refresh nuevo de `localStorage` (evento `storage`) antes de intentar su propia renovación

## 6. Diseño y restricciones técnicas

Crear `master/js/modules/services/auth_session.js` (login/logout/restore/refresh), `auth_interceptor.js`. Modificar `tokenStorage.js`, `login_controller.js`, `logout_controller.js`, `main.js`, `modules/config.js` (estados), `login.jade`. Eliminar `authHttp.js` (parte OAuth), `resincTknRefresh.js`, `tokenManager.js` si queda sin uso, `login2.jade`, envoltorios `resincTknRefresh` en controladores (los toca cada spec de módulo, pero aquí se deja un adaptador compatible que solo ejecuta el callback, eliminado en CIE-001). Constantes de cliente en `constant.js`.

**Pantallas y flujos.** Login → (éxito) home o `returnTo` · (401/423/429/400) mensaje en el formulario. Sesión caducada en cualquier pantalla → login con aviso «Tu sesión ha caducado» → vuelve al estado previo. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `access.login` | `pages/login.jade` | público | Una sola vista; campos email/contraseña con etiquetas accesibles; mensajes por código |
| `app.home` | `home.jade` | autenticado | Sin parámetro `:tknrefresh` |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[ACC-001 CA-1]` en `tests/unit/auth-session/` |
| T-2 | CA-1 | contrato | Prueba `[ACC-001 CA-1]` en `tests/integration/auth-session/` |
| T-3 | CA-1 | e2e | Prueba `[ACC-001 CA-1]` en `tests/e2e/auth-session.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[ACC-001 CA-2]` en `tests/unit/auth-session/` |
| T-5 | CA-3 | unitaria | Prueba `[ACC-001 CA-3]` en `tests/unit/auth-session/` |
| T-6 | CA-4 | unitaria | Prueba `[ACC-001 CA-4]` en `tests/unit/auth-session/` |
| T-7 | CA-5 | unitaria | Prueba `[ACC-001 CA-5]` en `tests/unit/auth-session/` |
| T-8 | CA-6 | e2e | Prueba `[ACC-001 CA-6]` en `tests/e2e/auth-session.e2e.mjs` |
| T-9 | CA-7 | unitaria | Prueba `[ACC-001 CA-7]` en `tests/unit/auth-session/` |
| T-10 | CA-7 | e2e | Prueba `[ACC-001 CA-7]` en `tests/e2e/auth-session.e2e.mjs` |
| T-11 | CA-8 | e2e | Prueba `[ACC-001 CA-8]` en `tests/e2e/auth-session.e2e.mjs` |
| T-12 | CA-9 | unitaria | Prueba `[ACC-001 CA-9]` en `tests/unit/auth-session/` |
| T-13 | CA-9 | e2e | Prueba `[ACC-001 CA-9]` en `tests/e2e/auth-session.e2e.mjs` |
| T-14 | CA-10 | unitaria | Prueba `[ACC-001 CA-10]` en `tests/unit/auth-session/` |
| T-15 | CA-11 | unitaria | Prueba `[ACC-001 CA-11]` en `tests/unit/auth-session/` |
| T-16 | CA-12 | unitaria | Prueba `[ACC-001 CA-12]` en `tests/unit/auth-session/` |
| T-17 | CA-13 | unitaria | Prueba `[ACC-001 CA-13]` en `tests/unit/auth-session/` |
| T-18 | CA-14 | unitaria | Prueba `[ACC-001 CA-14]` en `tests/unit/auth-session/` |
| T-19 | CA-15 | sonda API | Prueba `[ACC-001 CA-15]` en `tests/api/auth-session.api.test.mjs` |
| T-20 | CA-16 | unitaria | Prueba `[ACC-001 CA-16]` en `tests/unit/auth-session/` |
| T-21 | CA-17 | unitaria | Prueba `[ACC-001 CA-17]` en `tests/unit/auth-session/` |
| T-22 | CA-18 | unitaria | Prueba `[ACC-001 CA-18]` en `tests/unit/auth-session/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Mock-api (hallazgo del contendiente de FND-001, 2026-11-25): `x-mock-scenario: 423` no devuelve `details.lockedUntil`. Ampliar `tests/mock-api/server.mjs` en esta historia si las pruebas del bloqueo de cuenta lo necesitan.

- Dependencias: FND-002, FND-005.
- Riesgos: Rotación estricta (C3): dos renovaciones concurrentes con el mismo token pierden una sesión; el single-flight y la sincronización entre pestañas son obligatorios.
- Pregunta no bloqueante: Vida del refresh token → Decisión propuesta: Resuelta: 7 días; access 1 h (migration-guide §1)
- Pregunta no bloqueante: ¿`email` o `username`? → Decisión propuesta: Resuelta: `email`
- Pregunta no bloqueante: ¿Las rutas legacy siguen activas? → Decisión propuesta: No: responden 403 (corte total)
- Nota: `BACKEND_PENDIENTES` (E1) sugiere que el proxy reescriba `/api/...` → `/api/v1/...`. No se adopta (ADR-0002): el cliente llama a `/api/v1` y el proxy no reescribe rutas. Las llamadas a `/api/auth/...` vistas en pruebas venían de un `app/js/app.js` compilado de otra versión del código.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/ACC-001/...` |
| CA-2 | | | `evidencia/ACC-001/...` |
| CA-3 | | | `evidencia/ACC-001/...` |
| CA-4 | | | `evidencia/ACC-001/...` |
| CA-5 | | | `evidencia/ACC-001/...` |
| CA-6 | | | `evidencia/ACC-001/...` |
| CA-7 | | | `evidencia/ACC-001/...` |
| CA-8 | | | `evidencia/ACC-001/...` |
| CA-9 | | | `evidencia/ACC-001/...` |
| CA-10 | | | `evidencia/ACC-001/...` |
| CA-11 | | | `evidencia/ACC-001/...` |
| CA-12 | | | `evidencia/ACC-001/...` |
| CA-13 | | | `evidencia/ACC-001/...` |
| CA-14 | | | `evidencia/ACC-001/...` |
| CA-15 | | | `evidencia/ACC-001/...` |
| CA-16 | | | `evidencia/ACC-001/...` |
| CA-17 | | | `evidencia/ACC-001/...` |
| CA-18 | | | `evidencia/ACC-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §1, 4, 16.1); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (C1, C3) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Se documenta la discrepancia con E1 (sin reescritura de rutas en el proxy) | BACKEND_PENDIENTES E1 | pendiente |
