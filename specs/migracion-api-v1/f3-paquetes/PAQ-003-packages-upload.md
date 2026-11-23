# PAQ-003: Carga masiva de paquetes por CSV

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f3-paquetes` |
| Clave anterior | F3-03 · `PACKAGES-UPLOAD` |
| Depende de | PAQ-002 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-packages-upload` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /packages/upload`, `GET /packages/upload/limits` |
| Maqueta | `docs/ui/maquetas/index.html#paq-003` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Sustituir `POST /journey/upload?name=` (que devolvía un itinerario en memoria) por la carga de paquetes persistidos `POST /packages/upload` (multipart), con ayuda y plantilla.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | FileUploader con filtros `checkName`, `extensionFilter`, `sizeFilter`, `queeReset` | `journeys_form_controller.js` | Se mantiene (sin `checkName`) |
| L2 | Vista previa de archivo (nombre, tamaño) y cancelar | `journeys_form_controller.js `cancelPreview`` | Se mantiene |
| L3 | Subida con `?name=` y Bearer; respuesta `routes[0].packages` → itinerario | `journeys_form_controller.js `onCompleteItem`` | Cambia: respuesta = resumen de paquetes creados; navega a paquetes filtrados |
| L4 | Mensaje de error `response.message` | `journeys_form_controller.js` | Cambia: `ApiError` por código |
| L5 | Pantalla de ayuda del archivo (`app.journeys.help`) | `journey_fileHelp_controller.js` | Se mantiene como `app.packages.uploadHelp` con plantilla |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/packages/upload` | multipart `file`; CSV con `,` o `;`, BOM y comillas; columnas `guideNumber,name,address,city,country,postalCode,longitude,latitude,weight(g),volume(cm³),serviceType,observation,category` | 200 `{totalRows,successCount,errorCount,errors[{row,message}]}`; guías repetidas o existentes van en `errors[]` | 400 vacío/no CSV/sin columna `address`; 422 `details{limit,rows}` si supera el tope (no guarda nada) | — (capturar con sonda) |
| GET | `/api/v1/packages/upload/limits` | — | `{maxRows:10000,maxAddressesPerFile,effectiveLimit}` (todos los roles) | 401 | — (capturar con sonda) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero cargar paquetes masivamente desde un CSV, para no crearlos uno a uno.

## 3. Alcance

**Incluye**

- Selección de archivo con validaciones (CSV, tamaño > 0, reemplazo de cola), vista previa, subida, resumen creados/errores con descarga del informe, ayuda de formato y plantilla descargable.

**Excluye (no tocar)**

- Nombre de jornada (pasa a JOR-001).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/journeys/journey_fileHelp_controller.js`
- `master/js/custom/journeys/journeys_form_controller.js`
- `master/js/custom/packages/upload_controller.js/**`
- `master/js/modules/config.js`
- `master/js/modules/services/journey_fileHelp_controller.js`
- `master/js/modules/services/journeys_form_controller.js`
- `server/sidebar-menu.json`
- `tests/api/packages-upload.api.test.mjs`
- `tests/e2e/packages-upload.e2e.mjs`
- `tests/integration/packages-upload/**`
- `tests/unit/packages-upload/**`
- `specs/migracion-api-v1/f3-paquetes/evidencia/PAQ-003/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Seleccionar un CSV válido con vista previa y cancelar
- **RF-2** — Subir el archivo y mostrar progreso
- **RF-3** — Mostrar el resumen de filas creadas y con error, con descarga del informe
- **RF-4** — Consultar la ayuda de formato y descargar la plantilla
- **RF-5** — Ir al listado de paquetes recién creados
- **RF-6** — Validar el tope antes de subir con `effectiveLimit` de `GET /packages/upload/limits`

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `datos.xlsx` o un CSV de 0 bytes, Entonces aviso de tipo/tamaño y no se encola
- **CA-2** (RF-2) — Dado un CSV válido, Cuando subo, Entonces multipart a `/api/v1/packages/upload` con Bearer y barra de progreso
- **CA-3** (RF-3) — Dado `{totalRows:150,successCount:148,errorCount:2,errors:[{row:45,…}]}` con HTTP 200, Entonces resumen «148 creados, 2 con error», tabla de errores con fila y motivo y CSV descargable
- **CA-4** (RF-4) — Dado «Ayuda», Entonces veo las 13 columnas del contrato y descargo la plantilla con esa cabecera
- **CA-5** (RF-5) — Dado éxito, Cuando «Ver paquetes», Entonces listado de paquetes
- **CA-6** (RF-2) — Dado backend real, Cuando la sonda sube el CSV de ejemplo, Entonces la respuesta se captura como fixture saneado
- **CA-7** (RF-6) — Dado `effectiveLimit = 5000` y un CSV de 6000 filas, Entonces aviso y no se sube; si aun así llega 422 `details{limit,rows}`, Entonces «El archivo tiene 6000 filas; el máximo es 5000»
- **CA-8** (RF-3) — Dado errores «is repeated in the file» y «already exists», Entonces la tabla los agrupa como «Guía duplicada» con su fila, y `successCount` es lo realmente guardado
- **CA-9** (RF-4) — Dado la plantilla, Entonces las columnas `weight` y `volume` indican gramos y cm³

## 6. Diseño y restricciones técnicas

Crear `custom/packages/upload_controller.js`, vistas, `packages.api.js#upload`. Eliminar `journeys_form_controller.js` (parte de subida), `journey_fileHelp_controller.js` (movido).

**Pantallas y flujos.** Paquetes → Importar CSV → elegir → vista previa → subir → resumen → ver paquetes / planificar. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.journeys.add → app.packages.upload; app.journeys.help → app.packages.uploadHelp` | `pages/packages/upload*.jade` | tenant_admin, super_admin, agent | División: la subida ya no crea jornada |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[PAQ-003 CA-1]` en `tests/unit/packages-upload/` |
| T-2 | CA-2 | unitaria | Prueba `[PAQ-003 CA-2]` en `tests/unit/packages-upload/` |
| T-3 | CA-2 | e2e | Prueba `[PAQ-003 CA-2]` en `tests/e2e/packages-upload.e2e.mjs` |
| T-4 | CA-3 | unitaria | Prueba `[PAQ-003 CA-3]` en `tests/unit/packages-upload/` |
| T-5 | CA-3 | contrato | Prueba `[PAQ-003 CA-3]` en `tests/integration/packages-upload/` |
| T-6 | CA-3 | e2e | Prueba `[PAQ-003 CA-3]` en `tests/e2e/packages-upload.e2e.mjs` |
| T-7 | CA-4 | e2e | Prueba `[PAQ-003 CA-4]` en `tests/e2e/packages-upload.e2e.mjs` |
| T-8 | CA-5 | e2e | Prueba `[PAQ-003 CA-5]` en `tests/e2e/packages-upload.e2e.mjs` |
| T-9 | CA-6 | sonda API | Prueba `[PAQ-003 CA-6]` en `tests/api/packages-upload.api.test.mjs` |
| T-10 | CA-7 | unitaria | Prueba `[PAQ-003 CA-7]` en `tests/unit/packages-upload/` |
| T-11 | CA-7 | contrato | Prueba `[PAQ-003 CA-7]` en `tests/integration/packages-upload/` |
| T-12 | CA-8 | unitaria | Prueba `[PAQ-003 CA-8]` en `tests/unit/packages-upload/` |
| T-13 | CA-9 | unitaria | Prueba `[PAQ-003 CA-9]` en `tests/unit/packages-upload/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: PAQ-002.
- Riesgos: —
- Pregunta no bloqueante: Tope de filas para agent → Decisión propuesta: Resuelta (D5): `/packages/upload/limits`

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/PAQ-003/...` |
| CA-2 | | | `evidencia/PAQ-003/...` |
| CA-3 | | | `evidencia/PAQ-003/...` |
| CA-4 | | | `evidencia/PAQ-003/...` |
| CA-5 | | | `evidencia/PAQ-003/...` |
| CA-6 | | | `evidencia/PAQ-003/...` |
| CA-7 | | | `evidencia/PAQ-003/...` |
| CA-8 | | | `evidencia/PAQ-003/...` |
| CA-9 | | | `evidencia/PAQ-003/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §16.3, GEOCODING_API §4); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B7, D5, D16) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
