# FND-004: Utilidades geográficas, polilíneas y unidades

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f0-fundaciones` |
| Clave anterior | F0-04 · `GEO-CORE` |
| Depende de | FND-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-geo-core` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Centralizar conversiones GeoJSON `[lon,lat]` ↔ `{lat,lng}` ↔ OpenLayers 3, decodificación de polilínea precisión 5/6 y formateo de metros/segundos.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Decodificación de geometría de rutas OSRM | `modules/services/decoder_services.js` | Cambia: `PolylineCodec.decode(str, 5)` |
| L2 | Mapeo de puntos `{x: lon, y: lat}` y `latitude/longitude` sueltos | `mapping_services.js, map_gen_latlong_controller.js` | Cambia: `{lat,lng}` en dominio |
| L3 | Conversión minutos/kilómetros/m³ en PDF | `pdf_exporter.js:473-485` | Cambia: `Units` compartido |

### Contrato `/api/v1`

Sin endpoints propios (historia transversal).

## 2. Historia de usuario

Como desarrollador del frontend, quiero conversiones geográficas, de polilíneas y de unidades centralizadas, para que mapas, tablas y exportaciones muestren lo mismo.

## 3. Alcance

**Incluye**

- `GeoUtils`, `PolylineCodec`, `Units` (km, hh:mm, m³), adaptación de `mapsServices` para pintar puntos y líneas desde el dominio.

**Excluye (no tocar)**

- Pantallas de mapa concretas (MAE-005, JOR-003, JOR-007, SEG-001).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `master/js/modules/services/geo_utils.js`
- `master/js/modules/services/polyline_codec.js`
- `master/js/modules/services/units.js` (formatos, compartido con FND-003)
- `tests/helpers/sources.json`
- `tests/unit/geo-core/**`
- `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-004/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Convertir GeoJSON Point a `{lat,lng}` y viceversa validando rangos
- **RF-2** — Convertir `waypoints[].coordinates` `[lon,lat]` a `{lat,lng}`
- **RF-3** — Decodificar polilíneas de precisión 5 y 6 y GeoJSON LineString a `{lat,lng}[]`
- **RF-4** — Formatear metros como km con 1 decimal, segundos como `h:mm`, gramos como kg y cm³ como m³ (delegando en `Units` de FND-003)
- **RF-5** — Proyectar `{lat,lng}` a EPSG:3857 para OpenLayers 3

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `{type:'Point',coordinates:[-74.07728,4.60872]}`, Cuando `fromGeoJson`, Entonces `{lat:4.60872,lng:-74.07728}`; con lat 95 lanza error
- **CA-2** (RF-2) — Dado `get__journeys__id.json`, Cuando convierto el primer waypoint, Entonces lat∈[-90,90] y lng∈[-180,180]
- **CA-3** (RF-3) — Dado la polilínea de ejemplo de Google `_p~iF~ps|U_ulLnnqC_mqNvxq`@`, Cuando decodifico con precisión 5, Entonces obtengo 3 puntos (38.5,-120.2)…
- **CA-4** (RF-4) — Dado 48200 m y 23400 s, Cuando formateo, Entonces '48,2 km' (es) y '6:30'
- **CA-5** (RF-5) — Dado `{lat:4.65,lng:-74.08}`, Cuando proyecto, Entonces coincide con `ol.proj.fromLonLat([-74.08,4.65])`

## 6. Diseño y restricciones técnicas

Crear `master/js/modules/services/geo_utils.js`, `polyline_codec.js`, `units.js`. Modificar `decoder_services.js` (delegar o eliminar), `mapsServices.js` (usar GeoUtils). Pruebas `tests/unit/core/geo_*.spec.js`.

**Pantallas y flujos.** No aplica. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Prueba (`[FND-004 CA-n]`) |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | `tests/unit/geo-core/geo_utils.spec.js` |
| T-2 | CA-2 | unitaria | `tests/unit/geo-core/geo_utils.spec.js` |
| T-3 | CA-3 | unitaria | `tests/unit/geo-core/geo_utils.spec.js` |
| T-4 | CA-4 | unitaria | `tests/unit/master-domains-svc/units.spec.js` |
| T-5 | CA-5 | unitaria | `tests/unit/geo-core/geo_utils.spec.js` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-001.
- Riesgos: OpenLayers 3 en `externModules/openLayer3`: verificar API `ol.proj.fromLonLat` disponible en esa versión.
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | `tests/unit/geo-core/geo_utils.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-004/2026-11-20-implementador.md` |
| CA-2 | `tests/unit/geo-core/geo_utils.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-004/2026-11-20-implementador.md` |
| CA-3 | `tests/unit/geo-core/geo_utils.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-004/2026-11-20-implementador.md` |
| CA-4 | `tests/unit/master-domains-svc/units.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-004/2026-11-20-implementador.md` |
| CA-5 | `tests/unit/geo-core/geo_utils.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-004/2026-11-20-implementador.md` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (unidades fijas) | Documentación del backend | — |
| 2026-11-20 | v4: formato de la plantilla harness-engineering | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-20 | Implementación propuesta de F0 a petición del usuario (alcance «Arnés + F0 implementado»), antes de la aprobación formal de la spec: los gates G0 (Lista) y G5 (merge) siguen pendientes de una persona. | Pedido explícito del usuario 2026-11-20 | pendiente |
| 2026-11-20 | CA-2 usa las coordenadas `[lon,lat]` del fixture de lugares: `get__journeys__id.json` no trae waypoints; recapturar una jornada planificada en JOR-003. | Fixture sin waypoints | pendiente |
| 2026-11-20 | `mapsServices.js`, `decoder_services.js` y `pdf_exporter.js` se adaptan en las historias de mapa/exportación (MAE-005, JOR-003, JOR-005, JOR-007), no en F0. | Alcance mínimo de F0 | pendiente |
