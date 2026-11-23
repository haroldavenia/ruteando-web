# JOR-004: KPI de jornada y navegación turn-by-turn

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f4-jornadas` |
| Clave anterior | F4-04 · `JOURNEY-METRICS-NAV` |
| Depende de | JOR-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-journey-metrics-nav` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /journeys/{journeyId}/metrics`, `GET /journeys/{journeyId}/navigations`, `GET /journeys/{journeyId}/navigations/{routeIndex}` |
| Maqueta | `docs/ui/maquetas/index.html#jor-004` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Sustituir la gráfica rota (`getChartData` inexistente) por el panel de KPI de la jornada y añadir la vista de navegación por ruta para despacho.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Gráfica de jornadas `getChartData()` inexistente | `journeys_chart_controller.js` | Cambia: KPI de `/metrics` |
| L2 | Estado `app.journeys.chart` | `config.js:179` | Cambia: `app.journeys.metrics({id})` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/journeys/{journeyId}/metrics` | — | `{distance,efficiency,weightAccum,volumeAccum,avgAttendWeightPct,avgAttendVolumePct,attendServicesPct,attendedRoutes,attendedServices,totalServices,usedResources,totalResources,attendedCustomers}` | 404 | `get__journeys__journeyId__metrics.json` |
| GET | `/api/v1/journeys/{journeyId}/navigations` | — | `RouteNavigation[]` `{routeIndex,osrmVersion:'v4'\|'v5',instructionsLegacy,viaPointsLegacy,legs[{distance,duration,summary,steps[{maneuver{type,modifier,location},name,distance,duration}]}]}` | 404 | `get__journeys__journeyId__navigations.json` |
| GET | `/api/v1/journeys/{journeyId}/navigations/{routeIndex}` | — | Navegación de una ruta | 404 | `get__journeys__journeyId__navigations__routeIndex.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador o administrador, quiero ver indicadores y la navegación paso a paso de cada ruta, para evaluar la jornada y orientar al conductor.

## 3. Alcance

**Incluye**

- Tarjetas KPI (distancia, eficiencia, servicios atendidos/total y %, rutas atendidas, recursos usados/total, clientes atendidos, % medio de peso/volumen), gráficas (barras por ruta) con la librería existente, lista de instrucciones turn-by-turn por ruta e impresión.

**Excluye (no tocar)**

- App del conductor.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/journeys/journeys_chart_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/journeys.api.js`
- `master/js/modules/services/journeys_chart_controller.js`
- `server/sidebar-menu.json`
- `tests/api/journey-metrics-nav.api.test.mjs`
- `tests/e2e/journey-metrics-nav.e2e.mjs`
- `tests/integration/journey-metrics-nav/**`
- `tests/unit/journey-metrics-nav/**`
- `specs/migracion-api-v1/f4-jornadas/evidencia/JOR-004/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Mostrar KPI de la jornada con unidades y porcentajes
- **RF-2** — Mostrar gráfica comparativa por ruta
- **RF-3** — Mostrar instrucciones turn-by-turn de una ruta
- **RF-4** — Imprimir la hoja de ruta con instrucciones

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el fixture de métricas, Entonces 13 KPI visibles con formato (km, %, enteros)
- **CA-2** (RF-2) — Dado el detalle, Entonces gráfica de distancia y duración por ruta
- **CA-3** (RF-3) — Dado ruta 0, Entonces `GET …/navigations/0` y lista de instrucciones con distancia
- **CA-4** (RF-4) — Dado «Imprimir», Entonces vista de impresión con paradas e instrucciones
- **CA-5** (RF-3) — Dado `osrmVersion:'v5'`, Entonces la lista sale de `legs[].steps[]` (maniobra + calle + distancia); dado `v4`, Entonces de `instructionsLegacy`

## 6. Diseño y restricciones técnicas

Ampliar `journeys.api.js`. Crear controladores y vistas. Eliminar `journeys_chart_controller.js`.

**Pantallas y flujos.** Detalle → pestaña KPI / Navegación. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.journeys.chart → app.journeys.metrics (nuevo)` | `pages/journeys/metrics.jade` | tenant_admin, super_admin, agent | Sustitución |
| `app.journeys.navigation (nuevo)` | `pages/journeys/navigation.jade` | ídem | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[JOR-004 CA-1]` en `tests/unit/journey-metrics-nav/` |
| T-2 | CA-1 | contrato | Prueba `[JOR-004 CA-1]` en `tests/integration/journey-metrics-nav/` |
| T-3 | CA-1 | e2e | Prueba `[JOR-004 CA-1]` en `tests/e2e/journey-metrics-nav.e2e.mjs` |
| T-4 | CA-2 | e2e | Prueba `[JOR-004 CA-2]` en `tests/e2e/journey-metrics-nav.e2e.mjs` |
| T-5 | CA-3 | unitaria | Prueba `[JOR-004 CA-3]` en `tests/unit/journey-metrics-nav/` |
| T-6 | CA-3 | contrato | Prueba `[JOR-004 CA-3]` en `tests/integration/journey-metrics-nav/` |
| T-7 | CA-3 | e2e | Prueba `[JOR-004 CA-3]` en `tests/e2e/journey-metrics-nav.e2e.mjs` |
| T-8 | CA-4 | e2e | Prueba `[JOR-004 CA-4]` en `tests/e2e/journey-metrics-nav.e2e.mjs` |
| T-9 | CA-5 | unitaria | Prueba `[JOR-004 CA-5]` en `tests/unit/journey-metrics-nav/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: JOR-003.
- Riesgos: G6.
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/JOR-004/...` |
| CA-2 | | | `evidencia/JOR-004/...` |
| CA-3 | | | `evidencia/JOR-004/...` |
| CA-4 | | | `evidencia/JOR-004/...` |
| CA-5 | | | `evidencia/JOR-004/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D7) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
