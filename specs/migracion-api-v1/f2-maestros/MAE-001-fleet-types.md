# MAE-001: Tipos de vehículo → resource-types

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-01 · `FLEET-TYPES` |
| Depende de | ACC-005, FND-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-fleet-types` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /resource-types`, `GET /resource-types/{id}`, `POST /resource-types`, `PUT /resource-types/{id}`, `DELETE /resource-types/{id}`, `POST /resource-types/batch-delete` |
| Maqueta | `docs/ui/maquetas/index.html#mae-001` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Migrar el CRUD de tipos de vehículo de `/typevehicle` a `/resource-types`, con capacidad, medidas, restricciones, categoría, perfil OSRM y consumo.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado con búsqueda de texto, selección múltiple, paginación en cliente (10/página) | `vehicle_types_controller.js` | Cambia: paginación de servidor + búsqueda en cliente sobre la página o `listAll` |
| L2 | Borrar uno con confirmación ngDialog | `vehicle_types_controller.js` | Se mantiene: `DELETE /{id}` |
| L3 | Borrar seleccionados (`DELETE ?ids=`) | `vehicletypes_http.js` | Cambia: una petición `POST /resource-types/batch-delete` (lotes de 100) con informe «Se eliminaron X de N» |
| L4 | Ir a crear / editar | `vehicle_types_controller.js` | Se mantiene |
| L5 | Formulario crear/editar con cancelar | `vehicle_type_controller.js` | Se mantiene con nuevos campos |
| L6 | Recuperación de token con `resincTknRefresh` en la carga | `vehicle_types_controller.js` | Se retira (interceptor ACC-001) |
| L7 | Exportar listado a PDF | `vehicle_types_controller.js `exportPDf`` | Se mantiene con nuevos campos |
| L8 | Campos: name, capability, weight, volume, measure.{width,height,depth}, restriction.{min,max}{Weight,Volume} | `vehicle_types/form.jade` | Cambia: `weight/volume` → `capacity{weight,volume}`; `restriction` se conserva; nuevos obligatorios `category` (≤50) y `name` (≤100); `osrmProfile`, `gasMileage`; `capability` se retira |
| L9 | Volumen calculado por medidas y validaciones min<max | `vehicle_type_controller.js` | Se mantiene |
| L10 | Volver al formulario de vehículo/configuración tras crear tipo (`returnTo`) | `vehicle_type_controller.js` | Se mantiene |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/resource-types` | `?page&size&active=true` | Page<ResourceType> | 401,403 | `get__resource-types.json` |
| GET | `/api/v1/resource-types/{id}` | — | ResourceType | 400,404 | `get__resource-types__id.json` |
| POST | `/api/v1/resource-types` | `{category*,name*,osrmProfile,capacity{weight,volume},measure{height,width,depth},restriction{minWeight,maxWeight,minVolume,maxVolume},gasMileage}` | 201 ResourceType | 400 VALIDATION_ERROR,409 | `post__resource-types.json` |
| PUT | `/api/v1/resource-types/{id}` | igual que POST | ResourceType | 400,404,409 | `put__resource-types__id.json` |
| DELETE | `/api/v1/resource-types/{id}` | — | 204 (isActive=false) | 404, 400/409 en uso | `delete__resource-types__id.json` |
| POST | `/api/v1/resource-types/batch-delete` | `{ids}` (máx. 100) | 200 `{results:[{id,status:deleted\|not_found\|conflict,error?}]}`; `error` = el 409 (`CONFLICT`, `details.referencedBy`, `details.ids`) | 422 si hay más de 100 ids (no borra ninguno) | — (capturar con `capture-fixture`) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador u operador, quiero gestionar los tipos de vehículo con su capacidad y restricciones, para que el planificador respete lo que carga cada vehículo.

## 3. Alcance

**Incluye**

- Listado paginado con filtro activos, alta/edición (nombre, categoría, perfil OSRM, capacidad peso/volumen, medidas ancho/alto/fondo con volumen calculado, restricciones min/max, consumo), borrado (soft) individual y por lote, exportar PDF (existente).

**Excluye (no tocar)**

- Vehículos (MAE-002).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/vehicle_types/vehicle_type_controller.js`
- `master/js/custom/vehicle_types/vehicle_types_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/resource_types.api.js`
- `master/js/modules/services/vehicletypes_http.js`
- `server/sidebar-menu.json`
- `tests/api/fleet-types.api.test.mjs`
- `tests/e2e/fleet-types.e2e.mjs`
- `tests/integration/fleet-types/**`
- `tests/unit/fleet-types/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar tipos con paginación de servidor y filtro «solo activos»
- **RF-2** — Crear tipo con validaciones de capacidad y restricciones
- **RF-3** — Editar tipo conservando campos no editados
- **RF-4** — Desactivar uno o varios tipos con informe de resultado
- **RF-5** — Exportar el listado a PDF
- **RF-6** — Volver al flujo de origen (vehículo o configuración) con el tipo creado seleccionado
- **RF-7** — Elegir categoría y perfil OSRM de los dominios maestros

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado la lista, Cuando cargo, Entonces `GET /resource-types?page=0&size=20` y la tabla muestra nombre, categoría, capacidad y estado
- **CA-2** (RF-1) — Dado el filtro «solo activos», Entonces la petición añade `active=true`
- **CA-3** (RF-2) — Dado el formulario válido, Cuando guardo, Entonces `POST /resource-types` con `toRequest` igual en claves a `post__resource-types.json` y vuelve al listado
- **CA-4** (RF-2) — Dado minWeight > maxWeight, Entonces no se envía y se marca el error
- **CA-5** (RF-3) — Dado un tipo cargado, Cuando cambio el nombre, Entonces `PUT` reenvía capacity/measure/restriction sin cambios
- **CA-6** (RF-4) — Dado 3 seleccionados y uno en uso (409 `CONFLICT` con `details.referencedBy:'resources'`), Cuando borro, Entonces `POST /resource-types/batch-delete`, aviso «Se desactivaron 2 de 3» y «En uso por N vehículos»
- **CA-7** (RF-5) — Dado la lista, Cuando exporto PDF, Entonces el documento incluye las columnas nuevas
- **CA-8** (RF-6) — Dado que vengo de «nuevo vehículo» y creo un tipo, Entonces vuelvo al vehículo con el tipo seleccionado y el borrador intacto
- **CA-9** (RF-7) — Dado los dominios, Entonces el selector de perfil muestra `driving`, `cycling`, `walking` (activos)
- **CA-10** (RF-1) — Dado backend real, Cuando la sonda crea, lee, edita y borra `sdd-test-type`, Entonces las formas coinciden con los fixtures
- **CA-11** (RF-2) — Dado capacidad 2 500 kg y 12 m³ en el formulario, Entonces se envía `capacity {weight:2500000, volume:12000000}` y medidas en cm
- **CA-12** (RF-4) — Dado 3 seleccionados con un resultado `conflict` (`details.referencedBy`), Cuando confirmo, Entonces una sola petición `POST /resource-types/batch-delete {ids:[…3]}`, aviso «Se eliminaron 2 de 3» y el detalle del que está en uso; un `not_found` cuenta como ya eliminado
- **CA-13** (RF-4) — Dado 150 seleccionados, Entonces `ApiClient.batchDelete` envía 2 peticiones (100 y 50) y muestra un único informe; nunca se envía un lote de más de 100 (evita el 422)

## 6. Diseño y restricciones técnicas

Crear `modules/services/resource_types.api.js`. Modificar controladores y vistas de `vehicle_types`, i18n. Eliminar `vehicletypes_http.js`.

**Pantallas y flujos.** Listado → nuevo/editar → guardar → listado. Desde vehículo/configuración con `returnTo`. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.vehicleTypes.list/add/edit` | `pages/vehicle_types/*` | tenant_admin, super_admin, agent | Campos nuevos; borrado por lote con informe |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-001 CA-1]` en `tests/unit/fleet-types/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-001 CA-1]` en `tests/integration/fleet-types/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-001 CA-1]` en `tests/e2e/fleet-types.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-001 CA-2]` en `tests/unit/fleet-types/` |
| T-5 | CA-3 | unitaria | Prueba `[MAE-001 CA-3]` en `tests/unit/fleet-types/` |
| T-6 | CA-3 | contrato | Prueba `[MAE-001 CA-3]` en `tests/integration/fleet-types/` |
| T-7 | CA-3 | e2e | Prueba `[MAE-001 CA-3]` en `tests/e2e/fleet-types.e2e.mjs` |
| T-8 | CA-4 | unitaria | Prueba `[MAE-001 CA-4]` en `tests/unit/fleet-types/` |
| T-9 | CA-5 | unitaria | Prueba `[MAE-001 CA-5]` en `tests/unit/fleet-types/` |
| T-10 | CA-5 | contrato | Prueba `[MAE-001 CA-5]` en `tests/integration/fleet-types/` |
| T-11 | CA-6 | unitaria | Prueba `[MAE-001 CA-6]` en `tests/unit/fleet-types/` |
| T-12 | CA-6 | e2e | Prueba `[MAE-001 CA-6]` en `tests/e2e/fleet-types.e2e.mjs` |
| T-13 | CA-7 | unitaria | Prueba `[MAE-001 CA-7]` en `tests/unit/fleet-types/` |
| T-14 | CA-8 | e2e | Prueba `[MAE-001 CA-8]` en `tests/e2e/fleet-types.e2e.mjs` |
| T-15 | CA-9 | unitaria | Prueba `[MAE-001 CA-9]` en `tests/unit/fleet-types/` |
| T-16 | CA-10 | sonda API | Prueba `[MAE-001 CA-10]` en `tests/api/fleet-types.api.test.mjs` |
| T-17 | CA-11 | unitaria | Prueba `[MAE-001 CA-11]` en `tests/unit/fleet-types/` |
| T-18 | CA-11 | contrato | Prueba `[MAE-001 CA-11]` en `tests/integration/fleet-types/` |
| T-19 | CA-12 | unitaria | Prueba `[MAE-001 CA-12]` en `tests/unit/fleet-types/` |
| T-20 | CA-12 | contrato | Prueba `[MAE-001 CA-12]` en `tests/integration/fleet-types/` |
| T-21 | CA-12 | e2e | Prueba `[MAE-001 CA-12]` en `tests/e2e/fleet-types.e2e.mjs` |
| T-22 | CA-13 | unitaria | Prueba `[MAE-001 CA-13]` en `tests/unit/fleet-types/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-005, FND-003.
- Riesgos: El algoritmo compara números crudos: paquete y capacidad deben ir en la misma unidad (g/cm³).
- Pregunta no bloqueante: Unidades → Decisión propuesta: Resuelta (D4/E5): `capacity` y `restriction` en g y cm³, `measure` en cm; la pantalla muestra kg, m³ y m con `Units`

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-001/...` |
| CA-2 | | | `evidencia/MAE-001/...` |
| CA-3 | | | `evidencia/MAE-001/...` |
| CA-4 | | | `evidencia/MAE-001/...` |
| CA-5 | | | `evidencia/MAE-001/...` |
| CA-6 | | | `evidencia/MAE-001/...` |
| CA-7 | | | `evidencia/MAE-001/...` |
| CA-8 | | | `evidencia/MAE-001/...` |
| CA-9 | | | `evidencia/MAE-001/...` |
| CA-10 | | | `evidencia/MAE-001/...` |
| CA-11 | | | `evidencia/MAE-001/...` |
| CA-12 | | | `evidencia/MAE-001/...` |
| CA-13 | | | `evidencia/MAE-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §7, 16.1); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D2, D3, D4) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Borrado por lote con `POST /resource-types/batch-delete` (M1): un resultado por id; sustituye los N `DELETE` | migration-guide §7 (M1) y endpoints.md | pendiente |
