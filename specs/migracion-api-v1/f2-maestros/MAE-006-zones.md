# MAE-006: Zonas (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-06 · `ZONES` |
| Depende de | ACC-005, FND-004 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-zones` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /zones`, `GET /zones/{id}`, `POST /zones`, `PUT /zones/{id}`, `DELETE /zones/{id}`, `GET /zones/containing` |
| Maqueta | `docs/ui/maquetas/index.html#mae-006` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Nuevo módulo de zonas (nombre, código único, color y polígono GeoJSON) con editor de polígonos, que sustituye la zona como texto del CSV y habilita `evaluateItineraryZone`, `allowedZoneIds` y la sugerencia de zona en lugares.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Zona como texto en cada parada del CSV (`ZONA`) y llamada al optimizador por zona | `itinerary_controller.js` | Cambia: zonas gestionadas; el plan del servidor aplica zonas |
| L2 | Flag `evaluateItineraryZone` en configuración | `settings_form_controller.js` | Se mantiene en settings (PAQ-001) |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/zones` | — | Arreglo de Zone | 401 | `get__zones.json` |
| GET | `/api/v1/zones/{id}` | — | Zone | 404 | `get__zones__id.json` |
| POST | `/api/v1/zones` | `{name,code,color,boundary{type:'Polygon',coordinates:[[[lon,lat],…]]}}` (anillo cerrado, ≥4 posiciones) | 201 | 400 anillo abierto, 409 código duplicado | `post__zones.json` |
| PUT | `/api/v1/zones/{id}` | igual | 200 | 400, 404, 409 | `put__zones__id.json` |
| DELETE | `/api/v1/zones/{id}` | — | 204 (físico) | 404, 409 `CONFLICT` `details{referencedBy,ids}` (`places`/`packages`) | `delete__zones__id.json` |
| GET | `/api/v1/zones/containing` | `?longitude&latitude` | Arreglo de Zone | 400 | `get__zones__containing.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador u operador, quiero definir zonas con su polígono, para restringir vehículos y agrupar servicios por territorio.

## 3. Alcance

**Incluye**

- Listado, alta/edición/borrado físico, editor de polígono en mapa (dibujar, mover vértices, tabla de vértices accesible), validación local del anillo, visualización y consulta «¿en qué zona está este punto?».

**Excluye (no tocar)**

- Carga masiva de polígonos por archivo.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/zones/**`
- `master/js/custom/itinerary/itinerary_controller.js`
- `master/js/custom/settings/settings_form_controller.js`
- `master/js/custom/zones/**`
- `master/js/modules/config.js`
- `master/js/modules/services/zones.api.js`
- `server/sidebar-menu.json`
- `tests/api/zones.api.test.mjs`
- `tests/e2e/zones.e2e.mjs`
- `tests/integration/zones/**`
- `tests/unit/zones/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-006/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar zonas con muestra de color
- **RF-2** — Crear y editar zona validando código alfanumérico ≤10 y color `#RRGGBB`
- **RF-3** — Borrar zona con confirmación de borrado físico
- **RF-4** — Mostrar el polígono en mapa si tiene `boundary`
- **RF-5** — Consultar zonas que contienen un punto del mapa
- **RF-6** — Dibujar y editar el polígono de la zona en el mapa (OpenLayers 3 `Draw`/`Modify`) con una tabla de vértices editable como alternativa accesible

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `get__zones.json`, Entonces la tabla muestra nombre, código y color
- **CA-2** (RF-2) — Dado código `ZC` y color `#33FF57`, Entonces `POST /zones` sin `boundary`
- **CA-3** (RF-2) — Dado código `Zona 1!`, Entonces validación local; dado 409, Entonces «Ya existe una zona con ese código»
- **CA-4** (RF-3) — Dado borrar, Entonces confirmación que advierte que es definitivo y `DELETE`
- **CA-5** (RF-4) — Dado zona con boundary, Entonces se dibuja en el mapa con su color
- **CA-6** (RF-5) — Dado clic en el mapa, Entonces `GET /zones/containing?longitude=..&latitude=..` y lista de zonas
- **CA-7** (RF-6) — Dado 4 clics y doble clic, Entonces el polígono se cierra y `boundary.coordinates[0]` tiene 5 posiciones `[lon,lat]` con la última igual a la primera
- **CA-8** (RF-6) — Dado menos de 3 vértices o lados que se cruzan, Entonces validación local y no se envía; dado 400 del backend (anillo abierto), Entonces mensaje en el editor
- **CA-9** (RF-3) — Dado borrar una zona usada por lugares (409 `referencedBy:'places'`), Entonces «La zona la usan N lugares» y no se borra

## 6. Diseño y restricciones técnicas

Crear `zones.api.js`, `custom/zones/*`, `pages/zones/*`, estados y menú.

**Pantallas y flujos.** Listado → formulario → guardar. Mapa con herramienta «¿Qué zona?». Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.zones.list/add/edit (nuevo)` | `pages/zones/*` | tenant_admin, super_admin, agent | Nuevo módulo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-006 CA-1]` en `tests/unit/zones/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-006 CA-1]` en `tests/integration/zones/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-006 CA-1]` en `tests/e2e/zones.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-006 CA-2]` en `tests/unit/zones/` |
| T-5 | CA-2 | contrato | Prueba `[MAE-006 CA-2]` en `tests/integration/zones/` |
| T-6 | CA-2 | e2e | Prueba `[MAE-006 CA-2]` en `tests/e2e/zones.e2e.mjs` |
| T-7 | CA-3 | unitaria | Prueba `[MAE-006 CA-3]` en `tests/unit/zones/` |
| T-8 | CA-4 | unitaria | Prueba `[MAE-006 CA-4]` en `tests/unit/zones/` |
| T-9 | CA-4 | e2e | Prueba `[MAE-006 CA-4]` en `tests/e2e/zones.e2e.mjs` |
| T-10 | CA-5 | e2e | Prueba `[MAE-006 CA-5]` en `tests/e2e/zones.e2e.mjs` |
| T-11 | CA-6 | unitaria | Prueba `[MAE-006 CA-6]` en `tests/unit/zones/` |
| T-12 | CA-6 | contrato | Prueba `[MAE-006 CA-6]` en `tests/integration/zones/` |
| T-13 | CA-6 | e2e | Prueba `[MAE-006 CA-6]` en `tests/e2e/zones.e2e.mjs` |
| T-14 | CA-7 | unitaria | Prueba `[MAE-006 CA-7]` en `tests/unit/zones/` |
| T-15 | CA-7 | e2e | Prueba `[MAE-006 CA-7]` en `tests/e2e/zones.e2e.mjs` |
| T-16 | CA-8 | unitaria | Prueba `[MAE-006 CA-8]` en `tests/unit/zones/` |
| T-17 | CA-9 | unitaria | Prueba `[MAE-006 CA-9]` en `tests/unit/zones/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-005, FND-004.
- Riesgos: Rendimiento del editor con polígonos de miles de vértices en OpenLayers 3.
- Pregunta no bloqueante: ¿Cargar polígonos desde archivo GeoJSON? → Decisión propuesta: Fuera de esta spec

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-006/...` |
| CA-2 | | | `evidencia/MAE-006/...` |
| CA-3 | | | `evidencia/MAE-006/...` |
| CA-4 | | | `evidencia/MAE-006/...` |
| CA-5 | | | `evidencia/MAE-006/...` |
| CA-6 | | | `evidencia/MAE-006/...` |
| CA-7 | | | `evidencia/MAE-006/...` |
| CA-8 | | | `evidencia/MAE-006/...` |
| CA-9 | | | `evidencia/MAE-006/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §7); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B4, D3) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
