# JOR-001: Planificar jornada (VRP en servidor)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f4-jornadas` |
| Clave anterior | F4-01 · `JOURNEY-PLAN` |
| Depende de | PAQ-001, PAQ-002 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-journey-plan` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /journeys/plan`, `GET /journeys/plan/jobs/{jobId}` |
| Maqueta | `docs/ui/maquetas/index.html#jor-001` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Sustituir la optimización en cliente (`osrmHttp`: `optimalRouteOfPointCloud`, `optimisationForMessenger`, `optimisationForPackages` + una llamada por zona) por `POST /journeys/plan?mode=packages|messenger`, que planifica y persiste.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Validación: lugar y configuración obligatorios; sin registros → aviso | `itinerary_controller.js `optimize`` | Cambia: configuración obligatoria (el depósito está en settings) y ≥1 paquete |
| L2 | Confirmación si hay paradas «incorrectas» (sin geocodificar) y se excluyen | `itinerary_controller.js `optimize` + tpl.optimice` | Se mantiene: aviso de paquetes sin ubicación que se excluirán |
| L3 | Selección del endpoint por `roadRestrictionType` y `fixedRoutes` | `itinerary_controller.js `requestServiceHttp`` | Cambia: `fixed_routes` → `plan?mode=messenger` (también con `fixedRoutes = 1`, para que quede jornada); resto → `mode=packages` (§16.3) |
| L4 | Cuerpo con `cargoInput`, `configuration`, `resource[]`, `restriction[]`, ciudad fija BOGOTA | `osrmHttp.js` | Se retira: el servidor lee settings y paquetes |
| L5 | Llamada por zona con promesa perdida | `itinerary_controller.js` | Se retira (bug) |
| L6 | Navega a `app.routes.list` con la respuesta | `itinerary_controller.js` | Cambia: navega al detalle `app.journeys.detail({id})` |
| L7 | Crear configuración / lugar desde el planificador | `itinerary_controller.js `settings.add`, `places.add`` | Se mantiene (returnTo) |
| L8 | Cancelar vuelve al formulario de jornada | `itinerary_controller.js `cancel`` | Cambia: vuelve a jornadas |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/journeys/plan` | `?mode=packages\|messenger` + `{settingsId,packageIds,name,date}` | 201 detalle de jornada (síncrono); con `&async=true`: 202 `{jobId,status:"queued"}` + `Location` | 400 settingsId/paquetes, 404 no del tenant, 422, 502/504 (síncrono); 429 `RATE_LIMIT_EXCEEDED` cola llena (asíncrono, no crea job) | `post__journeys__plan.json` |
| GET | `/api/v1/journeys/plan/jobs/{jobId}` | — | 200 `{jobId,status:queued\|running,mode}`; `succeeded` añade `journeyId`; `failed` añade `error{code,message}` (`BAD_REQUEST`, `NOT_FOUND`, `ROUTING_ENGINE_UNAVAILABLE`, `INTERNAL_ERROR`) | 404 job desconocido o de otro tenant | — (capturar) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero planificar una jornada con una configuración y paquetes elegidos, para obtener rutas optimizadas guardadas en el sistema.

## 3. Alcance

**Incluye**

- Asistente: nombre y fecha, configuración activa, paquetes (pendientes, filtros, seleccionar todos), validación previa, modo según `restrictionType`, envío, espera larga, resultado (detalle) y paquetes no asignables.

**Excluye (no tocar)**

- Previsualizaciones sin persistir (JOR-007).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/journeys/plan.jade/**`
- `master/js/custom/itinerary/itinerary_controller.js`
- `master/js/custom/journeys/journeys_form_controller.js`
- `master/js/custom/journeys/plan_controller.js/**`
- `master/js/modules/config.js`
- `master/js/modules/services/itinerary_controller.js`
- `master/js/modules/services/osrmHttp.js`
- `master/js/modules/services/route-helpers.js`
- `server/sidebar-menu.json`
- `tests/api/journey-plan.api.test.mjs`
- `tests/e2e/journey-plan.e2e.mjs`
- `tests/integration/journey-plan/**`
- `tests/unit/journey-plan/**`
- `specs/migracion-api-v1/f4-jornadas/evidencia/JOR-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Elegir nombre, fecha y una configuración activa
- **RF-2** — Elegir paquetes listos para rutear (con ubicación y `geocodingStatus` `match`/`manual`), filtrar y seleccionar en varias páginas
- **RF-3** — Advertir y excluir paquetes sin ubicación
- **RF-4** — Determinar el modo por la configuración
- **RF-5** — Enviar la planificación mostrando una espera no bloqueante y evitando doble envío
- **RF-6** — Abrir el detalle de la jornada creada y listar los paquetes no asignados
- **RF-7** — Gestionar errores conservando la selección para reintentar
- **RF-8** — Planificar en modo asíncrono cuando la selección pueda pasar de 60 s (más de 500 paquetes): enviar `async=true`, consultar el job hasta `succeeded` o `failed` y abrir la jornada

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado sin configuración, Entonces «Selecciona una configuración» y no se envía
- **CA-2** (RF-2) — Dado paquetes en 3 páginas, Cuando selecciono en páginas 1 y 3, Entonces `packageIds` contiene ambos
- **CA-3** (RF-2) — Dado «Seleccionar todos los pendientes», Entonces se piden todas las páginas de `status=pending` y se seleccionan
- **CA-4** (RF-3) — Dado 2 paquetes sin `location`, Entonces confirmación «2 paquetes sin ubicación no se planificarán» y se excluyen
- **CA-5** (RF-4) — Dado `restrictionType=fixed_routes`, Entonces `?mode=messenger`; dado otro, `?mode=packages`
- **CA-6** (RF-5) — Dado envío, Entonces `POST /journeys/plan?mode=…` con `{settingsId,packageIds,name,date}` (date ISO UTC) y botón deshabilitado hasta respuesta
- **CA-7** (RF-6) — Dado 201 con `invalidPackageIds`, Entonces navega a `app.journeys.detail` y muestra la lista de no asignados
- **CA-8** (RF-7) — Dado 404, Entonces «La configuración o algún paquete ya no existe»; 504, Entonces «La planificación tardó demasiado» y la selección se conserva
- **CA-9** (RF-5) — Dado backend real, Cuando planifico 2 paquetes de prueba, Entonces 201 (o D1 documentado como `fixme`)
- **CA-10** (RF-5) — Dado más de 500 paquetes seleccionados, Entonces aviso «Puede tardar más de un minuto» y progreso indeterminado con tiempo transcurrido
- **CA-11** (RF-7) — Dado 504 del proxy, Entonces «La planificación tardó demasiado» y, al reintentar, primero se consulta `GET /journeys?sort=createdAt,desc` por una jornada con el mismo nombre creada en los últimos minutos para no duplicarla
- **CA-12** (RF-8) — Dado 600 paquetes, Cuando envío, Entonces `POST /journeys/plan?mode=packages&async=true`, guardo el `jobId` y consulto `GET /journeys/plan/jobs/{jobId}` cada 3 s mostrando «En cola» / «Calculando» y el tiempo transcurrido; con `succeeded` navego a `app.journeys.detail` del `journeyId`
- **CA-13** (RF-8) — Dado un job `failed` con `BAD_REQUEST` o `NOT_FOUND`, Entonces muestro `error.message` traducido por código, conservo la selección y no reintento solo; con `ROUTING_ENGINE_UNAVAILABLE`, Entonces «El motor de rutas no respondió» y botón Reintentar (nuevo POST)
- **CA-14** (RF-8) — Dado 429 al enviar (cola llena: 20 en espera), Entonces «Hay muchas planificaciones en cola, inténtalo en unos minutos», no se crea nada y el botón vuelve a estar disponible
- **CA-15** (RF-8) — Dado que recargo la página con un job en curso, Entonces se recupera el `jobId` guardado en la sesión del navegador y se retoma la consulta; dado 404 del job, Entonces «La planificación ya no está disponible» y se limpia
- **CA-16** (RF-5) — Dado 500 paquetes o menos, Entonces se usa el modo síncrono (201) como hasta ahora; el umbral vive en `apiConfig.planAsyncThreshold` (500)

## 6. Diseño y restricciones técnicas

Crear `journeys.api.js#plan`, `custom/journeys/plan_controller.js`, `pages/journeys/plan.jade`, `package_picker` directiva. Eliminar `osrmHttp.js`, `itinerary_controller.js` (resto), `route-helpers.js` si queda sin uso.

**Pantallas y flujos.** Jornadas → «Planificar» (o Paquetes → «Planificar seleccionados») → paso 1 datos → paso 2 paquetes → revisión → planificar → detalle. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.itinerary.list → app.journeys.plan (nuevo)` | `pages/journeys/plan.jade` | tenant_admin, super_admin, agent | Nuevo flujo: paquetes persistidos + plan en servidor |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[JOR-001 CA-1]` en `tests/unit/journey-plan/` |
| T-2 | CA-2 | unitaria | Prueba `[JOR-001 CA-2]` en `tests/unit/journey-plan/` |
| T-3 | CA-2 | e2e | Prueba `[JOR-001 CA-2]` en `tests/e2e/journey-plan.e2e.mjs` |
| T-4 | CA-3 | unitaria | Prueba `[JOR-001 CA-3]` en `tests/unit/journey-plan/` |
| T-5 | CA-4 | unitaria | Prueba `[JOR-001 CA-4]` en `tests/unit/journey-plan/` |
| T-6 | CA-5 | unitaria | Prueba `[JOR-001 CA-5]` en `tests/unit/journey-plan/` |
| T-7 | CA-6 | unitaria | Prueba `[JOR-001 CA-6]` en `tests/unit/journey-plan/` |
| T-8 | CA-6 | contrato | Prueba `[JOR-001 CA-6]` en `tests/integration/journey-plan/` |
| T-9 | CA-6 | e2e | Prueba `[JOR-001 CA-6]` en `tests/e2e/journey-plan.e2e.mjs` |
| T-10 | CA-7 | unitaria | Prueba `[JOR-001 CA-7]` en `tests/unit/journey-plan/` |
| T-11 | CA-7 | e2e | Prueba `[JOR-001 CA-7]` en `tests/e2e/journey-plan.e2e.mjs` |
| T-12 | CA-8 | unitaria | Prueba `[JOR-001 CA-8]` en `tests/unit/journey-plan/` |
| T-13 | CA-9 | sonda API | Prueba `[JOR-001 CA-9]` en `tests/api/journey-plan.api.test.mjs` |
| T-14 | CA-10 | unitaria | Prueba `[JOR-001 CA-10]` en `tests/unit/journey-plan/` |
| T-15 | CA-11 | unitaria | Prueba `[JOR-001 CA-11]` en `tests/unit/journey-plan/` |
| T-16 | CA-11 | e2e | Prueba `[JOR-001 CA-11]` en `tests/e2e/journey-plan.e2e.mjs` |
| T-17 | CA-12 | unitaria | Prueba `[JOR-001 CA-12]` en `tests/unit/journey-plan/` |
| T-18 | CA-12 | contrato | Prueba `[JOR-001 CA-12]` en `tests/integration/journey-plan/` |
| T-19 | CA-12 | e2e | Prueba `[JOR-001 CA-12]` en `tests/e2e/journey-plan.e2e.mjs` |
| T-20 | CA-13 | unitaria | Prueba `[JOR-001 CA-13]` en `tests/unit/journey-plan/` |
| T-21 | CA-14 | unitaria | Prueba `[JOR-001 CA-14]` en `tests/unit/journey-plan/` |
| T-22 | CA-15 | unitaria | Prueba `[JOR-001 CA-15]` en `tests/unit/journey-plan/` |
| T-23 | CA-15 | e2e | Prueba `[JOR-001 CA-15]` en `tests/e2e/journey-plan.e2e.mjs` |
| T-24 | CA-16 | unitaria | Prueba `[JOR-001 CA-16]` en `tests/unit/journey-plan/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: PAQ-001, PAQ-002.
- Riesgos: Tiempos medidos (D11): 100 paquetes 5,5 s, 500 en 31 s, 2000 en 137 s. Por encima de 500 se usa `async=true` (sin corte del proxy). En síncrono el proxy da 240 s (FND-002, D7); si aun así corta, la jornada puede haberse creado en el servidor (CA-11). Un job interrumpido por un reinicio del backend queda `failed`: el usuario lo reenvía. Los jobs se purgan a las 24 h.
- Pregunta no bloqueante: ¿`date` afecta al plan? → Decisión propuesta: Resuelta: metadato `Instant` UTC opcional
- Pregunta no bloqueante: Legacy `fixedRoutes == 1` usaba `optimalRouteOfPointCloud` → Decisión propuesta: Persistir con `plan?mode=messenger`; la variante efímera queda en JOR-007 (`/routing/optimizations`)
- Pregunta no bloqueante: ¿Modo asíncrono? → Decisión propuesta: Resuelta (D11 cerrado 2026-11-23): `async=true` por encima de 500 paquetes; consulta cada 3 s

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/JOR-001/...` |
| CA-2 | | | `evidencia/JOR-001/...` |
| CA-3 | | | `evidencia/JOR-001/...` |
| CA-4 | | | `evidencia/JOR-001/...` |
| CA-5 | | | `evidencia/JOR-001/...` |
| CA-6 | | | `evidencia/JOR-001/...` |
| CA-7 | | | `evidencia/JOR-001/...` |
| CA-8 | | | `evidencia/JOR-001/...` |
| CA-9 | | | `evidencia/JOR-001/...` |
| CA-10 | | | `evidencia/JOR-001/...` |
| CA-11 | | | `evidencia/JOR-001/...` |
| CA-12 | | | `evidencia/JOR-001/...` |
| CA-13 | | | `evidencia/JOR-001/...` |
| CA-14 | | | `evidencia/JOR-001/...` |
| CA-15 | | | `evidencia/JOR-001/...` |
| CA-16 | | | `evidencia/JOR-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §9, 16.3); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B2, D11) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | Plan asíncrono (D11): `async=true` + `GET /journeys/plan/jobs/{jobId}` por encima de 500 paquetes; 429 de cola llena; recuperación tras recargar | migration-guide §9, endpoints.md, BACKEND_PENDIENTES D11 | pendiente |
| 2026-11-27 | §9: el timeout síncrono del proxy para `POST /journeys/plan` pasa de 180 s a 240 s (`BACKEND_PLAN_TIMEOUT_MS` = 240 000 por defecto) | FND-002 D7 y D9 (#80) | Harold Avenia (2026-11-27) |
