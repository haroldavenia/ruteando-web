# MAE-005: Lugares y depósitos → places (+ cercanos)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-05 · `PLACES` |
| Depende de | MAE-004, MAE-006 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-places` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /places`, `GET /places/{id}`, `POST /places`, `PUT /places/{id}`, `DELETE /places/{id}`, `GET /places/nearby`, `GET /zones/containing` |
| Maqueta | `docs/ui/maquetas/index.html#mae-005` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Migrar lugares a `/places` con tipo (`PlaceType`), ubicación GeoJSON, contacto y zona, y añadir «lugares cercanos».

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado con búsqueda de texto, selección múltiple, paginación en cliente (10/página) | `places_controller.js` | Cambia: paginación de servidor + búsqueda en cliente sobre la página o `listAll` |
| L2 | Borrar uno con confirmación ngDialog | `places_controller.js` | Se mantiene: `DELETE /{id}` |
| L3 | Borrar seleccionados (`DELETE ?ids=`) | `places_http.js` | Cambia: N `DELETE` con informe «Se eliminaron X de N» |
| L4 | Ir a crear / editar | `places_controller.js` | Se mantiene |
| L5 | Formulario crear/editar con cancelar | `places_form_controller.js` | Se mantiene con nuevos campos |
| L6 | Recuperación de token con `resincTknRefresh` en la carga | `places_controller.js` | Se retira (interceptor ACC-001) |
| L7 | Campos name, address, phoneNumber + geocodificar / ir al mapa | `places/form.jade; places_form_controller.js` | Cambia: + `type`, `contactName`, `zoneId`, `location` GeoJSON |
| L8 | Crear lugar desde la jornada y volver (`returnTo`) | `itinerary_controller.js `places.add`` | Cambia: desde configuraciones (el depósito vive en settings) |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/places` | `?type&page&size` | Page<Place> | 401 | `get__places.json` |
| GET | `/api/v1/places/{id}` | — | Place | 404 | `get__places__id.json` |
| POST | `/api/v1/places` | `{name*(≤100),type,address,location*:{type:'Point',coordinates:[lon,lat]},phoneNumber(E.164),contactName,zoneId}` | 201 PlaceResponse | 400,409 | `post__places.json` |
| PUT | `/api/v1/places/{id}` | igual | 200 | 400,404 | `put__places__id.json` |
| DELETE | `/api/v1/places/{id}` | — | 204 | 404, 400/409 en uso | `delete__places__id.json` |
| GET | `/api/v1/places/nearby` | `?lon&lat&maxDistance` (m, 5000) | Arreglo/Page de Place | 400 | `get__places__nearby.json` |
| GET | `/api/v1/zones/containing` | `?longitude&latitude` | Zonas que cubren el punto (para sugerir `zoneId`) | 400 | `get__zones__containing.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador u operador, quiero gestionar lugares y depósitos y encontrar los cercanos, para usarlos como origen y destino de las rutas.

## 3. Alcance

**Incluye**

- Listado con filtro por tipo, mapa de lugares, alta/edición con geocodificación y selección en mapa, borrado individual/lote, búsqueda de cercanos a un punto.

**Excluye (no tocar)**

- —
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/places_map.jade`
- `master/js/custom/places/places_controller.js`
- `master/js/custom/places/places_form_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/places.api.js`
- `master/js/modules/services/places_http.js`
- `server/sidebar-menu.json`
- `tests/api/places.api.test.mjs`
- `tests/e2e/places.e2e.mjs`
- `tests/integration/places/**`
- `tests/unit/places/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-005/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar lugares con filtro por tipo
- **RF-2** — Crear/editar con dirección geocodificada o punto en mapa
- **RF-3** — Borrar uno o varios con informe
- **RF-4** — Ver lugares en un mapa
- **RF-5** — Buscar lugares cercanos a un punto con radio
- **RF-6** — Volver al flujo de origen tras crear
- **RF-7** — Al fijar la ubicación, sugerir la zona con `GET /zones/containing` y rellenar `zoneId`

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado filtro tipo=depot, Entonces `GET /places?type=depot&page=0&size=20`
- **CA-2** (RF-2) — Dado `{lat:4.6,lng:-74.07}`, Cuando guardo, Entonces `location.coordinates` = `[-74.07,4.6]`
- **CA-3** (RF-2) — Dado nuevo lugar con «Ubicar en mapa», Cuando acepto, Entonces vuelvo con coordenadas y guardo
- **CA-4** (RF-3) — Dado borrar un lugar en uso (409 `details.referencedBy` = `resources` o `settings`), Entonces «El lugar es depósito de N vehículos/configuraciones» y no se borra
- **CA-5** (RF-4) — Dado lugares, Cuando abro el mapa, Entonces un pin por lugar con su nombre
- **CA-6** (RF-5) — Dado un punto y 2000 m, Entonces `GET /places/nearby?lon=..&lat=..&maxDistance=2000` y lista ordenada por distancia
- **CA-7** (RF-6) — Dado que vengo de configuración, Cuando creo, Entonces vuelvo con el lugar seleccionado
- **CA-8** (RF-7) — Dado un punto dentro de «Zona Centro», Cuando acepto la ubicación, Entonces se llama `/zones/containing` y `zoneId` queda preseleccionado y editable
- **CA-9** (RF-2) — Dado sin ubicación o nombre > 100, Entonces no se envía; `type` ofrece depot, warehouse, store, office, custom de `PlaceType`

## 6. Diseño y restricciones técnicas

Crear `places.api.js`, vista `places_map.jade`. Modificar places/*. Eliminar `places_http.js`.

**Pantallas y flujos.** Listado (tabla/mapa) → formulario → geocodificar/mapa → guardar. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.places.list/add/edit` | `pages/places/*` | tenant_admin, super_admin, agent | Campos nuevos, mapa, cercanos |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-005 CA-1]` en `tests/unit/places/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-005 CA-1]` en `tests/integration/places/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-005 CA-1]` en `tests/e2e/places.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-005 CA-2]` en `tests/unit/places/` |
| T-5 | CA-2 | contrato | Prueba `[MAE-005 CA-2]` en `tests/integration/places/` |
| T-6 | CA-3 | e2e | Prueba `[MAE-005 CA-3]` en `tests/e2e/places.e2e.mjs` |
| T-7 | CA-4 | unitaria | Prueba `[MAE-005 CA-4]` en `tests/unit/places/` |
| T-8 | CA-5 | e2e | Prueba `[MAE-005 CA-5]` en `tests/e2e/places.e2e.mjs` |
| T-9 | CA-6 | unitaria | Prueba `[MAE-005 CA-6]` en `tests/unit/places/` |
| T-10 | CA-6 | contrato | Prueba `[MAE-005 CA-6]` en `tests/integration/places/` |
| T-11 | CA-6 | e2e | Prueba `[MAE-005 CA-6]` en `tests/e2e/places.e2e.mjs` |
| T-12 | CA-7 | e2e | Prueba `[MAE-005 CA-7]` en `tests/e2e/places.e2e.mjs` |
| T-13 | CA-8 | unitaria | Prueba `[MAE-005 CA-8]` en `tests/unit/places/` |
| T-14 | CA-8 | e2e | Prueba `[MAE-005 CA-8]` en `tests/e2e/places.e2e.mjs` |
| T-15 | CA-9 | unitaria | Prueba `[MAE-005 CA-9]` en `tests/unit/places/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-004, MAE-006.
- Riesgos: —
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-005/...` |
| CA-2 | | | `evidencia/MAE-005/...` |
| CA-3 | | | `evidencia/MAE-005/...` |
| CA-4 | | | `evidencia/MAE-005/...` |
| CA-5 | | | `evidencia/MAE-005/...` |
| CA-6 | | | `evidencia/MAE-005/...` |
| CA-7 | | | `evidencia/MAE-005/...` |
| CA-8 | | | `evidencia/MAE-005/...` |
| CA-9 | | | `evidencia/MAE-005/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §7, GEOCODING_API §3); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (D3, D15) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
