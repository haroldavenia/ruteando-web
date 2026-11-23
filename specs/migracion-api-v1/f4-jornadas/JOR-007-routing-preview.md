# JOR-007: Herramientas de ruteo en mapa (previsualización no persistida)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f4-jornadas` |
| Clave anterior | F4-07 · `ROUTING-PREVIEW` |
| Depende de | FND-004, MAE-005, JOR-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-routing-preview` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /routing/route`, `POST /routing/directions`, `POST /routing/matrix`, `POST /routing/nearest`, `POST /routing/messenger`, `POST /routing/optimizations`, `POST /routing/optimizations/point-route`, `POST /routing/optimizations/collection` |
| Maqueta | `docs/ui/maquetas/index.html#jor-007` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Convertir el mapa (`app.maps.index`) en un banco de herramientas de ruteo sobre puntos sueltos usando `/api/v1/routing/*`, sin persistir, con paso a «Guardar como jornada».

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Mapa índice (`app.maps.index`) con capas | `MapsController.js` | Cambia: panel de herramientas |
| L2 | Pruebas manuales de decodificación/rutas con JSON locales (`test_controller`) | `test_controller.js` | Se retira (CIE-001): sustituido por estas herramientas |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/routing/route` | `{profile,locations[{latitude,longitude}],numberOfAlternatives,steps,annotations,geometries,overview,continueStraight}` | `{distance,time,geoJson,packages[]}` | 400 <2 puntos/perfil, 500 sin camino | `post__routing__route.json` |
| POST | `/api/v1/routing/directions` | `{locations:['lat,lon',…],…}` | OSRM Routes crudo | 400 con índice | — |
| POST | `/api/v1/routing/matrix` | igual que directions | OSRM Table (`durations[i][j]`, null = sin camino) | 400 | `post__routing__matrix.json` |
| POST | `/api/v1/routing/nearest` | `{configuration{cantNearestPackages,center},packages[]}` | subconjunto | 500 (D5) | — |
| POST | `/api/v1/routing/messenger` | `RequestMessenger` `{configuration{numberRoutes,returnToDepot,unloadingTime,considerUnloadingTimePackage,timeInit 'HH:mm:ss',depot,breakTime},packages[]}` | clustering | 500 (D5) | — |
| POST | `/api/v1/routing/optimizations` | `CargoConfig` (`configuration` + `cargoInput`), el mismo cuerpo de `optimalRouteOfPointCloud` legacy | orden + geometría (no es jornada) | 400 | `post__routing__optimizations.json` |
| POST | `/api/v1/routing/optimizations/point-route` | ídem | ruta directa | 400 | `post__routing__optimizations__point-route.json` |
| POST | `/api/v1/routing/optimizations/collection` | ídem | recolección (estado de negocio 207, D6) | 400 | — |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero probar rutas, matrices y agrupaciones sobre puntos sueltos, para simular antes de crear una jornada.

## 3. Alcance

**Incluye**

- Ruta ordenada (perfil, alternativas, geometría GeoJSON), indicaciones crudas, matriz de tiempos (aviso >500×500), N más cercanos a un centro, clustering de mensajeros, orden nearest-first, ruta directa y recolección con flota; puntos desde clic, paquetes o lugares.

**Excluye (no tocar)**

- Persistencia (JOR-001).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/maps/MapsController.js`
- `master/js/custom/maps/mapsServices.js`
- `master/js/custom/routing/**`
- `master/js/custom/test/test_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/MapsController.js`
- `master/js/modules/services/mapsServices.js`
- `master/js/modules/services/routing.api.js`
- `server/sidebar-menu.json`
- `tests/api/routing-preview.api.test.mjs`
- `tests/e2e/routing-preview.e2e.mjs`
- `tests/integration/routing-preview/**`
- `tests/unit/routing-preview/**`
- `specs/migracion-api-v1/f4-jornadas/evidencia/JOR-007/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Marcar puntos en el mapa o cargarlos desde paquetes/lugares
- **RF-2** — Calcular y pintar una ruta ordenada con distancia, tiempo y acumulados por parada
- **RF-3** — Ver indicaciones crudas
- **RF-4** — Calcular matriz de tiempos con aviso de tamaño y celdas sin camino
- **RF-5** — Elegir los N paquetes más cercanos a un centro
- **RF-6** — Agrupar puntos en N rutas de mensajería
- **RF-7** — Calcular orden nearest-first, ruta directa y recolección
- **RF-8** — Ofrecer «Guardar como jornada» que lleve a JOR-001 con los paquetes persistidos

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado 3 clics en el mapa, Entonces 3 puntos numerados editables
- **CA-2** (RF-2) — Dado 3 puntos y perfil `car`, Entonces `POST /routing/route` con `geometries:'geojson'` y se pinta la línea con distancia/tiempo totales
- **CA-3** (RF-2) — Dado 1 punto, Entonces no se envía («mínimo 2 puntos»)
- **CA-4** (RF-3) — Dado indicaciones, Entonces `locations` como strings `'lat,lon'`
- **CA-5** (RF-4) — Dado 600 puntos, Entonces confirmación de tamaño antes de enviar; dado `null` en la matriz, Entonces celda «sin camino»
- **CA-6** (RF-5) — Dado 500 (D5), Entonces mensaje de servicio no disponible
- **CA-7** (RF-6) — Dado `timeInit` 08:00, Entonces se envía `'08:00:00'` (no Instant)
- **CA-8** (RF-7) — Dado colección con estado de negocio 207, Entonces aviso de resultado parcial
- **CA-9** (RF-8) — Dado puntos que son paquetes, Cuando «Guardar como jornada», Entonces abre el planificador con esos `packageIds`
- **CA-10** (RF-5) — Dado 400 `BAD_REQUEST`, Entonces se muestra su mensaje; dado 502 `ROUTING_ENGINE_UNAVAILABLE`, Entonces «El motor de rutas no responde, reintenta»

## 6. Diseño y restricciones técnicas

Crear `routing.api.js`, `custom/routing/*`. Modificar `MapsController.js`, `mapsServices.js`.

**Pantallas y flujos.** Mapa → elegir herramienta → puntos → calcular → resultado en capa → guardar como jornada. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.maps.index → app.routing.tools` | `pages/maps/map_index.jade` | tenant_admin, super_admin, agent | Nuevo panel |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | e2e | Prueba `[JOR-007 CA-1]` en `tests/e2e/routing-preview.e2e.mjs` |
| T-2 | CA-2 | unitaria | Prueba `[JOR-007 CA-2]` en `tests/unit/routing-preview/` |
| T-3 | CA-2 | contrato | Prueba `[JOR-007 CA-2]` en `tests/integration/routing-preview/` |
| T-4 | CA-2 | e2e | Prueba `[JOR-007 CA-2]` en `tests/e2e/routing-preview.e2e.mjs` |
| T-5 | CA-3 | unitaria | Prueba `[JOR-007 CA-3]` en `tests/unit/routing-preview/` |
| T-6 | CA-4 | unitaria | Prueba `[JOR-007 CA-4]` en `tests/unit/routing-preview/` |
| T-7 | CA-5 | unitaria | Prueba `[JOR-007 CA-5]` en `tests/unit/routing-preview/` |
| T-8 | CA-5 | contrato | Prueba `[JOR-007 CA-5]` en `tests/integration/routing-preview/` |
| T-9 | CA-6 | unitaria | Prueba `[JOR-007 CA-6]` en `tests/unit/routing-preview/` |
| T-10 | CA-7 | unitaria | Prueba `[JOR-007 CA-7]` en `tests/unit/routing-preview/` |
| T-11 | CA-8 | unitaria | Prueba `[JOR-007 CA-8]` en `tests/unit/routing-preview/` |
| T-12 | CA-8 | contrato | Prueba `[JOR-007 CA-8]` en `tests/integration/routing-preview/` |
| T-13 | CA-9 | e2e | Prueba `[JOR-007 CA-9]` en `tests/e2e/routing-preview.e2e.mjs` |
| T-14 | CA-10 | unitaria | Prueba `[JOR-007 CA-10]` en `tests/unit/routing-preview/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-004, MAE-005, JOR-001.
- Riesgos: El 200 de messenger solo está probado con OSRM simulado en el backend.
- Pregunta no bloqueante: Esquema de `configuration/cargoInput` → Decisión propuesta: Resuelta: el `CargoConfig` legacy que arma hoy `osrmHttp.js` (§16.3); reutilizar ese constructor en esta herramienta

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/JOR-007/...` |
| CA-2 | | | `evidencia/JOR-007/...` |
| CA-3 | | | `evidencia/JOR-007/...` |
| CA-4 | | | `evidencia/JOR-007/...` |
| CA-5 | | | `evidencia/JOR-007/...` |
| CA-6 | | | `evidencia/JOR-007/...` |
| CA-7 | | | `evidencia/JOR-007/...` |
| CA-8 | | | `evidencia/JOR-007/...` |
| CA-9 | | | `evidencia/JOR-007/...` |
| CA-10 | | | `evidencia/JOR-007/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §16.3); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B5) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
