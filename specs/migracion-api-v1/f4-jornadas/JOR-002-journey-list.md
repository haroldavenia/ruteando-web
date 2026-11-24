# JOR-002: Listado de jornadas

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f4-jornadas` |
| Clave anterior | F4-02 · `JOURNEY-LIST` |
| Depende de | JOR-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-journey-list` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /journeys`, `DELETE /journeys/{id}`, `POST /journeys/batch-delete` |
| Maqueta | `docs/ui/maquetas/index.html#jor-002` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Migrar `GET /journeys/summary` y `DELETE ?ids=` al listado paginado con filtro por estado.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado `GET /journeys/summary` con búsqueda/paginación cliente/selección | `journeys_controller.js` | Cambia: `GET /journeys?page&size&status` |
| L2 | Borrar una / varias (`deleteIds`) | `journeys_controller.js` | Cambia: una petición `POST /journeys/batch-delete` (lotes de 100) con informe «Se eliminaron X de N» |
| L3 | Ir a detalle, al mapa (`app.maps.route`), a rutas (`app.routes.list`) | `journeys_controller.js `goToDetail/goToMap/goToRoute`` | Cambia: detalle único (JOR-003) |
| L4 | Exportar PDF/XLSX de la jornada desde el listado | `journeys_controller.js `exportPDf/exportXLSX`` | Se mantiene (JOR-005) |
| L5 | Ir a gráfica (`goToChart`) y `getJourneys()` inexistente | `journeys_controller.js` | Cambia: métricas (JOR-004); se retira código roto |
| L6 | Botón nueva jornada → `app.journeys.add` | `journeys_controller.js `add`` | Cambia: `app.journeys.plan` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/journeys` | `?page&size&status` | Page<JourneySummary> (sin routes) | 401 | `get__journeys.json` |
| DELETE | `/api/v1/journeys/{id}` | — | 204 soft | 404 | `delete__journeys__id.json` |
| POST | `/api/v1/journeys/batch-delete` | `{ids}` (máx. 100) | 200 `{results:[{id,status:deleted\|not_found\|conflict,error?}]}`; `error` = el 409 (`CONFLICT`, `details.referencedBy`, `details.ids`) | 422 si hay más de 100 ids (no borra ninguno) | — (capturar con `capture-fixture`) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero ver, filtrar y borrar jornadas, para encontrar rápidamente la planificación que necesito.

## 3. Alcance

**Incluye**

- Tabla paginada (nombre, fecha, configuración, estado, servicios, recursos, zonas), filtro estado, búsqueda, orden por fecha en cliente, borrar uno/lote, ir a detalle, mapa, ruta y exportar.

**Excluye (no tocar)**

- —
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/journeys/journeys_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/journeyHttp.js`
- `master/js/modules/services/journeys.api.js`
- `master/js/modules/services/journeys_controller.js`
- `server/sidebar-menu.json`
- `tests/api/journey-list.api.test.mjs`
- `tests/e2e/journey-list.e2e.mjs`
- `tests/integration/journey-list/**`
- `tests/unit/journey-list/**`
- `specs/migracion-api-v1/f4-jornadas/evidencia/JOR-002/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar jornadas paginadas con estado traducido
- **RF-2** — Filtrar por estado
- **RF-3** — Ordenar por fecha de creación descendente en cliente
- **RF-4** — Borrar una o varias con informe
- **RF-5** — Navegar a detalle, mapa, métricas y exportaciones

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `get__journeys.json`, Entonces filas con nombre, configuración, estado (etiqueta `JourneyStatus`), servicios y recursos
- **CA-2** (RF-2) — Dado filtro `completed`, Entonces `GET /journeys?page=0&size=20&status=completed`
- **CA-3** (RF-3) — Dado página desordenada, Entonces la tabla muestra la más reciente arriba
- **CA-4** (RF-4) — Dado 2 seleccionadas, Entonces `POST /journeys/batch-delete` e informe
- **CA-5** (RF-5) — Dado una fila, Cuando «Ver», Entonces `app.journeys.detail({id})`
- **CA-6** (RF-2) — Dado el filtro, Entonces ofrece solo `planning`, `in_progress`, `completed`, `failed`, `cancelled` con etiquetas de `JourneyStatus`; nunca envía `planned` ni `dispatched` (el backend responde 400)
- **CA-7** (RF-3) — Dado el listado, Entonces `GET /journeys?…&sort=createdAt,desc` y el cliente ya no reordena
- **CA-8** (RF-4) — Dado 3 seleccionados con un resultado `conflict` (`details.referencedBy`), Cuando confirmo, Entonces una sola petición `POST /journeys/batch-delete {ids:[…3]}`, aviso «Se eliminaron 2 de 3» y el detalle del que está en uso; un `not_found` cuenta como ya eliminado
- **CA-9** (RF-4) — Dado 150 seleccionados, Entonces `ApiClient.batchDelete` envía 2 peticiones (100 y 50) y muestra un único informe; nunca se envía un lote de más de 100 (evita el 422)
- **CA-10** (RF-2) — Dado una jornada recién planificada, Entonces su insignia es `planning` («Planificada»); Dado un `status` fuera del catálogo en datos antiguos (p. ej. `planned` en el fixture `get__journeys.json`), Entonces se muestra la clave tal cual sin romper la tabla; Dado `?status=planned` desde una URL guardada, Entonces se descarta y se lista sin filtro

## 6. Diseño y restricciones técnicas

Crear/ampliar `journeys.api.js`. Modificar `journeys_controller.js`. Eliminar `journeyHttp.js`.

**Pantallas y flujos.** Listado → acciones por fila / lote. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.journeys.list` | `pages/journeys/journeys_list.jade` | tenant_admin, super_admin, agent | Filtro estado; acciones nuevas |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[JOR-002 CA-1]` en `tests/unit/journey-list/` |
| T-2 | CA-1 | contrato | Prueba `[JOR-002 CA-1]` en `tests/integration/journey-list/` |
| T-3 | CA-1 | e2e | Prueba `[JOR-002 CA-1]` en `tests/e2e/journey-list.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[JOR-002 CA-2]` en `tests/unit/journey-list/` |
| T-5 | CA-3 | unitaria | Prueba `[JOR-002 CA-3]` en `tests/unit/journey-list/` |
| T-6 | CA-4 | unitaria | Prueba `[JOR-002 CA-4]` en `tests/unit/journey-list/` |
| T-7 | CA-4 | e2e | Prueba `[JOR-002 CA-4]` en `tests/e2e/journey-list.e2e.mjs` |
| T-8 | CA-5 | e2e | Prueba `[JOR-002 CA-5]` en `tests/e2e/journey-list.e2e.mjs` |
| T-9 | CA-6 | unitaria | Prueba `[JOR-002 CA-6]` en `tests/unit/journey-list/` |
| T-10 | CA-7 | unitaria | Prueba `[JOR-002 CA-7]` en `tests/unit/journey-list/` |
| T-11 | CA-8 | unitaria | Prueba `[JOR-002 CA-8]` en `tests/unit/journey-list/` |
| T-12 | CA-8 | contrato | Prueba `[JOR-002 CA-8]` en `tests/integration/journey-list/` |
| T-13 | CA-8 | e2e | Prueba `[JOR-002 CA-8]` en `tests/e2e/journey-list.e2e.mjs` |
| T-14 | CA-9 | unitaria | Prueba `[JOR-002 CA-9]` en `tests/unit/journey-list/` |
| T-15 | CA-10 | unitaria | Prueba `[JOR-002 CA-10]` en `tests/unit/journey-list/` |
| T-16 | CA-10 | sonda API | Prueba `[JOR-002 CA-10]` en `tests/api/journey-list.api.test.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: JOR-001.
- Riesgos: D8.
- Preguntas abiertas: ninguna.
- Pregunta no bloqueante: Estado de una jornada recién planificada → Decisión propuesta: Resuelta (G19, 2026-11-24): `planning`; `planned` y `dispatched` dan 400 en el filtro

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/JOR-002/...` |
| CA-2 | | | `evidencia/JOR-002/...` |
| CA-3 | | | `evidencia/JOR-002/...` |
| CA-4 | | | `evidencia/JOR-002/...` |
| CA-5 | | | `evidencia/JOR-002/...` |
| CA-6 | | | `evidencia/JOR-002/...` |
| CA-7 | | | `evidencia/JOR-002/...` |
| CA-8 | | | `evidencia/JOR-002/...` |
| CA-9 | | | `evidencia/JOR-002/...` |
| CA-10 | | | `evidencia/JOR-002/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §9); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B8) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Borrado por lote con `POST /journeys/batch-delete` (M1): un resultado por id; sustituye los N `DELETE` | migration-guide §7 (M1) y endpoints.md | pendiente |
| 2026-11-24 | Discrepancia `planned` / `planning` en el estado de jornada (G19) | Colección Postman del backend (2026-11-24) | pendiente |
| 2026-11-24 | G19 cerrada: `planning` canónico; filtro sin `planned`/`dispatched` | migration-guide 2026-11-24 (G19–G23 cerradas) | pendiente |
