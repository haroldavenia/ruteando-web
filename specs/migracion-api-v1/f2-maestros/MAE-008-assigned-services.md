# MAE-008: Servicios asignados (conductor + fecha)

| Campo | Valor |
| --- | --- |
| Estado | Descartada |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-08 · `ASSIGNED-SERVICES` |
| Depende de | MAE-002, MAE-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-assigned-services` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

> **Descartada (2026-11-19):** el backend eliminó `/api/v1/assigned-services` (404). El vehículo del conductor es el recurso con `driverId` (MAE-002); sus rutas, la app móvil. Se conserva como registro; no se implementa.

## 1. Objetivo y contexto

Reparar y completar el módulo: el listado legacy está roto (`getAssignedServices` no existe) y solo había POST.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado roto (`getAssignedServices` inexistente) con acciones mapa/visitas | `assigned_services_controller.js` | Cambia: funcional con `GET /assigned-services` |
| L2 | Alta: asignar conductor a vehículo `POST /assignedservice` | `assigned_services_form_controller.js` | Cambia: `POST /assigned-services` |
| L3 | Desde rutas «Asignar servicio» (`app.assignedServices.add`) | `routes_controller.js `addService`` | Se mantiene desde detalle de ruta (JOR-003) |
| L4 | Mapa de asignados `app.maps.assigned` | `map_gen_latlong_controller.js` | Se mantiene si hay datos de ruta |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/assigned-services` | — | Arreglo | 401 | `get__assigned-services.json` |
| GET | `/api/v1/assigned-services/{id}` | — | Asignación | 404 | `get__assigned-services__id.json` |
| POST | `/api/v1/assigned-services` | `{driverId*,executionDate*('YYYY-MM-DD'),vehicleId,routeId,state}` | 201 `{id,tenantId,driverId,vehicleId,routeId,routeName,state,executionDate}`; mismo conductor+fecha actualiza | 400 | `post__assigned-services.json` |
| PUT | `/api/v1/assigned-services/{id}` | igual | 200 | 400,404 | `put__assigned-services__id.json` |
| DELETE | `/api/v1/assigned-services/{id}` | — | 204 | 404 | `delete__assigned-services__id.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero asignar conductor y fecha (retirada: el backend eliminó el recurso), para —.

## 3. Alcance

**Incluye**

- Listado (arreglo) con filtros por fecha y conductor, alta/edición (conductor, vehículo, fecha, jornada/ruta si aplica), borrado, aviso de upsert por conductor+fecha, ver en mapa, ir a visitas.

**Excluye (no tocar)**

- Asignación de la app móvil (`/driver/assignments`).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/assigned_services/assigned_services_controller.js`
- `master/js/custom/assigned_services/assigned_services_form_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/assigned_services.api.js`
- `master/js/modules/services/assignedservices_http.js`
- `server/sidebar-menu.json`
- `tests/api/assigned-services.api.test.mjs`
- `tests/e2e/assigned-services.e2e.mjs`
- `tests/integration/assigned-services/**`
- `tests/unit/assigned-services/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-008/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar asignaciones con filtros en cliente por fecha y conductor
- **RF-2** — Crear asignación avisando si ya existe una para ese conductor y fecha (se actualizará)
- **RF-3** — Editar y borrar asignaciones
- **RF-4** — Crear asignación desde el detalle de una ruta con datos precargados
- **RF-5** — Abrir la asignación en mapa y en visitas
- **RF-6** — Gestionar el estado de la asignación (`INACTIVO`, `ACTIVO`, `EN_SERVICIO`, `COMPLETADO`)

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `get__assigned-services.json`, Entonces tabla con conductor, vehículo, fecha
- **CA-2** (RF-2) — Dado conductor+fecha ya asignados, Cuando guardo, Entonces aviso previo «Se actualizará la asignación existente» y tras confirmar `POST`
- **CA-3** (RF-3) — Dado edición, Entonces `PUT /assigned-services/{id}`; borrado → `DELETE /assigned-services/{id}`
- **CA-4** (RF-4) — Dado detalle de ruta, Cuando «Asignar servicio», Entonces el formulario llega con jornada/ruta precargadas
- **CA-5** (RF-5) — Dado una fila, Cuando «Ver en mapa», Entonces abre `app.maps.assigned` con su ruta
- **CA-6** (RF-6) — Dado una asignación, Cuando cambio el estado a `EN_SERVICIO`, Entonces `PUT` con `state` y la fila muestra el estado y `routeName`
- **CA-7** (RF-2) — Dado la fecha 17/11/2026 elegida en el calendario, Entonces `executionDate` = '2026-11-17' (sin hora ni zona)

## 6. Diseño y restricciones técnicas

Crear `assigned_services.api.js`. Modificar controllers/vistas. Eliminar `assignedservices_http.js`.

**Pantallas y flujos.** Listado → nuevo/editar → guardar; desde ruta → nuevo precargado. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.assignedServices.list/add/edit` | `pages/assigned_services/*` | tenant_admin, super_admin, agent | Listado reparado |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-008 CA-1]` en `tests/unit/assigned-services/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-008 CA-1]` en `tests/integration/assigned-services/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-008 CA-1]` en `tests/e2e/assigned-services.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-008 CA-2]` en `tests/unit/assigned-services/` |
| T-5 | CA-2 | e2e | Prueba `[MAE-008 CA-2]` en `tests/e2e/assigned-services.e2e.mjs` |
| T-6 | CA-3 | unitaria | Prueba `[MAE-008 CA-3]` en `tests/unit/assigned-services/` |
| T-7 | CA-3 | contrato | Prueba `[MAE-008 CA-3]` en `tests/integration/assigned-services/` |
| T-8 | CA-4 | e2e | Prueba `[MAE-008 CA-4]` en `tests/e2e/assigned-services.e2e.mjs` |
| T-9 | CA-5 | e2e | Prueba `[MAE-008 CA-5]` en `tests/e2e/assigned-services.e2e.mjs` |
| T-10 | CA-6 | unitaria | Prueba `[MAE-008 CA-6]` en `tests/unit/assigned-services/` |
| T-11 | CA-6 | contrato | Prueba `[MAE-008 CA-6]` en `tests/integration/assigned-services/` |
| T-12 | CA-7 | unitaria | Prueba `[MAE-008 CA-7]` en `tests/unit/assigned-services/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-002, MAE-003.
- Riesgos: Campos exactos del recurso (fixture).
- Pregunta no bloqueante: Campos del recurso → Decisión propuesta: Resuelta (migration-guide §10)

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-008/...` |
| CA-2 | | | `evidencia/MAE-008/...` |
| CA-3 | | | `evidencia/MAE-008/...` |
| CA-4 | | | `evidencia/MAE-008/...` |
| CA-5 | | | `evidencia/MAE-008/...` |
| CA-6 | | | `evidencia/MAE-008/...` |
| CA-7 | | | `evidencia/MAE-008/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §10, 16.1); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (retirada: el backend eliminó `/api/v1/assigned-services` (404). El vehículo del conductor es el recurso con `driverId` (MAE-002); sus rutas, la app móvil) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
