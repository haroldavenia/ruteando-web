# ACC-002: Registro de empresa y verificación de correo

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f1-acceso` |
| Clave anterior | F1-02 · `AUTH-REGISTER` |
| Depende de | ACC-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-auth-register` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/resend-verification` |
| Maqueta | `docs/ui/maquetas/index.html#acc-002` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Registrar una empresa nueva (tenant + administrador) y verificar el correo con el token del enlace, reemplazando `/singup` y `/singup/activate`.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Registro `POST /singup` con username/password/password_repeat (alta de usuario suelto) | `register_controller.js` | Cambia: `POST /auth/register` abre un **tenant** + `tenant_admin`; el formulario pide empresa (`tenantName`), país y datos opcionales |
| L2 | Detecta `UserDuplicateException` | `register_controller.js` | Cambia: 409 `EMAIL_ALREADY_EXISTS` |
| L3 | Paso 2 de registro (`access.registerTwo`) | `config.js:52; register_two.jade` | Cambia: panel de confirmación «Revisa tu correo» |
| L4 | Activación `/activate/:token` → `POST /singup/activate` | `activate_controller.js; config.js:67` | Cambia: `#/access/verify?token=` → `POST /auth/verify-email`; `/activate/:token` redirige |
| L5 | Botón cancelar vuelve a login | `register_controller.js `cancel`` | Se mantiene |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | `{email,password,firstName,lastName,phone?,tenantName,country,timezone?,companySize?,industry?,trialPlan?}` | 201 `{message,tenant{id,name,slug,plan,trial{plan,startsAt,endsAt,seatLimit}},user{…,emailVerified:false}}` sin tokens | 400 política/VALIDATION_ERROR, 409 EMAIL_ALREADY_EXISTS, 429 (3/h/IP) | `post__auth__register.json` |
| POST | `/api/v1/auth/verify-email` | `{token}` | 200 `LoginResponse` (sesión iniciada) | 400 TOKEN_EXPIRED (24 h; observado también INVALID_TOKEN), 429 | `post__auth__verify-email.json` |
| POST | `/api/v1/auth/resend-verification` | `{email}` | 200 `{message}` neutro | 429 | `post__auth__resend-verification.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como dueño de una empresa nueva, quiero registrar mi empresa y verificar mi correo, para empezar a usar Ruteando por mi cuenta.

## 3. Alcance

**Incluye**

- Formulario de registro con política de contraseña real, panel «Revisa tu correo» con reenvío, pantalla de verificación que consume el token una vez e inicia sesión.

**Excluye (no tocar)**

- Invitaciones (EMP-002).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/activate.jade`
- `master/jade/views/pages/register.jade`
- `master/jade/views/pages/register_two.jade`
- `master/jade/views/pages/verify.jade`
- `master/js/custom/access/activate_controller.js`
- `master/js/custom/access/register_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/activate_controller.js`
- `master/js/modules/services/auth_account.js`
- `master/js/modules/services/config.js`
- `master/js/modules/services/register_controller.js`
- `master/js/modules/services/verify_controller.js`
- `server/sidebar-menu.json`
- `tests/api/auth-register.api.test.mjs`
- `tests/e2e/auth-register.e2e.mjs`
- `tests/integration/auth-register/**`
- `tests/unit/auth-register/**`
- `specs/migracion-api-v1/f1-acceso/evidencia/ACC-002/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Registrar empresa y administrador validando la política de contraseña (≥16, mayúscula, minúscula, dígito, símbolo `@$!%*?&`) y repetición
- **RF-2** — Mostrar «Revisa tu correo» tras el registro con opción de reenviar
- **RF-3** — Verificar el correo con el token del enlace una sola vez, iniciar sesión y retirar el token de la URL
- **RF-4** — Redirigir el enlace antiguo `#/access/activate/:token` al nuevo flujo
- **RF-5** — Mostrar errores por código: correo duplicado, política, token inválido/caducado (con reenvío), límite de intentos
- **RF-6** — Ofrecer prueba gratuita opcional (`trialPlan`: basic/standard/premium/enterprise; 14 días, 2 asientos) y campos opcionales de empresa (zona horaria, tamaño, industria) y teléfono E.164

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado datos válidos, Cuando envío el registro, Entonces se llama `POST /auth/register` con el cuerpo del fixture y se muestra el panel «Revisa tu correo»
- **CA-2** (RF-1) — Dado una contraseña de 14 caracteres, Cuando escribo, Entonces el formulario la marca inválida antes de enviar y explica la regla
- **CA-3** (RF-2) — Dado el panel, Cuando pulso «Reenviar», Entonces `POST /auth/resend-verification {email}` y aviso neutro; con 429 muestra la espera
- **CA-4** (RF-3) — Dado `#/access/verify?token=abc`, Cuando carga, Entonces llama una sola vez `POST /auth/verify-email {token:'abc'}`, inicia sesión, quita el token de la URL y navega a home
- **CA-5** (RF-4) — Dado `#/access/activate/abc`, Cuando carga, Entonces termina en `#/access/verify` con el token y verifica
- **CA-6** (RF-5) — Dado 409 `EMAIL_ALREADY_EXISTS`, Entonces el campo correo muestra «Ya existe una cuenta con ese correo» y enlace a recuperar
- **CA-7** (RF-5) — Dado 400 `TOKEN_EXPIRED`, Entonces «El enlace venció» con formulario de reenvío; dado 400 `INVALID_TOKEN`, Entonces «Enlace no válido o ya usado» y botón al inicio
- **CA-8** (RF-6) — Dado `country` vacío, Entonces no se envía; dado teléfono `3001234567`, Entonces error «Formato +573001234567»; dado `trialPlan` elegido, Entonces se muestra «14 días · 2 asientos»
- **CA-9** (RF-2) — Dado el 201, Entonces el panel muestra el nombre de la empresa y, si hay `tenant.trial`, la fecha `endsAt` en hora local; la pantalla siguiente no es el home
- **CA-10** (RF-4) — Dado el enlace del correo `<app>/verify-email?token=abc`, Cuando lo abro, Entonces el servidor redirige a `#/access/verify?token=abc` y se verifica

## 6. Diseño y restricciones técnicas

Crear `verify_controller.js`, `verify.jade`, `auth_account.js` (register/verify/resend). Modificar `register_controller.js`, `register.jade`, `config.js`. Eliminar `activate_controller.js`, `register_two.jade`, `activate.jade`.

**Pantallas y flujos.** Registro → 201 → panel de correo enviado (reenviar). Correo → verify → sesión → home. Token inválido → reenviar. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `access.register` | `pages/register.jade` | público | Campos empresa + persona; política visible |
| `access.verify (nuevo)` | `pages/access/verify.jade` | público | Sustituye `access.activate` y `access.registerTwo` |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[ACC-002 CA-1]` en `tests/unit/auth-register/` |
| T-2 | CA-1 | contrato | Prueba `[ACC-002 CA-1]` en `tests/integration/auth-register/` |
| T-3 | CA-1 | e2e | Prueba `[ACC-002 CA-1]` en `tests/e2e/auth-register.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[ACC-002 CA-2]` en `tests/unit/auth-register/` |
| T-5 | CA-3 | unitaria | Prueba `[ACC-002 CA-3]` en `tests/unit/auth-register/` |
| T-6 | CA-3 | e2e | Prueba `[ACC-002 CA-3]` en `tests/e2e/auth-register.e2e.mjs` |
| T-7 | CA-4 | unitaria | Prueba `[ACC-002 CA-4]` en `tests/unit/auth-register/` |
| T-8 | CA-4 | e2e | Prueba `[ACC-002 CA-4]` en `tests/e2e/auth-register.e2e.mjs` |
| T-9 | CA-5 | e2e | Prueba `[ACC-002 CA-5]` en `tests/e2e/auth-register.e2e.mjs` |
| T-10 | CA-6 | unitaria | Prueba `[ACC-002 CA-6]` en `tests/unit/auth-register/` |
| T-11 | CA-7 | unitaria | Prueba `[ACC-002 CA-7]` en `tests/unit/auth-register/` |
| T-12 | CA-8 | unitaria | Prueba `[ACC-002 CA-8]` en `tests/unit/auth-register/` |
| T-13 | CA-9 | unitaria | Prueba `[ACC-002 CA-9]` en `tests/unit/auth-register/` |
| T-14 | CA-9 | contrato | Prueba `[ACC-002 CA-9]` en `tests/integration/auth-register/` |
| T-15 | CA-10 | e2e | Prueba `[ACC-002 CA-10]` en `tests/e2e/auth-register.e2e.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-001.
- Riesgos: D12 (correos no recibidos en el entorno probado): pruebas con mock-api y dispensa live.
- Pregunta no bloqueante: URL del enlace de verificación → Decisión propuesta: Resuelta (D1): `{app.frontend-url}/verify-email?token=`; FND-002 redirige a la ruta hash

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/ACC-002/...` |
| CA-2 | | | `evidencia/ACC-002/...` |
| CA-3 | | | `evidencia/ACC-002/...` |
| CA-4 | | | `evidencia/ACC-002/...` |
| CA-5 | | | `evidencia/ACC-002/...` |
| CA-6 | | | `evidencia/ACC-002/...` |
| CA-7 | | | `evidencia/ACC-002/...` |
| CA-8 | | | `evidencia/ACC-002/...` |
| CA-9 | | | `evidencia/ACC-002/...` |
| CA-10 | | | `evidencia/ACC-002/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §4, 16.1); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (C2, D1) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
