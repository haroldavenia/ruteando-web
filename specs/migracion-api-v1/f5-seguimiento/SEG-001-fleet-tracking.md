# SEG-001: Seguimiento GPS de la flota (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f5-seguimiento` |
| Clave anterior | F5-01 · `FLEET-TRACKING` |
| Depende de | MAE-002, FND-004 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-fleet-tracking` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /positions`, `GET /positions/{driverId}` |
| Maqueta | `docs/ui/maquetas/index.html#seg-001` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Mapa de última posición de cada conductor del tenant, con refresco periódico y ficha por conductor.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | `GeolocationService` del navegador (posición propia) sin uso de flota | `geolocation_service.js` | Se mantiene para centrar el mapa; la flota es nueva |
| L2 | Mapa de servicios asignados (`app.maps.assigned`) | `map_gen_latlong_controller.js` | Cambia: seguimiento de flota |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/positions` | — | Arreglo `{id,driverId,resourceId,longitude,latitude,address,recordedAt}` (más nueva primero; campos planos) | 401 | `get__positions.json` |
| GET | `/api/v1/positions/{driverId}` | — | Última posición | 404 sin posición | `get__positions__driverId.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero ver en un mapa la última posición de cada conductor, para supervisar la operación en curso.

## 3. Alcance

**Incluye**

- Mapa con marcadores por conductor (nombre, vehículo, hora de la posición, antigüedad), refresco cada 30 s con pausa, centrar en un conductor, acceso desde vehículo/conductor.

**Excluye (no tocar)**

- Envío de posiciones (app móvil), tiempo real por WebSocket.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/maps/MapsController.js`
- `master/js/custom/tracking/**`
- `master/js/modules/config.js`
- `master/js/modules/services/geolocation_service.js`
- `master/js/modules/services/positions.api.js`
- `server/sidebar-menu.json`
- `tests/api/fleet-tracking.api.test.mjs`
- `tests/e2e/fleet-tracking.e2e.mjs`
- `tests/integration/fleet-tracking/**`
- `tests/unit/fleet-tracking/**`
- `specs/migracion-api-v1/f5-seguimiento/evidencia/SEG-001/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Mostrar la última posición de todos los conductores
- **RF-2** — Refrescar automáticamente cada 30 s con opción de pausar
- **RF-3** — Ver la posición de un conductor concreto
- **RF-4** — Señalar posiciones antiguas (>15 min)
- **RF-5** — Abrir el seguimiento desde vehículo o conductor

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el fixture de posiciones, Entonces un marcador por conductor con `longitude`/`latitude`, `address` y `recordedAt` en hora local, y el vehículo resuelto por `resourceId`
- **CA-2** (RF-2) — Dado el reloj simulado, Entonces una petición cada 30 s; al pausar, ninguna; al salir de la pantalla, se cancela el intervalo
- **CA-3** (RF-3) — Dado un conductor, Entonces `GET /positions/{driverId}` y el mapa lo centra; 404 → «Sin posición registrada»
- **CA-4** (RF-4) — Dado una posición de hace 20 min, Entonces marcador atenuado con «hace 20 min»
- **CA-5** (RF-5) — Dado un vehículo con conductor, Cuando «Ver en mapa», Entonces seguimiento centrado

## 6. Diseño y restricciones técnicas

Crear `positions.api.js`, `custom/tracking/*`.

**Pantallas y flujos.** Menú → Seguimiento → mapa con lista lateral. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.tracking (nuevo)` | `pages/tracking/tracking.jade` | tenant_admin, super_admin, agent | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[SEG-001 CA-1]` en `tests/unit/fleet-tracking/` |
| T-2 | CA-1 | contrato | Prueba `[SEG-001 CA-1]` en `tests/integration/fleet-tracking/` |
| T-3 | CA-1 | e2e | Prueba `[SEG-001 CA-1]` en `tests/e2e/fleet-tracking.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[SEG-001 CA-2]` en `tests/unit/fleet-tracking/` |
| T-5 | CA-3 | unitaria | Prueba `[SEG-001 CA-3]` en `tests/unit/fleet-tracking/` |
| T-6 | CA-3 | contrato | Prueba `[SEG-001 CA-3]` en `tests/integration/fleet-tracking/` |
| T-7 | CA-3 | e2e | Prueba `[SEG-001 CA-3]` en `tests/e2e/fleet-tracking.e2e.mjs` |
| T-8 | CA-4 | unitaria | Prueba `[SEG-001 CA-4]` en `tests/unit/fleet-tracking/` |
| T-9 | CA-5 | e2e | Prueba `[SEG-001 CA-5]` en `tests/e2e/fleet-tracking.e2e.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-002, FND-004.
- Riesgos: G9.
- Pregunta no bloqueante: Frecuencia → Decisión propuesta: Resuelta (D8): polling 30 s; la cadencia de envío la fija la app móvil

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/SEG-001/...` |
| CA-2 | | | `evidencia/SEG-001/...` |
| CA-3 | | | `evidencia/SEG-001/...` |
| CA-4 | | | `evidencia/SEG-001/...` |
| CA-5 | | | `evidencia/SEG-001/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §10); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D8) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
