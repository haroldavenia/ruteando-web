# EMP-005: Preferencias de notificación, verificación de teléfono por OTP y push web (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f6-empresa` |
| Clave anterior | F6-05 · `NOTIFICATIONS` |
| Depende de | ACC-004 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-notifications` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /notifications/preferences`, `PUT /notifications/preferences`, `POST /notifications/otp/send`, `POST /notifications/otp/resend`, `POST /notifications/otp/verify`, `POST /notifications/push/register`, `DELETE /notifications/push/unregister` |
| Maqueta | `docs/ui/maquetas/index.html#emp-005` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Preferencias de correo/SMS/push del usuario, verificación de teléfono por OTP y registro opcional de notificaciones push del navegador.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | `notify.service` solo muestra avisos locales | `notify.service.js` | Se mantiene; lo nuevo es aparte |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/notifications/preferences` | — | Preferencias | — | `get__notifications__preferences.json` |
| PUT | `/api/v1/notifications/preferences` | parcial | objeto completo | 400 | `put__notifications__preferences.json` |
| POST | `/api/v1/notifications/otp/send` | `{recipient,channel,purpose}` | `{otpId,expiresInSeconds,channel,message}` | 400, 429 | `post__notifications__otp__send.json` |
| POST | `/api/v1/notifications/otp/resend` | `{otpId,channel,recipient}` | ídem | 422 MAX_RESENDS, 429 | `post__notifications__otp__resend.json` |
| POST | `/api/v1/notifications/otp/verify` | `{otpId,code}` | `{verified:true}` | 400 INVALID_OTP, 410 OTP_EXPIRED, 422 MAX_ATTEMPTS_EXCEEDED, 429 | `post__notifications__otp__verify.json` |
| POST | `/api/v1/notifications/push/register` | `{deviceToken,platform:'web'}` | `{registered,deviceCount}` | — | `post__notifications__push__register.json` |
| DELETE | `/api/v1/notifications/push/unregister` | `{deviceToken}` | 204 | — | `delete__notifications__push__unregister.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como usuario del panel, quiero elegir qué notificaciones recibo y verificar mi teléfono, para recibir solo lo útil por el canal correcto.

## 3. Alcance

**Incluye**

- Pantalla de preferencias (merge parcial, `sms.otp` inmutable), flujo OTP (enviar, reenviar por canal alternativo, verificar con intentos restantes), activar/desactivar push web.

**Excluye (no tocar)**

- Push móvil.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/modules/config.js`
- `master/js/modules/services/notifications.api.js`
- `master/js/modules/services/notify.service.js`
- `server/sidebar-menu.json`
- `tests/api/notifications.api.test.mjs`
- `tests/e2e/notifications.e2e.mjs`
- `tests/integration/notifications/**`
- `tests/unit/notifications/**`
- `specs/migracion-api-v1/f6-empresa/evidencia/EMP-005/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Ver y editar preferencias enviando solo lo cambiado
- **RF-2** — Impedir desactivar `sms.otp`
- **RF-3** — Verificar el teléfono con un OTP de 6 dígitos
- **RF-4** — Reenviar por canal alternativo
- **RF-5** — Mostrar intentos restantes, caducidad y límites
- **RF-6** — Activar/desactivar push del navegador

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado desactivar `email.product`, Entonces `PUT` con solo `{email:{product:false}}` y refresca con la respuesta
- **CA-2** (RF-2) — Dado la UI, Entonces `sms.otp` aparece activado y deshabilitado
- **CA-3** (RF-3) — Dado `+57300…`, Entonces `POST /otp/send {channel:'sms',purpose:'phone_verification'}`, cuenta atrás de `expiresInSeconds` y campo de 6 dígitos
- **CA-4** (RF-5) — Dado `INVALID_OTP` con `attemptsRemaining:2`, Entonces «Código incorrecto, te quedan 2 intentos»; `OTP_EXPIRED`, Entonces «Pide un código nuevo»; `MAX_ATTEMPTS_EXCEEDED`, Entonces bloquear y ofrecer nuevo
- **CA-5** (RF-4) — Dado reenviar por correo, Entonces `POST /otp/resend` conservando la caducidad
- **CA-6** (RF-6) — Dado permiso del navegador concedido, Entonces `POST /push/register {platform:'web'}`; al desactivar `DELETE /push/unregister`

## 6. Diseño y restricciones técnicas

Crear `notifications.api.js`, controladores y vistas. Push: requiere service worker y proveedor FCM (pregunta).

**Pantallas y flujos.** Perfil → Notificaciones; Perfil → Verificar teléfono. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.profile.notifications (nuevo)` | `pages/profile/notifications.jade` | super_admin, tenant_admin, agent | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[EMP-005 CA-1]` en `tests/unit/notifications/` |
| T-2 | CA-1 | contrato | Prueba `[EMP-005 CA-1]` en `tests/integration/notifications/` |
| T-3 | CA-2 | unitaria | Prueba `[EMP-005 CA-2]` en `tests/unit/notifications/` |
| T-4 | CA-3 | unitaria | Prueba `[EMP-005 CA-3]` en `tests/unit/notifications/` |
| T-5 | CA-3 | contrato | Prueba `[EMP-005 CA-3]` en `tests/integration/notifications/` |
| T-6 | CA-3 | e2e | Prueba `[EMP-005 CA-3]` en `tests/e2e/notifications.e2e.mjs` |
| T-7 | CA-4 | unitaria | Prueba `[EMP-005 CA-4]` en `tests/unit/notifications/` |
| T-8 | CA-5 | unitaria | Prueba `[EMP-005 CA-5]` en `tests/unit/notifications/` |
| T-9 | CA-6 | unitaria | Prueba `[EMP-005 CA-6]` en `tests/unit/notifications/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-004.
- Riesgos: Push web exige configuración FCM.
- Pregunta **bloqueante**: ¿Push web en alcance inmediato? → Decisión propuesta: Sí para registro; si no hay FCM web, se difiere con aprobación

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/EMP-005/...` |
| CA-2 | | | `evidencia/EMP-005/...` |
| CA-3 | | | `evidencia/EMP-005/...` |
| CA-4 | | | `evidencia/EMP-005/...` |
| CA-5 | | | `evidencia/EMP-005/...` |
| CA-6 | | | `evidencia/EMP-005/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §12); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
