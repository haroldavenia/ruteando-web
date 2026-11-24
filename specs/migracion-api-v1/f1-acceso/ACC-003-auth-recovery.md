# ACC-003: Recuperación y restablecimiento de contraseña

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f1-acceso` |
| Clave anterior | F1-03 · `AUTH-RECOVERY` |
| Depende de | ACC-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-auth-recovery` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Maqueta | `docs/ui/maquetas/index.html#acc-003` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Reemplazar `/forgotPassword` y `/forgotPassword/reset` por los endpoints de auth nuevos.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | `POST /forgotPassword {email}` y vuelve a login | `recovery_controller.js` | Cambia: `POST /auth/forgot-password`, mensaje neutro |
| L2 | `POST /forgotPassword/reset {token,password,password-repeat}` | `reset_controller.js; config.js:62` | Cambia: `POST /auth/reset-password {token,newPassword}`; ruta `#/access/reset?token=` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/forgot-password` | `{email}` | 200 mensaje neutro | 429 (3/h por email) | `post__auth__forgot-password.json` |
| POST | `/api/v1/auth/reset-password` | `{token,newPassword}` (la repetición solo en el formulario) | 200 `{message}`; invalida todos los refresh | 400 TOKEN_EXPIRED (token 1 h)/INVALID_TOKEN/PASSWORD_POLICY_VIOLATION/VALIDATION_ERROR | `post__auth__reset-password.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como usuario que olvidó su contraseña, quiero recuperarla con un enlace seguro, para volver a entrar sin pedir ayuda.

## 3. Alcance

**Incluye**

- Solicitud con mensaje neutro, restablecimiento con token y política de contraseña, redirección de la ruta antigua `/reset/:token`.

**Excluye (no tocar)**

- Restablecimiento forzado por administrador (EMP-001).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/access/recovery_controller.js`
- `master/js/custom/access/reset_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/auth_account.js`
- `master/js/modules/services/config.js`
- `master/js/modules/services/recovery_controller.js`
- `master/js/modules/services/reset_controller.js`
- `server/sidebar-menu.json`
- `tests/api/auth-recovery.api.test.mjs`
- `tests/e2e/auth-recovery.e2e.mjs`
- `tests/integration/auth-recovery/**`
- `tests/unit/auth-recovery/**`
- `specs/migracion-api-v1/f1-acceso/evidencia/ACC-003/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Solicitar recuperación mostrando siempre el mismo mensaje exista o no el correo
- **RF-2** — Restablecer la contraseña con token, política y repetición, retirando el token de la URL
- **RF-3** — Distinguir token inválido de contraseña inválida por código
- **RF-4** — Redirigir `#/access/reset/:token` antiguo al nuevo

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado cualquier correo, Cuando envío, Entonces se llama `POST /auth/forgot-password` y se muestra «Si existe una cuenta, recibirás un correo»
- **CA-2** (RF-1) — Dado 429, Entonces muestra la espera y deshabilita el botón
- **CA-3** (RF-2) — Dado `#/access/reset?token=t` y contraseña válida repetida, Cuando envío, Entonces `POST /auth/reset-password` con el cuerpo del fixture y vuelve a login con aviso de éxito
- **CA-4** (RF-3) — Dado 400 `TOKEN_EXPIRED`, Entonces «El enlace venció (vale 1 hora)» con enlace a pedir otro; dado `INVALID_TOKEN`, Entonces «Enlace no válido o ya usado» y volver al inicio; dado `PASSWORD_POLICY_VIOLATION`, Entonces error en el campo contraseña
- **CA-5** (RF-4) — Dado el enlace del correo `<app>/reset-password?token=t`, Cuando lo abro, Entonces termino en `#/access/reset?token=t`; el antiguo `#/access/reset/t` también

## 6. Diseño y restricciones técnicas

Modificar `recovery_controller.js`, `reset_controller.js`, vistas, `config.js`, `auth_account.js`.

**Pantallas y flujos.** Recuperar → correo → reset → login. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `access.recovery` | `pages/recover.jade` | público | Mensaje neutro |
| `access.reset` | `pages/reset.jade` | público | Token por query |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[ACC-003 CA-1]` en `tests/unit/auth-recovery/` |
| T-2 | CA-1 | e2e | Prueba `[ACC-003 CA-1]` en `tests/e2e/auth-recovery.e2e.mjs` |
| T-3 | CA-2 | unitaria | Prueba `[ACC-003 CA-2]` en `tests/unit/auth-recovery/` |
| T-4 | CA-3 | unitaria | Prueba `[ACC-003 CA-3]` en `tests/unit/auth-recovery/` |
| T-5 | CA-3 | contrato | Prueba `[ACC-003 CA-3]` en `tests/integration/auth-recovery/` |
| T-6 | CA-3 | e2e | Prueba `[ACC-003 CA-3]` en `tests/e2e/auth-recovery.e2e.mjs` |
| T-7 | CA-4 | unitaria | Prueba `[ACC-003 CA-4]` en `tests/unit/auth-recovery/` |
| T-8 | CA-5 | e2e | Prueba `[ACC-003 CA-5]` en `tests/e2e/auth-recovery.e2e.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-001.
- Riesgos: correos de verificación, restablecer e invitación comprobados en el entorno de desarrollo (B1, 2026-11-23; remitente `info@routengio.com`): la prueba en vivo usa la cuenta `sdd-test`.
- Pregunta no bloqueante: URL del enlace → Decisión propuesta: Resuelta (D1): `{app.frontend-url}/reset-password?token=`

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/ACC-003/...` |
| CA-2 | | | `evidencia/ACC-003/...` |
| CA-3 | | | `evidencia/ACC-003/...` |
| CA-4 | | | `evidencia/ACC-003/...` |
| CA-5 | | | `evidencia/ACC-003/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §4); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (C2, D1) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | B1 comprobado: se retira la dispensa de prueba en vivo de los correos | BACKEND_PENDIENTES B1 | pendiente |
