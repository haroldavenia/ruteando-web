# EMP-001: Usuarios del tenant (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f6-empresa` |
| Clave anterior | F6-01 · `USERS-ADMIN` |
| Depende de | MAE-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-users-admin` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /users`, `GET /users/{id}`, `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}`, `POST /users/{id}/reset-password`, `GET /tenants/me`, `POST /users/batch-delete` |
| Maqueta | `docs/ui/maquetas/index.html#emp-001` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Gestionar todas las cuentas del tenant (administradores, agentes y conductores): alta directa, rol, activación, baja y restablecimiento forzado.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe gestión de usuarios web | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/users` | `?role&page&size` | Page<User> | 403 | `get__users.json` |
| GET | `/api/v1/users/{id}` | — | User | 404 | `get__users__id.json` |
| POST | `/api/v1/users` | `{email,password,firstName,lastName,phone,role*(minúsculas),identifierType,identifierValue,avatar}` | 201 UserResponse; consume asiento | 400,409 EMAIL_ALREADY_EXISTS/SEAT_LIMIT_EXCEEDED | `post__users.json` |
| PUT | `/api/v1/users/{id}` | igual sin `password` si no cambia; `active`, `role` | 200 | 409 SEAT_LIMIT_EXCEEDED | `put__users__id.json` |
| DELETE | `/api/v1/users/{id}` | — | 204 soft | 404 | `delete__users__id.json` |
| POST | `/api/v1/users/{id}/reset-password` | — | 200 | 404 | `post__users__id__reset-password.json` |
| GET | `/api/v1/tenants/me` | — | `seats{limit,used,available}` (-1 ilimitado) | 403 | `get__tenants__me.json` |
| POST | `/api/v1/users/batch-delete` | `{ids}` (máx. 100) | 200 `{results:[{id,status,error?}]}` | 422 más de 100 ids | — (capturar) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero gestionar las cuentas y roles de mi empresa, para controlar quién accede y a qué.

## 3. Alcance

**Incluye**

- Listado paginado con filtro por rol, alta, edición (rol, activo), baja (libera asiento), forzar restablecimiento, indicador de asientos usados.

**Excluye (no tocar)**

- Invitaciones (EMP-002).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/users/**`
- `master/js/modules/config.js`
- `master/js/modules/services/users.api.js`
- `server/sidebar-menu.json`
- `tests/api/users-admin.api.test.mjs`
- `tests/e2e/users-admin.e2e.mjs`
- `tests/integration/users-admin/**`
- `tests/unit/users-admin/**`
- `specs/migracion-api-v1/f6-empresa/evidencia/EMP-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar usuarios filtrando por rol
- **RF-2** — Crear usuario con rol
- **RF-3** — Cambiar rol y estado activo respetando asientos
- **RF-4** — Dar de baja un usuario
- **RF-5** — Forzar el restablecimiento de contraseña con confirmación
- **RF-6** — Mostrar asientos usados/límite
- **RF-7** — Dar de baja varios usuarios a la vez con informe por usuario

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado filtro `agent`, Entonces `GET /users?role=agent&page=0&size=20`
- **CA-2** (RF-2) — Dado alta válida, Entonces `POST /users`
- **CA-3** (RF-3) — Dado activar con 409 `SEAT_LIMIT_EXCEEDED`, Entonces se revierte y se ofrece ir a Facturación
- **CA-4** (RF-4) — Dado baja confirmada, Entonces `DELETE /users/{id}`
- **CA-5** (RF-5) — Dado «Forzar restablecimiento», Entonces confirmación y `POST /users/{id}/reset-password` con aviso «Se envió un correo y se cerraron sus sesiones»
- **CA-6** (RF-6) — Dado `GET /tenants/me`, Entonces cabecera «Asientos: usados/límite»
- **CA-7** (RF-3) — Dado que edito mi propio usuario, Entonces no puedo quitarme el rol de administrador ni desactivarme
- **CA-8** (RF-2) — Dado el alta, Entonces `role` se envía en minúsculas (`agent`), nunca la clave `AGENT` del dominio `Role`
- **CA-9** (RF-2) — Dado `identifierType` fuera del catálogo, Entonces 400 y error en el campo; el select incluye `license`
- **CA-10** (RF-7) — Dado 3 usuarios seleccionados (sin incluirme), Cuando confirmo la baja, Entonces `POST /users/batch-delete` y aviso «Se dieron de baja X de 3»; mi propio usuario no se puede seleccionar

## 6. Diseño y restricciones técnicas

Ampliar `users.api.js`. Crear `custom/users/*`.

**Pantallas y flujos.** Listado → acciones. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.users.list/add/edit (nuevo)` | `pages/users/*` | tenant_admin, super_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[EMP-001 CA-1]` en `tests/unit/users-admin/` |
| T-2 | CA-1 | contrato | Prueba `[EMP-001 CA-1]` en `tests/integration/users-admin/` |
| T-3 | CA-1 | e2e | Prueba `[EMP-001 CA-1]` en `tests/e2e/users-admin.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[EMP-001 CA-2]` en `tests/unit/users-admin/` |
| T-5 | CA-2 | contrato | Prueba `[EMP-001 CA-2]` en `tests/integration/users-admin/` |
| T-6 | CA-2 | e2e | Prueba `[EMP-001 CA-2]` en `tests/e2e/users-admin.e2e.mjs` |
| T-7 | CA-3 | unitaria | Prueba `[EMP-001 CA-3]` en `tests/unit/users-admin/` |
| T-8 | CA-4 | unitaria | Prueba `[EMP-001 CA-4]` en `tests/unit/users-admin/` |
| T-9 | CA-4 | e2e | Prueba `[EMP-001 CA-4]` en `tests/e2e/users-admin.e2e.mjs` |
| T-10 | CA-5 | unitaria | Prueba `[EMP-001 CA-5]` en `tests/unit/users-admin/` |
| T-11 | CA-5 | e2e | Prueba `[EMP-001 CA-5]` en `tests/e2e/users-admin.e2e.mjs` |
| T-12 | CA-6 | unitaria | Prueba `[EMP-001 CA-6]` en `tests/unit/users-admin/` |
| T-13 | CA-6 | contrato | Prueba `[EMP-001 CA-6]` en `tests/integration/users-admin/` |
| T-14 | CA-7 | unitaria | Prueba `[EMP-001 CA-7]` en `tests/unit/users-admin/` |
| T-15 | CA-8 | unitaria | Prueba `[EMP-001 CA-8]` en `tests/unit/users-admin/` |
| T-16 | CA-9 | unitaria | Prueba `[EMP-001 CA-9]` en `tests/unit/users-admin/` |
| T-17 | CA-10 | unitaria | Prueba `[EMP-001 CA-10]` en `tests/unit/users-admin/` |
| T-18 | CA-10 | e2e | Prueba `[EMP-001 CA-10]` en `tests/e2e/users-admin.e2e.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-003.
- Riesgos: —
- Pregunta no bloqueante: ¿Quién puede crear `tenant_admin`? → Decisión propuesta: `tenant_admin` y `super_admin` vía `POST /users` (las invitaciones solo admiten agent/driver)

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/EMP-001/...` |
| CA-2 | | | `evidencia/EMP-001/...` |
| CA-3 | | | `evidencia/EMP-001/...` |
| CA-4 | | | `evidencia/EMP-001/...` |
| CA-5 | | | `evidencia/EMP-001/...` |
| CA-6 | | | `evidencia/EMP-001/...` |
| CA-7 | | | `evidencia/EMP-001/...` |
| CA-8 | | | `evidencia/EMP-001/...` |
| CA-9 | | | `evidencia/EMP-001/...` |
| CA-10 | | | `evidencia/EMP-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §5); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D15) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Baja por lote con `POST /users/batch-delete` (M1) | migration-guide §7 (M1) y endpoints.md | pendiente |
