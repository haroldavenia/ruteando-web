# PAQ-001: Configuraciones de planificación → settings

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f3-paquetes` |
| Clave anterior | F3-01 · `SETTINGS` |
| Depende de | MAE-001, MAE-002, MAE-005, MAE-006 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-settings` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /settings`, `GET /settings/{id}`, `POST /settings`, `PUT /settings/{id}`, `DELETE /settings/{id}`, `POST /settings/batch-delete` |
| Maqueta | `docs/ui/maquetas/index.html#paq-001` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Migrar las configuraciones de ruteo al nuevo modelo (topología, tipo de restricción, depósitos de salida/llegada, recursos, turno, estancia, evaluaciones) sustituyendo los formularios dinámicos de `server/partials`.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado con búsqueda de texto, selección múltiple, paginación en cliente (10/página) | `settings_controller.js` | Cambia: paginación de servidor + búsqueda en cliente sobre la página o `listAll` |
| L2 | Borrar uno con confirmación ngDialog | `settings_controller.js` | Se mantiene: `DELETE /{id}` |
| L3 | Borrar seleccionados (`DELETE ?ids=`) | `settings_http.js` | Cambia: una petición `POST /settings/batch-delete` (lotes de 100) con informe «Se eliminaron X de N» |
| L4 | Ir a crear / editar | `settings_controller.js` | Se mantiene |
| L5 | Formulario crear/editar con cancelar | `settings_form_controller.js` | Se mantiene con nuevos campos |
| L6 | Recuperación de token con `resincTknRefresh` en la carga | `settings_controller.js` | Se retira (interceptor ACC-001) |
| L7 | Formulario dinámico cargado de `server/partials/*.json` vía `PartialLoader` | `settings_services.js` | Cambia: formulario Jade estático por secciones |
| L8 | Campos initTime, finishTime, roadRestrictionType (TIME/RESOURCE_TIME/FIXED_ROUTES), fixedRoutes, backToStartPoint, typeLengthOfStay, lengthOfStay, evaluateWeight/Volume/RestrictionPackage/ItineraryZone, settingResource[{typeVehicle,quantity}] | `settings_form_controller.js` | Cambia: `description, routeTopology, restrictionType, fixedRoutes, placeStartId, placeEndId, resourceIds, shiftStartUtc, shiftDurationSec, breakDurationSec, globalShiftActive, globalBreakActive, typeLengthOfStay, lengthOfStay, evaluateWeight, evaluateVolume, evaluateItineraryZone, active` |
| L9 | Recursos por tipo y cantidad (`settingResource`) | `settings_form_controller.js `evaluateVehicleType`` | Cambia: selección de vehículos (`resourceIds`); la cantidad vive en el recurso |
| L10 | `backToStartPoint` | `settings form` | Cambia: `routeTopology` (`round_trip` / ida) |
| L11 | Crear tipo de vehículo desde configuración | `settings_form_controller.js `add`` | Cambia: crear vehículo/lugar desde configuración (returnTo) |
| L12 | `roadRestrictionType` TIME / RESOURCE_TIME / FIXED_ROUTES | `settings_form_controller.js` | Cambia: `time_windows` / `resource_vs_time` / `fixed_routes` (migration-guide §16.2) |
| L13 | `backToStartPoint` true/false | `settings_form_controller.js` | Cambia: `routeTopology` `round_trip` / `open_delivery` (además `depot_to_depot`, `open_pickup`, `flexible`) |
| L14 | `initTime`, `finishTime` | `settings_form_controller.js` | Cambia: `shiftStartUtc` + `shiftDurationSec` (duración, no hora de fin) |
| L15 | `evaluateRestrictionPackage` | `settings_form_controller.js` | Se retira: los límites viven en `resourceType.restriction` |
| L16 | `typeLengthOfStay = DEFINE_ITINERARY` | `settings_form_controller.js` | Cambia: `define_itinerary`; la estadía por parada va en `package.durationStay` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/settings` | `?page&size` / `?active=true` | Page<Settings> con `placeStart`, `placeEnd`, `resources` | 401 | `get__settings.json` |
| GET | `/api/v1/settings/{id}` | — | Settings | 404 | `get__settings__id.json` |
| POST | `/api/v1/settings` | `{description,routeTopology,restrictionType,placeStartId,placeEndId,evaluateWeight,evaluateVolume,evaluateItineraryZone,fixedRoutes,lengthOfStay,typeLengthOfStay,shiftStartUtc,shiftDurationSec,breakDurationSec,resourceIds}` | 201 + `placeStart`,`placeEnd`,`resources`,`globalShiftActive`,`globalBreakActive` | 400 VALIDATION_ERROR | `post__settings.json` |
| PUT | `/api/v1/settings/{id}` | registro sin campos de solo lectura | 200 | 400,404 | `put__settings__id.json` |
| DELETE | `/api/v1/settings/{id}` | — | 204 (desactiva) | 404, 409 en uso | `delete__settings__id.json` |
| POST | `/api/v1/settings/batch-delete` | `{ids}` (máx. 100) | 200 `{results:[{id,status:deleted\|not_found\|conflict,error?}]}`; `error` = el 409 (`CONFLICT`, `details.referencedBy`, `details.ids`) | 422 si hay más de 100 ids (no borra ninguno) | — (capturar con `capture-fixture`) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador u operador, quiero configurar cómo se planifican las rutas, para que el algoritmo use la flota, el turno y las restricciones correctas.

## 3. Alcance

**Incluye**

- Listado con filtro activos, alta/edición por secciones según `restrictionType`, desactivar (DELETE), resumen «Así quedará».

**Excluye (no tocar)**

- Planificación (JOR-001).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/settings_form.jade`
- `master/js/custom/settings/settings_controller.js`
- `master/js/custom/settings/settings_form_controller.js`
- `master/js/custom/settings/settings_services.js`
- `master/js/modules/config.js`
- `master/js/modules/services/settings.api.js`
- `master/js/modules/services/settings_http.js`
- `master/js/modules/services/settings_services.js`
- `server/partials/settings_*.json`
- `server/sidebar-menu.json`
- `tests/api/settings.api.test.mjs`
- `tests/e2e/settings.e2e.mjs`
- `tests/integration/settings/**`
- `tests/unit/settings/**`
- `specs/migracion-api-v1/f3-paquetes/evidencia/PAQ-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar configuraciones con filtro activas
- **RF-2** — Crear configuración mostrando solo las secciones aplicables al tipo de restricción
- **RF-3** — Editar sin perder campos no visibles
- **RF-4** — Desactivar una o varias
- **RF-5** — Seleccionar depósito de salida y llegada (por defecto, el de salida)
- **RF-6** — Seleccionar vehículos
- **RF-7** — Convertir turno local ↔ UTC y duraciones minutos ↔ segundos
- **RF-8** — Mostrar resumen legible de la configuración
- **RF-9** — Convertir una configuración legacy al modelo nuevo con el diccionario de migration-guide §16.2 (para registros migrados y ayuda en pantalla)

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado filtro activas, Entonces `GET /settings?active=true&page=0&size=20`
- **CA-2** (RF-2) — Dado `fixed_routes`, Entonces se ve `fixedRoutes` (≥1) y se ocultan/deshabilitan turno; dado `resource_vs_time`, Entonces turno visible y `fixedRoutes` no se envía
- **CA-3** (RF-2) — Dado alta válida, Entonces `POST /settings` con claves ⊆ fixture
- **CA-4** (RF-3) — Dado edición, Entonces `PUT` sin `id, tenantId, createdAt, updatedAt, createdBy, placeStart, placeEnd, resources`
- **CA-5** (RF-4) — Dado desactivar en uso (409), Entonces mensaje específico
- **CA-6** (RF-5) — Dado sin llegada, Entonces `placeEndId = placeStartId`
- **CA-7** (RF-6) — Dado sin vehículos, Entonces enlace «Crear vehículo» con returnTo
- **CA-8** (RF-7) — Dado 08:00 y 9 h en Bogotá, Entonces `shiftStartUtc` '…T13:00:00Z' y `shiftDurationSec` 32400
- **CA-9** (RF-8) — Dado una configuración, Entonces el resumen dice tipo, topología, depósitos, nº vehículos y turno
- **CA-10** (RF-9) — Dado `{roadRestrictionType:'RESOURCE_TIME', backToStartPoint:false, initTime:'08:00', finishTime:'17:00'}`, Cuando aplico el diccionario, Entonces `{restrictionType:'resource_vs_time', routeTopology:'open_delivery', shiftDurationSec:32400}`
- **CA-11** (RF-4) — Dado desactivar una configuración usada por una jornada (409 `referencedBy:'journeys'`), Entonces «La usan N jornadas»
- **CA-12** (RF-4) — Dado 3 seleccionados con un resultado `conflict` (`details.referencedBy`), Cuando confirmo, Entonces una sola petición `POST /settings/batch-delete {ids:[…3]}`, aviso «Se eliminaron 2 de 3» y el detalle del que está en uso; un `not_found` cuenta como ya eliminado
- **CA-13** (RF-4) — Dado 150 seleccionados, Entonces `ApiClient.batchDelete` envía 2 peticiones (100 y 50) y muestra un único informe; nunca se envía un lote de más de 100 (evita el 422)

## 6. Diseño y restricciones técnicas

Crear `settings.api.js`, `settings_form.jade` estático. Modificar settings controllers. Eliminar `settings_http.js`, `settings_services.js`, `server/partials/settings_*.json` (y su ruta en server.js).

**Pantallas y flujos.** Formulario por pasos: general → depósitos → vehículos → restricciones/turno → estancia → resumen. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.settings.list/add/edit` | `pages/settings/*` | tenant_admin, super_admin, agent | Formulario estático por secciones (sustituye partials) |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[PAQ-001 CA-1]` en `tests/unit/settings/` |
| T-2 | CA-1 | contrato | Prueba `[PAQ-001 CA-1]` en `tests/integration/settings/` |
| T-3 | CA-1 | e2e | Prueba `[PAQ-001 CA-1]` en `tests/e2e/settings.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[PAQ-001 CA-2]` en `tests/unit/settings/` |
| T-5 | CA-3 | unitaria | Prueba `[PAQ-001 CA-3]` en `tests/unit/settings/` |
| T-6 | CA-3 | contrato | Prueba `[PAQ-001 CA-3]` en `tests/integration/settings/` |
| T-7 | CA-3 | e2e | Prueba `[PAQ-001 CA-3]` en `tests/e2e/settings.e2e.mjs` |
| T-8 | CA-4 | unitaria | Prueba `[PAQ-001 CA-4]` en `tests/unit/settings/` |
| T-9 | CA-4 | contrato | Prueba `[PAQ-001 CA-4]` en `tests/integration/settings/` |
| T-10 | CA-5 | unitaria | Prueba `[PAQ-001 CA-5]` en `tests/unit/settings/` |
| T-11 | CA-6 | unitaria | Prueba `[PAQ-001 CA-6]` en `tests/unit/settings/` |
| T-12 | CA-7 | e2e | Prueba `[PAQ-001 CA-7]` en `tests/e2e/settings.e2e.mjs` |
| T-13 | CA-8 | unitaria | Prueba `[PAQ-001 CA-8]` en `tests/unit/settings/` |
| T-14 | CA-9 | unitaria | Prueba `[PAQ-001 CA-9]` en `tests/unit/settings/` |
| T-15 | CA-10 | unitaria | Prueba `[PAQ-001 CA-10]` en `tests/unit/settings/` |
| T-16 | CA-11 | unitaria | Prueba `[PAQ-001 CA-11]` en `tests/unit/settings/` |
| T-17 | CA-12 | unitaria | Prueba `[PAQ-001 CA-12]` en `tests/unit/settings/` |
| T-18 | CA-12 | contrato | Prueba `[PAQ-001 CA-12]` en `tests/integration/settings/` |
| T-19 | CA-12 | e2e | Prueba `[PAQ-001 CA-12]` en `tests/e2e/settings.e2e.mjs` |
| T-20 | CA-13 | unitaria | Prueba `[PAQ-001 CA-13]` en `tests/unit/settings/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-001, MAE-002, MAE-005, MAE-006.
- Riesgos: Exigencias de cada restricción sin documentar.
- Pregunta no bloqueante: Valores de `restrictionType` y `routeTopology` → Decisión propuesta: Resuelta (§7)
- Pregunta no bloqueante: Unidad de `lengthOfStay` → Decisión propuesta: Resuelta: segundos

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/PAQ-001/...` |
| CA-2 | | | `evidencia/PAQ-001/...` |
| CA-3 | | | `evidencia/PAQ-001/...` |
| CA-4 | | | `evidencia/PAQ-001/...` |
| CA-5 | | | `evidencia/PAQ-001/...` |
| CA-6 | | | `evidencia/PAQ-001/...` |
| CA-7 | | | `evidencia/PAQ-001/...` |
| CA-8 | | | `evidencia/PAQ-001/...` |
| CA-9 | | | `evidencia/PAQ-001/...` |
| CA-10 | | | `evidencia/PAQ-001/...` |
| CA-11 | | | `evidencia/PAQ-001/...` |
| CA-12 | | | `evidencia/PAQ-001/...` |
| CA-13 | | | `evidencia/PAQ-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §7, 16.2); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D2, D3, B8) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Borrado por lote con `POST /settings/batch-delete` (M1): un resultado por id; sustituye los N `DELETE` | migration-guide §7 (M1) y endpoints.md | pendiente |
