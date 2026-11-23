# JOR-005: Exportaciones PDF/XLSX de jornadas y rutas

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f4-jornadas` |
| Clave anterior | F4-05 · `JOURNEY-EXPORTS` |
| Depende de | JOR-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-journey-exports` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | — |
| ADR relacionados | ADR-0002, ADR-0004 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Adaptar `PdfExporter` y `XlsxExporter` al nuevo modelo de jornada (rutas y waypoints) conservando los informes actuales.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | XLSX multi-hoja de la jornada | `xlsx_exporter.js:36` | Cambia: desde `routes[].waypoints` |
| L2 | XLSX de visitas de una ruta | `xlsx_exporter.js:52` | Cambia |
| L3 | PDF de jornada/ruta con minutos, km, m³ | `pdf_exporter.js` | Cambia: unidades de FND-004 |

### Contrato `/api/v1`

Sin endpoints propios (historia transversal).

## 2. Historia de usuario

Como operador, quiero exportar jornadas y rutas a PDF y Excel, para compartir el plan fuera del sistema.

## 3. Alcance

**Incluye**

- XLSX de jornada (una hoja por ruta, `getReportJourneyVisitList`), XLSX de ruta (`getReportVisitList`), PDF de jornada y de ruta, protección contra fórmulas.

**Excluye (no tocar)**

- —
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `master/js/custom/journeys/journeys_controller.js`
- `master/js/custom/routes/route_detail_controller.js`
- `master/js/custom/routes/routes_controller.js`
- `master/js/modules/services/pdf_exporter.js`
- `master/js/modules/services/xlsx_exporter.js`
- `tests/api/journey-exports.api.test.mjs`
- `tests/e2e/journey-exports.e2e.mjs`
- `tests/integration/journey-exports/**`
- `tests/unit/journey-exports/**`
- `specs/migracion-api-v1/f4-jornadas/evidencia/JOR-005/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Exportar la jornada a XLSX con una hoja por ruta
- **RF-2** — Exportar una ruta a XLSX
- **RF-3** — Exportar jornada y ruta a PDF
- **RF-4** — Proteger celdas contra inyección de fórmulas

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado el fixture, Entonces el libro tiene tantas hojas como rutas y columnas secuencia, tipo, guía, dirección, llegada, salida, distancia, duración
- **CA-2** (RF-2) — Dado una ruta, Entonces XLSX con sus paradas
- **CA-3** (RF-3) — Dado el detalle, Cuando «PDF», Entonces se descarga un PDF con cabecera de jornada y tabla de paradas
- **CA-4** (RF-4) — Dado una dirección `=HYPERLINK(...)`, Entonces la celda empieza por `'`

## 6. Diseño y restricciones técnicas

Modificar `pdf_exporter.js`, `xlsx_exporter.js` con adaptadores `journeyToRows`.

**Pantallas y flujos.** Botones Exportar en listado, detalle y ruta. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[JOR-005 CA-1]` en `tests/unit/journey-exports/` |
| T-2 | CA-1 | contrato | Prueba `[JOR-005 CA-1]` en `tests/integration/journey-exports/` |
| T-3 | CA-2 | unitaria | Prueba `[JOR-005 CA-2]` en `tests/unit/journey-exports/` |
| T-4 | CA-3 | unitaria | Prueba `[JOR-005 CA-3]` en `tests/unit/journey-exports/` |
| T-5 | CA-3 | e2e | Prueba `[JOR-005 CA-3]` en `tests/e2e/journey-exports.e2e.mjs` |
| T-6 | CA-4 | unitaria | Prueba `[JOR-005 CA-4]` en `tests/unit/journey-exports/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: JOR-003.
- Riesgos: —
- Preguntas abiertas: ninguna.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/JOR-005/...` |
| CA-2 | | | `evidencia/JOR-005/...` |
| CA-3 | | | `evidencia/JOR-005/...` |
| CA-4 | | | `evidencia/JOR-005/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
