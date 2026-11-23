# MAE-004: Geocodificación directa e inversa

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f2-maestros` |
| Clave anterior | F2-04 · `GEOCODING` |
| Depende de | FND-002, FND-004 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-geocoding` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /geocoding`, `POST /reverse-geocoding` |
| Maqueta | `docs/ui/maquetas/index.html#mae-004` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Migrar `POST /geocoding` y `POST /reverse_geocoding` a `/api/v1/geocoding` y `/api/v1/reverse-geocoding`, conservando el formulario de dirección y el selector de punto en mapa.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Formulario de dirección → `POST /geocoding` con el modelo (`id`, `country`, `city`, `address`) | `geocoding_form_controller.js; addressHttp.js` | Cambia: `POST /api/v1/geocoding {address: 'dirección, ciudad, país'}` |
| L2 | Clic/arrastre en mapa → `POST /reverse_geocoding {location:{x,y}}` | `map_gen_latlong_controller.js; geocoding_services.js` | Cambia: `POST /api/v1/reverse-geocoding` con GeoJSON Point |
| L3 | Pantalla `app.address` con formulario y navegación al mapa | `address_controller.js, address_form_controller.js` | Se mantiene |
| L4 | Mapa con aceptar/cancelar/volver (returnTo) a lugar, paquete o jornada | `map_gen_latlong_controller.js` | Se mantiene |
| L5 | `address_model.getPlaces()` inexistente | `address_model.js` | Se retira (código roto) |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/geocoding` | `{address}` (≤500; ciudad y país dentro del texto) | 200 `{address,standardizedAddress,location?,geocodingScore,geocodingStatus,city,country}`; sin match = 200 `unmatch` sin `location` | 400 BAD_REQUEST, 401, 500 proveedor | — (capturar con sonda) |
| POST | `/api/v1/reverse-geocoding` | `{location:{type:'Point',coordinates:[lon,lat]}}` | 200 mismo `GeocodingResponse`; sin resolver = `unmatch` | 400 coordenadas fuera de rango | — (capturar con sonda) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero convertir direcciones en puntos y puntos en direcciones, para ubicar lugares y paquetes sin escribir coordenadas.

## 3. Alcance

**Incluye**

- Servicio `GeocodingApi`, formulario de dirección (`app.address.geocoding`), mapa de selección con clic/arrastre y dirección inversa (`app.maps.address`, `app.maps.geocoding`), estado de geocodificación y puntuación.

**Excluye (no tocar)**

- Configuración global del proveedor (PLA-003).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/address/address_controller.js`
- `master/js/custom/address/address_form_controller.js`
- `master/js/custom/address/geocoding_form_controller.js`
- `master/js/custom/maps/map_gen_latlong_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/addressHttp.js`
- `master/js/modules/services/address_model.js`
- `master/js/modules/services/geocoding.api.js`
- `master/js/modules/services/geocoding_adapter.js`
- `master/js/modules/services/geocoding_services.js`
- `server/sidebar-menu.json`
- `tests/api/geocoding.api.test.mjs`
- `tests/e2e/geocoding.e2e.mjs`
- `tests/integration/geocoding/**`
- `tests/unit/geocoding/**`
- `specs/migracion-api-v1/f2-maestros/evidencia/MAE-004/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Geocodificar una dirección y devolver coordenadas, dirección estandarizada, estado y puntuación
- **RF-2** — Obtener la dirección de un punto al hacer clic o soltar el marcador
- **RF-3** — Devolver el resultado a la pantalla de origen (lugar, paquete) mediante `returnTo`
- **RF-4** — Mostrar el estado de geocodificación con el dominio `GeocodingStatus` (`match`, `mean`, `unmatch`, `manual`, `unprocessed`) y la puntuación 0–100
- **RF-5** — Tratar `unmatch` (200 sin `location`) como «sin resultado» y marcar `manual` cuando el usuario arrastra el pin sin volver a geocodificar

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado dirección «Calle 100 #15-20», ciudad «Bogotá» y país «Colombia», Cuando geocodifico, Entonces `POST /api/v1/geocoding {address:'Calle 100 #15-20, Bogotá, Colombia'}` y se rellenan ubicación, dirección estandarizada, ciudad y país
- **CA-2** (RF-2) — Dado el mapa, Cuando hago clic, Entonces `POST /api/v1/reverse-geocoding {location:{type:'Point',coordinates:[lon,lat]}}` y la dirección aparece bajo el marcador
- **CA-3** (RF-3) — Dado que vengo de un lugar, Cuando acepto el punto, Entonces vuelvo al formulario con coordenadas y dirección
- **CA-4** (RF-4) — Dado cada estado, Entonces su etiqueta y color
- **CA-5** (RF-5) — Dado 200 `unmatch` sin `location`, Entonces aviso «No se encontró la dirección» y el usuario puede fijar el punto; al arrastrarlo, el estado pasa a `manual`; dado 500, Entonces «Servicio de geocodificación no disponible»
- **CA-6** (RF-1) — Dado backend real, Cuando la sonda geocodifica una dirección conocida, Entonces la respuesta tiene coordenadas válidas (y se guarda como fixture saneado)
- **CA-7** (RF-1) — Dado una dirección de 501 caracteres, Entonces validación local; dado 400 `BAD_REQUEST`, Entonces mensaje en el campo dirección

## 6. Diseño y restricciones técnicas

Crear `geocoding.api.js`. Modificar address/*, map_gen_latlong_controller.js. Eliminar `addressHttp.js`, `geocoding_services.js` (o reducir a adaptador), `address_model.getPlaces`.

**Pantallas y flujos.** Formulario → geocodificar → mapa de confirmación → aceptar → origen. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.address.geocoding, app.maps.address, app.maps.geocoding` | `pages/address/*, pages/maps/*` | tenant_admin, super_admin, agent | Sin cambios de navegación |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[MAE-004 CA-1]` en `tests/unit/geocoding/` |
| T-2 | CA-1 | contrato | Prueba `[MAE-004 CA-1]` en `tests/integration/geocoding/` |
| T-3 | CA-1 | e2e | Prueba `[MAE-004 CA-1]` en `tests/e2e/geocoding.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[MAE-004 CA-2]` en `tests/unit/geocoding/` |
| T-5 | CA-2 | contrato | Prueba `[MAE-004 CA-2]` en `tests/integration/geocoding/` |
| T-6 | CA-2 | e2e | Prueba `[MAE-004 CA-2]` en `tests/e2e/geocoding.e2e.mjs` |
| T-7 | CA-3 | e2e | Prueba `[MAE-004 CA-3]` en `tests/e2e/geocoding.e2e.mjs` |
| T-8 | CA-4 | unitaria | Prueba `[MAE-004 CA-4]` en `tests/unit/geocoding/` |
| T-9 | CA-5 | unitaria | Prueba `[MAE-004 CA-5]` en `tests/unit/geocoding/` |
| T-10 | CA-6 | sonda API | Prueba `[MAE-004 CA-6]` en `tests/api/geocoding.api.test.mjs` |
| T-11 | CA-7 | unitaria | Prueba `[MAE-004 CA-7]` en `tests/unit/geocoding/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-002, FND-004.
- Riesgos: Sin fixture capturado: la sonda API de G4 debe guardarlo saneado (`tests/fixtures/api-v1/post__geocoding.json`).
- Pregunta no bloqueante: Contrato de geocodificación → Decisión propuesta: Resuelta: `docs/contracts/source/GEOCODING_API.md`
- Pregunta no bloqueante: Umbral de `geocodingScore` para «revisar a mano» → Decisión propuesta: Producto: proponer < 80

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/MAE-004/...` |
| CA-2 | | | `evidencia/MAE-004/...` |
| CA-3 | | | `evidencia/MAE-004/...` |
| CA-4 | | | `evidencia/MAE-004/...` |
| CA-5 | | | `evidencia/MAE-004/...` |
| CA-6 | | | `evidencia/MAE-004/...` |
| CA-7 | | | `evidencia/MAE-004/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §GEOCODING_API); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
