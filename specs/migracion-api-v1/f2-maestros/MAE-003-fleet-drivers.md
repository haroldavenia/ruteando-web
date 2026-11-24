# MAE-003: Conductores → users con rol driver

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-03 · `FLEET-DRIVERS` |
| Depende de | ACC-005, FND-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-fleet-drivers` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /users`, `GET /users/drivers`, `POST /users`, `PUT /users/{id}`, `GET /users/{id}`, `DELETE /users/{id}`, `POST /users/batch-delete` |
| Maqueta | `docs/ui/maquetas/index.html#mae-003` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Gestionar conductores (cuentas que usan la app móvil) desde el panel como usuarios con rol `driver`.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado con búsqueda de texto, selección múltiple, paginación en cliente (10/página) | `drivers_controller.js` | Cambia: paginación de servidor + búsqueda en cliente sobre la página o `listAll` |
| L2 | Borrar uno con confirmación ngDialog | `drivers_controller.js` | Se mantiene: `DELETE /{id}` |
| L3 | Borrar seleccionados (`DELETE ?ids=`) | `drivers_http.js` | Cambia: una petición `POST /users/batch-delete` (lotes de 100) con informe «Se eliminaron X de N» |
| L4 | Ir a crear / editar | `drivers_controller.js` | Se mantiene |
| L5 | Formulario crear/editar con cancelar | `driver_controller.js` | Se mantiene con nuevos campos |
| L6 | Recuperación de token con `resincTknRefresh` en la carga | `drivers_controller.js` | Se retira (interceptor ACC-001) |
| L7 | Campos identificationNumber, licenceNumber, phoneNumber, user.{…} | `drivers/form.jade` | Cambia: la licencia es `identifierType:'license'` + `identifierValue` (D10) |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/users` | `?role=driver&page&size` | Page<UserResponse> (listado) | 403 | `get__users.json` |
| GET | `/api/v1/users/drivers` | — | Arreglo de conductores activos (solo para selectores) | 403 | `get__users__drivers.json` |
| POST | `/api/v1/users` | `{email,password,firstName,lastName,phone(E.164),role:'driver',identifierType,identifierValue,avatar}` | 201 UserResponse; consume un asiento | 400,409 EMAIL_ALREADY_EXISTS/SEAT_LIMIT_EXCEEDED | `post__users.json` |
| GET | `/api/v1/users/{id}` | — | User | 404 | `get__users__id.json` |
| PUT | `/api/v1/users/{id}` | sin password | User | 400,409 SEAT_LIMIT_EXCEEDED | `put__users__id.json` |
| DELETE | `/api/v1/users/{id}` | — | 204 (soft) | 404 | `delete__users__id.json` |
| POST | `/api/v1/users/batch-delete` | `{ids}` (máx. 100) | 200 `{results:[{id,status:deleted\|not_found\|conflict,error?}]}`; `error` = el 409 (`CONFLICT`, `details.referencedBy`, `details.ids`) | 422 si hay más de 100 ids (no borra ninguno) | — (capturar con `capture-fixture`) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero dar de alta y gestionar las cuentas de conductores, para que usen la app móvil con su vehículo asignado.

## 3. Alcance

**Incluye**

- Listado (lista plana, paginación en cliente), alta con correo y contraseña repetida, documento (`identifierType`+`identifierValue`), teléfono, activo, edición sin contraseña, borrado (soft), límite de asientos.

**Excluye (no tocar)**

- La app móvil y sus endpoints `/driver/*`.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/drivers/driver_controller.js`
- `master/js/custom/drivers/drivers_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/drivers_http.js`
- `master/js/modules/services/users.api.js`
- `server/sidebar-menu.json`
- `tests/api/fleet-drivers.api.test.mjs`
- `tests/e2e/fleet-drivers.e2e.mjs`
- `tests/integration/fleet-drivers/**`
- `tests/unit/fleet-drivers/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-003/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar conductores paginados (`GET /users?role=driver`) con búsqueda
- **RF-2** — Crear conductor con contraseña según política y repetición
- **RF-3** — Editar conductor sin tocar la contraseña
- **RF-4** — Activar/desactivar respetando el límite de asientos
- **RF-5** — Borrar uno o varios con informe
- **RF-6** — Elegir tipo de documento del dominio `IdentifierType`

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el fixture de usuarios, Entonces `GET /users?role=driver&page=0&size=20` y la tabla muestra nombre, correo, teléfono, documento y estado
- **CA-2** (RF-2) — Dado formulario válido, Entonces `POST /users` con `role:'driver'`
- **CA-3** (RF-2) — Dado 409 `EMAIL_ALREADY_EXISTS`, Entonces error en correo; `SEAT_LIMIT_EXCEEDED`, Entonces aviso con enlace a Facturación
- **CA-4** (RF-3) — Dado edición, Entonces `PUT /users/{id}` no incluye `password`
- **CA-5** (RF-4) — Dado activar con 409 `SEAT_LIMIT_EXCEEDED`, Entonces el interruptor vuelve a su estado y se avisa
- **CA-6** (RF-5) — Dado 2 seleccionados, Entonces `POST /users/batch-delete` e informe
- **CA-7** (RF-6) — Dado el dominio, Entonces el selector de documento ofrece valores activos con etiqueta
- **CA-8** (RF-6) — Dado un conductor con licencia, Entonces el select ofrece `license` y la columna «Licencia» muestra `identifierValue` cuando `identifierType = 'license'`; un tipo fuera del catálogo da 400 y se marca el campo
- **CA-9** (RF-5) — Dado 3 seleccionados con un resultado `conflict` (`details.referencedBy`), Cuando confirmo, Entonces una sola petición `POST /users/batch-delete {ids:[…3]}`, aviso «Se eliminaron 2 de 3» y el detalle del que está en uso; un `not_found` cuenta como ya eliminado
- **CA-10** (RF-5) — Dado 150 seleccionados, Entonces `ApiClient.batchDelete` envía 2 peticiones (100 y 50) y muestra un único informe; nunca se envía un lote de más de 100 (evita el 422)

## 6. Diseño y restricciones técnicas

Crear `users.api.js` (compartido con EMP-001). Modificar drivers controllers/vistas. Eliminar `drivers_http.js`.

**Pantallas y flujos.** Igual al legacy con estados carga/vacío/error. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.drivers.list/add/edit` | `pages/drivers/*` | tenant_admin, super_admin | Campos nuevos |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-003 CA-1]` en `tests/unit/fleet-drivers/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-003 CA-1]` en `tests/integration/fleet-drivers/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-003 CA-1]` en `tests/e2e/fleet-drivers.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-003 CA-2]` en `tests/unit/fleet-drivers/` |
| T-5 | CA-2 | contrato | Prueba `[MAE-003 CA-2]` en `tests/integration/fleet-drivers/` |
| T-6 | CA-2 | e2e | Prueba `[MAE-003 CA-2]` en `tests/e2e/fleet-drivers.e2e.mjs` |
| T-7 | CA-3 | unitaria | Prueba `[MAE-003 CA-3]` en `tests/unit/fleet-drivers/` |
| T-8 | CA-4 | unitaria | Prueba `[MAE-003 CA-4]` en `tests/unit/fleet-drivers/` |
| T-9 | CA-4 | contrato | Prueba `[MAE-003 CA-4]` en `tests/integration/fleet-drivers/` |
| T-10 | CA-5 | unitaria | Prueba `[MAE-003 CA-5]` en `tests/unit/fleet-drivers/` |
| T-11 | CA-6 | unitaria | Prueba `[MAE-003 CA-6]` en `tests/unit/fleet-drivers/` |
| T-12 | CA-6 | e2e | Prueba `[MAE-003 CA-6]` en `tests/e2e/fleet-drivers.e2e.mjs` |
| T-13 | CA-7 | unitaria | Prueba `[MAE-003 CA-7]` en `tests/unit/fleet-drivers/` |
| T-14 | CA-8 | unitaria | Prueba `[MAE-003 CA-8]` en `tests/unit/fleet-drivers/` |
| T-15 | CA-9 | unitaria | Prueba `[MAE-003 CA-9]` en `tests/unit/fleet-drivers/` |
| T-16 | CA-9 | contrato | Prueba `[MAE-003 CA-9]` en `tests/integration/fleet-drivers/` |
| T-17 | CA-9 | e2e | Prueba `[MAE-003 CA-9]` en `tests/e2e/fleet-drivers.e2e.mjs` |
| T-18 | CA-10 | unitaria | Prueba `[MAE-003 CA-10]` en `tests/unit/fleet-drivers/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-005, FND-003.
- Riesgos: —
- Pregunta no bloqueante: Licencia → Decisión propuesta: Resuelta (D10/D15): `identifierType = license`

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-003/...` |
| CA-2 | | | `evidencia/MAE-003/...` |
| CA-3 | | | `evidencia/MAE-003/...` |
| CA-4 | | | `evidencia/MAE-003/...` |
| CA-5 | | | `evidencia/MAE-003/...` |
| CA-6 | | | `evidencia/MAE-003/...` |
| CA-7 | | | `evidencia/MAE-003/...` |
| CA-8 | | | `evidencia/MAE-003/...` |
| CA-9 | | | `evidencia/MAE-003/...` |
| CA-10 | | | `evidencia/MAE-003/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §5, 16.1); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D10, D15) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Borrado por lote con `POST /users/batch-delete` (M1): un resultado por id; sustituye los N `DELETE` | migration-guide §7 (M1) y endpoints.md | pendiente |
