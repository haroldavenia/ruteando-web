# JOR-003: Detalle de jornada, rutas, mapa y línea de tiempo

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f4-jornadas` |
| Clave anterior | F4-03 · `JOURNEY-DETAIL` |
| Depende de | JOR-002, FND-004 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-journey-detail` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /journeys/{id}` |
| Maqueta | `docs/ui/maquetas/index.html#jor-003` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Unificar `app.routes.*`, `app.journeys.detail`, `app.maps.route/journey` y el mapa de línea de tiempo sobre el detalle de jornada con rutas embebidas.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Lista de rutas de la jornada con buscar/paginar/seleccionar | `routes_controller.js` | Cambia: tarjetas de ruta desde `journey.routes` |
| L2 | Mostrar rutas en mapa (`showRoutesInMap`), ir al mapa de una ruta | `routes_controller.js; route_tab_controller.js` | Cambia: mapa en el detalle con selección de ruta |
| L3 | Detalle de ruta con exportar PDF y volver | `route_detail_controller.js` | Cambia: `app.journeys.route({id,routeIndex})` |
| L4 | Pestañas de rutas abiertas (`route_tab_service`) | `route_tab_controller.js` | Cambia: selección de ruta en el mapa y en la tabla |
| L5 | `info`, `share` de una ruta | `routes_controller.js` | Se mantiene: info = ficha; compartir = copiar enlace del estado |
| L6 | `listVists` → visitas de la ruta | `routes_controller.js` | Cambia: JOR-006 |
| L7 | `addService` → asignar servicio | `routes_controller.js` | Se mantiene (MAE-008) |
| L8 | `GET /routes` en visitas | `routes_http.js` | Se retira: rutas embebidas |
| L9 | Línea de tiempo en mapa | `map_timeline_controller.js` | Se mantiene con `arrivalUtc/departureUtc` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/journeys/{id}` | — | JourneyDetail con `routes[].waypoints`, `resourceSummary`, `stats` | 400 id mal formado,404 | `get__journeys__id.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero ver una jornada con sus rutas, paradas y mapa, para entender y despachar el plan del día.

## 3. Alcance

**Incluye**

- Cabecera (configuración, estado, servicios, recursos, zonas, tiempos min/prom/max), tarjetas de ruta (vehículo, distancia, duración, uso de peso/volumen, coste, nº paradas), resumen de recursos, paquetes no asignados (`invalidPackageIds`, `badPackageIds`), mapa con todas las rutas por color y paradas numeradas, detalle de ruta con paradas (hora llegada/salida, acumulados) y línea de tiempo, compartir/info, asignar servicio.

**Excluye (no tocar)**

- Métricas y navegación (JOR-004), exportaciones (JOR-005), visitas (JOR-006).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/journeys/journey_detail_controller.js`
- `master/js/custom/maps/map_gen_latlong_controller.js`
- `master/js/custom/maps/map_timeline_controller.js`
- `master/js/custom/routes/route_detail_controller.js`
- `master/js/custom/routes/route_tab_controller.js`
- `master/js/custom/routes/route_tab_service.js`
- `master/js/custom/routes/routes_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/journey_detail_controller.js`
- `master/js/modules/services/journey_route_controller.js`
- `master/js/modules/services/route_detail_controller.js`
- `master/js/modules/services/routes_controller.js`
- `master/js/modules/services/routes_http.js`
- `server/sidebar-menu.json`
- `tests/api/journey-detail.api.test.mjs`
- `tests/e2e/journey-detail.e2e.mjs`
- `tests/integration/journey-detail/**`
- `tests/unit/journey-detail/**`
- `specs/migracion-api-v1/f4-jornadas/evidencia/JOR-003/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Mostrar la cabecera y estadísticas de la jornada
- **RF-2** — Mostrar cada ruta con vehículo, métricas y uso de capacidad
- **RF-3** — Listar paquetes no asignados de la jornada y de cada ruta
- **RF-4** — Pintar todas las rutas en el mapa con color por ruta y paradas numeradas; resaltar la seleccionada
- **RF-5** — Mostrar el detalle de una ruta con sus paradas, horas locales y acumulados
- **RF-6** — Mostrar la línea de tiempo de la ruta
- **RF-7** — Compartir el enlace a la ruta y asignar servicio desde ella
- **RF-8** — Manejar jornada inexistente o id inválido

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `get__journeys__id.json`, Entonces la cabecera muestra configuración, estado, total servicios/recursos/zonas y tiempos en h:mm
- **CA-2** (RF-2) — Dado una ruta, Entonces distancia en km, duración h:mm, uso de peso y volumen en % y vehículo con placa
- **CA-3** (RF-3) — Dado `invalidPackageIds` no vacío, Entonces sección «Paquetes no asignados» con guía/dirección (no se oculta)
- **CA-4** (RF-4) — Dado 3 rutas, Entonces 3 líneas de distinto color decodificadas de `geoJson` y paradas `ruta·orden`; al elegir una se resalta
- **CA-5** (RF-5) — Dado `#/app/journeys/{id}/routes/0`, Entonces tabla de paradas con tipo (`StopType`), hora llegada/salida local y acumulados
- **CA-6** (RF-6) — Dado el detalle de ruta, Entonces la línea de tiempo muestra las paradas en orden
- **CA-7** (RF-7) — Dado «Asignar servicio», Entonces formulario de MAE-008 precargado
- **CA-8** (RF-8) — Dado 404, Entonces «La jornada ya no existe» y volver; 400, Entonces «Identificador no válido»
- **CA-9** (RF-5) — Dado paradas `delivery`/`pickup` (o `service` en jornadas antiguas), Entonces se etiquetan con `StopType` y muestran guía desde `packageInfo.trackingCode` y la dirección; `placeId` solo en `depot`

## 6. Diseño y restricciones técnicas

Crear `journey_detail_controller.js` (reescrito), `journey_route_controller.js`, `routes_map` directiva OL3. Eliminar `routes_controller.js`, `route_detail_controller.js`, `route_tab_*`, `routes_http.js`.

**Pantallas y flujos.** Listado → detalle (mapa + tarjetas) → ruta (paradas + línea de tiempo) → visitas/asignar/exportar. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.routes.* y app.maps.route/journey → app.journeys.detail y app.journeys.route (nuevo)` | `pages/journeys/detail.jade, route.jade` | tenant_admin, super_admin, agent | Unificación; estados antiguos redirigen |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[JOR-003 CA-1]` en `tests/unit/journey-detail/` |
| T-2 | CA-1 | contrato | Prueba `[JOR-003 CA-1]` en `tests/integration/journey-detail/` |
| T-3 | CA-1 | e2e | Prueba `[JOR-003 CA-1]` en `tests/e2e/journey-detail.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[JOR-003 CA-2]` en `tests/unit/journey-detail/` |
| T-5 | CA-2 | contrato | Prueba `[JOR-003 CA-2]` en `tests/integration/journey-detail/` |
| T-6 | CA-3 | unitaria | Prueba `[JOR-003 CA-3]` en `tests/unit/journey-detail/` |
| T-7 | CA-3 | e2e | Prueba `[JOR-003 CA-3]` en `tests/e2e/journey-detail.e2e.mjs` |
| T-8 | CA-4 | e2e | Prueba `[JOR-003 CA-4]` en `tests/e2e/journey-detail.e2e.mjs` |
| T-9 | CA-5 | unitaria | Prueba `[JOR-003 CA-5]` en `tests/unit/journey-detail/` |
| T-10 | CA-5 | e2e | Prueba `[JOR-003 CA-5]` en `tests/e2e/journey-detail.e2e.mjs` |
| T-11 | CA-6 | e2e | Prueba `[JOR-003 CA-6]` en `tests/e2e/journey-detail.e2e.mjs` |
| T-12 | CA-7 | e2e | Prueba `[JOR-003 CA-7]` en `tests/e2e/journey-detail.e2e.mjs` |
| T-13 | CA-8 | unitaria | Prueba `[JOR-003 CA-8]` en `tests/unit/journey-detail/` |
| T-14 | CA-9 | unitaria | Prueba `[JOR-003 CA-9]` en `tests/unit/journey-detail/` |
| T-15 | CA-9 | contrato | Prueba `[JOR-003 CA-9]` en `tests/integration/journey-detail/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: JOR-002, FND-004.
- Riesgos: Rendimiento con jornadas grandes.
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/JOR-003/...` |
| CA-2 | | | `evidencia/JOR-003/...` |
| CA-3 | | | `evidencia/JOR-003/...` |
| CA-4 | | | `evidencia/JOR-003/...` |
| CA-5 | | | `evidencia/JOR-003/...` |
| CA-6 | | | `evidencia/JOR-003/...` |
| CA-7 | | | `evidencia/JOR-003/...` |
| CA-8 | | | `evidencia/JOR-003/...` |
| CA-9 | | | `evidencia/JOR-003/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B3) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
