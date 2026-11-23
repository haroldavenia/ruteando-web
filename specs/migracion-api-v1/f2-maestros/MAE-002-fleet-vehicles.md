# MAE-002: Vehículos → resources y asignación de conductor

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-02 · `FLEET-VEHICLES` |
| Depende de | MAE-001, MAE-003, MAE-005 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-fleet-vehicles` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /resources`, `GET /resources/{id}`, `POST /resources`, `PUT /resources/{id}`, `DELETE /resources/{id}`, `PUT /resources/{id}/driver/{driverId}`, `DELETE /resources/{id}/driver` |
| Maqueta | `docs/ui/maquetas/index.html#mae-002` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Migrar vehículos a `resources` (tipo, depósito, turno, cantidad, placa, zonas permitidas) y añadir la asignación/desasignación de conductor como acción propia.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado con búsqueda de texto, selección múltiple, paginación en cliente (10/página) | `vehicles_controller.js` | Cambia: paginación de servidor + búsqueda en cliente sobre la página o `listAll` |
| L2 | Borrar uno con confirmación ngDialog | `vehicles_controller.js` | Se mantiene: `DELETE /{id}` |
| L3 | Borrar seleccionados (`DELETE ?ids=`) | `vehicles_http.js` | Cambia: N `DELETE` con informe «Se eliminaron X de N» |
| L4 | Ir a crear / editar | `vehicles_controller.js` | Se mantiene |
| L5 | Formulario crear/editar con cancelar | `vehicle_controller.js` | Se mantiene con nuevos campos |
| L6 | Recuperación de token con `resincTknRefresh` en la carga | `vehicles_controller.js` | Se retira (interceptor ACC-001) |
| L7 | Campos name, licencePlate, tipo (`setTypeResource`) | `vehicles/form.jade` | Cambia: `name, licensePlate, resourceTypeId, depotId, shiftStartUtc, shiftDurationSec, breakDurationSec, quantity, allowedZoneIds, allowedPackageTypes` |
| L8 | Botón «Crear tipo» desde el formulario | `vehicle_controller.js `add`` | Se mantiene (returnTo) |
| L9 | `VehicleService` inyectado sin uso | `vehicle_service.js` | Se retira |
| L10 | La asignación conductor↔vehículo se hacía en «servicios asignados» | `assigned_services_form_controller.js` | Cambia: acción «Asignar conductor» en el vehículo (`PUT /resources/{id}/driver/{driverId}`) |
| L11 | Servicios asignados: asignar conductor a vehículo (`POST /assignedservice`) y listado roto | `assigned_services/*` | Cambia: el backend retiró asignaciones; la asignación es `PUT /resources/{id}/driver/{driverId}` y el listado es la columna «Conductor» de vehículos |
| L12 | «Asignar servicio» desde el listado de rutas | `routes_controller.js `addService`` | Cambia: lleva a la ficha del vehículo de la ruta para asignar conductor |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/resources` | `?resourceTypeId&isActive&active&page&size` | Page<Resource> | 401 | `get__resources.json` |
| GET | `/api/v1/resources/{id}` | — | Resource | 404 | `get__resources__id.json` |
| POST | `/api/v1/resources` | `{resourceTypeId*,depotId*,shiftStartUtc*,shiftDurationSec*(≥1),breakDurationSec*(≥0),driverId,name,licensePlate,quantity,isDefault,allowedPackageTypes,allowedZoneIds}` | 201 con `resourceType{id,name,capacity,osrmProfile}` y `assignedUser{id,firstName,lastName,email}` | 400,409 | `post__resources.json` |
| PUT | `/api/v1/resources/{id}` | Resource | 200 | 400,404,409 | `put__resources__id.json` |
| DELETE | `/api/v1/resources/{id}` | — | 204 | 404 | `delete__resources__id.json` |
| PUT | `/api/v1/resources/{id}/driver/{driverId}` | — | Resource con `driverId` | 404, 409 | `put__resources__id__driver__driverId.json` |
| DELETE | `/api/v1/resources/{id}/driver` | — | Resource sin conductor | 404 | `delete__resources__id__driver.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador u operador, quiero gestionar vehículos y asignarles conductor, para planificar con la flota real de cada día.

## 3. Alcance

**Incluye**

- Listado con filtros por tipo y estado, alta/edición, borrado individual/lote, crear tipo desde el formulario, asignar y quitar conductor.

**Excluye (no tocar)**

- Seguimiento GPS (SEG-001).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/assign_driver_modal.jade`
- `master/js/custom/assigned_services/assigned_services_controller.js`
- `master/js/custom/assigned_services/assigned_services_form_controller.js`
- `master/js/custom/vehicles/vehicle_controller.js`
- `master/js/custom/vehicles/vehicles_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/assignedservices_http.js`
- `master/js/modules/services/resources.api.js`
- `master/js/modules/services/vehicle_service.js`
- `master/js/modules/services/vehicles_http.js`
- `server/sidebar-menu.json`
- `tests/api/fleet-vehicles.api.test.mjs`
- `tests/e2e/fleet-vehicles.e2e.mjs`
- `tests/integration/fleet-vehicles/**`
- `tests/unit/fleet-vehicles/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-002/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar vehículos con filtros por tipo y activo
- **RF-2** — Crear y editar vehículo con tipo, depósito (lugar tipo depot), turno en hora local y duraciones en minutos
- **RF-3** — Borrar uno o varios con informe
- **RF-4** — Crear un tipo desde el formulario y volver con el borrador
- **RF-5** — Asignar un conductor desde el listado o la ficha
- **RF-6** — Quitar el conductor asignado
- **RF-7** — Mostrar conductor asignado y tipo en el listado
- **RF-8** — Sustituir la pantalla de servicios asignados: filtrar vehículos con/sin conductor y redirigir los estados `app.assignedServices.*` a vehículos
- **RF-9** — Ordenar el listado en servidor por nombre o placa (`sort`)

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el filtro tipo=X, Entonces `GET /resources?resourceTypeId=X&page=0&size=20`
- **CA-2** (RF-2) — Dado turno 08:00 local (UTC-5) y 8 h, Cuando guardo, Entonces `shiftStartUtc` = '…T13:00:00Z' y `shiftDurationSec`=28800
- **CA-3** (RF-2) — Dado formulario válido, Cuando guardo, Entonces aparece en el listado
- **CA-4** (RF-3) — Dado 2 seleccionados, Entonces 2 `DELETE` e informe
- **CA-5** (RF-4) — Dado formulario a medias, Cuando «Crear tipo» y guardo el tipo, Entonces vuelvo con mis datos y el tipo nuevo
- **CA-6** (RF-5) — Dado un vehículo sin conductor, Cuando elijo un conductor de `/users/drivers` y confirmo, Entonces `PUT /resources/{id}/driver/{driverId}` y la fila muestra su nombre
- **CA-7** (RF-6) — Dado un vehículo con conductor, Cuando «Quitar conductor», Entonces `DELETE /resources/{id}/driver`
- **CA-8** (RF-5) — Dado 409 al asignar, Entonces mensaje «El conductor ya está asignado a otro vehículo»
- **CA-9** (RF-7) — Dado `get__resources.json`, Entonces la fila muestra `resourceType.name` y `assignedUser` o «Sin conductor»
- **CA-10** (RF-2) — Dado un alta sin depósito o sin turno, Entonces no se envía y se marcan `depotId`/`shiftStartUtc`/`shiftDurationSec` como obligatorios
- **CA-11** (RF-8) — Dado `#/app/assignedServices/list`, Entonces redirige a vehículos con el filtro «Con conductor»; el menú ya no muestra Asignaciones
- **CA-12** (RF-9) — Dado orden por placa, Entonces `GET /resources?sort=licensePlate,asc`

## 6. Diseño y restricciones técnicas

Crear `resources.api.js`, `assign_driver_modal.jade`. Modificar controladores/vistas vehicles. Eliminar `vehicles_http.js`, `vehicle_service.js`.

**Pantallas y flujos.** Listado → acción «Asignar conductor» (modal con selector) → confirmación. Formulario con sección Turno. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.vehicles.list/add/edit` | `pages/vehicles/*` | tenant_admin, super_admin, agent | Campos nuevos; acción asignar/quitar conductor (modal) |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-002 CA-1]` en `tests/unit/fleet-vehicles/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-002 CA-1]` en `tests/integration/fleet-vehicles/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-002 CA-1]` en `tests/e2e/fleet-vehicles.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-002 CA-2]` en `tests/unit/fleet-vehicles/` |
| T-5 | CA-2 | contrato | Prueba `[MAE-002 CA-2]` en `tests/integration/fleet-vehicles/` |
| T-6 | CA-3 | e2e | Prueba `[MAE-002 CA-3]` en `tests/e2e/fleet-vehicles.e2e.mjs` |
| T-7 | CA-4 | unitaria | Prueba `[MAE-002 CA-4]` en `tests/unit/fleet-vehicles/` |
| T-8 | CA-5 | e2e | Prueba `[MAE-002 CA-5]` en `tests/e2e/fleet-vehicles.e2e.mjs` |
| T-9 | CA-6 | unitaria | Prueba `[MAE-002 CA-6]` en `tests/unit/fleet-vehicles/` |
| T-10 | CA-6 | contrato | Prueba `[MAE-002 CA-6]` en `tests/integration/fleet-vehicles/` |
| T-11 | CA-6 | e2e | Prueba `[MAE-002 CA-6]` en `tests/e2e/fleet-vehicles.e2e.mjs` |
| T-12 | CA-7 | unitaria | Prueba `[MAE-002 CA-7]` en `tests/unit/fleet-vehicles/` |
| T-13 | CA-7 | e2e | Prueba `[MAE-002 CA-7]` en `tests/e2e/fleet-vehicles.e2e.mjs` |
| T-14 | CA-8 | unitaria | Prueba `[MAE-002 CA-8]` en `tests/unit/fleet-vehicles/` |
| T-15 | CA-9 | unitaria | Prueba `[MAE-002 CA-9]` en `tests/unit/fleet-vehicles/` |
| T-16 | CA-9 | contrato | Prueba `[MAE-002 CA-9]` en `tests/integration/fleet-vehicles/` |
| T-17 | CA-10 | unitaria | Prueba `[MAE-002 CA-10]` en `tests/unit/fleet-vehicles/` |
| T-18 | CA-11 | e2e | Prueba `[MAE-002 CA-11]` en `tests/e2e/fleet-vehicles.e2e.mjs` |
| T-19 | CA-12 | unitaria | Prueba `[MAE-002 CA-12]` en `tests/unit/fleet-vehicles/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-001, MAE-003, MAE-005.
- Riesgos: PUT parcial (G4).
- Pregunta no bloqueante: ¿Asignar conductor en el alta o después? → Decisión propuesta: Ambas: `driverId` en el cuerpo o `PUT /resources/{id}/driver/{driverId}`

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-002/...` |
| CA-2 | | | `evidencia/MAE-002/...` |
| CA-3 | | | `evidencia/MAE-002/...` |
| CA-4 | | | `evidencia/MAE-002/...` |
| CA-5 | | | `evidencia/MAE-002/...` |
| CA-6 | | | `evidencia/MAE-002/...` |
| CA-7 | | | `evidencia/MAE-002/...` |
| CA-8 | | | `evidencia/MAE-002/...` |
| CA-9 | | | `evidencia/MAE-002/...` |
| CA-10 | | | `evidencia/MAE-002/...` |
| CA-11 | | | `evidencia/MAE-002/...` |
| CA-12 | | | `evidencia/MAE-002/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §7, 16.1); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (retiro de asignaciones, D2, B8) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
