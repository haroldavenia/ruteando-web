# PAQ-002: Paquetes (nuevo módulo persistido, sustituye el itinerario en memoria)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f3-paquetes` |
| Clave anterior | F3-02 · `PACKAGES` |
| Depende de | MAE-004, MAE-006, FND-003, MAE-009 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-packages` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /packages`, `GET /packages/{id}`, `POST /packages`, `PUT /packages/{id}`, `DELETE /packages/{id}`, `PATCH /packages/{id}/status/{status}`, `GET /package-status-reasons` |
| Maqueta | `docs/ui/maquetas/index.html#paq-002` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

El itinerario vivía en memoria (`tempStorageData`) entre la subida del CSV y la optimización. Con la API nueva los paquetes son recursos persistidos: nuevo módulo de paquetes con listado, filtros, CRUD, cambio de estado y exportación.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Tabla de paradas con filtro TODAS/UBICADAS/APROXIMADAS/MANUALES/NO UBICADAS y contadores | `itinerary_controller.js `statusFilter`, `count`` | Cambia: filtro sobre `geocodingStatus` + filtros de servidor `status`/`serviceType` |
| L2 | Quitar una parada / quitar seleccionadas (solo memoria) | `itinerary_controller.js `removePackage`, `removeSelectedPakages`` | Cambia: `DELETE /packages/{id}` (persistente) con confirmación |
| L3 | Añadir/editar parada (formulario, geocodificar, mapa) | `itinerary_form_controller.js` | Cambia: `POST/PUT /packages` |
| L4 | Ver parada en el mapa | `itinerary_controller.js `goToMap`` | Se mantiene |
| L5 | Exportar CSV `imprimirCsv` (20 columnas; bug `weigth`) | `itinerary_controller.js` | Cambia: mismas columnas con datos del paquete; corrige peso; protege fórmulas |
| L6 | Validación de estado por configuración (`evaluateStatus`) | `itinerary_controller.js `$watch('Journey.setting')`` | Cambia: validación previa en JOR-001 |
| L7 | Itinerario en `tempStorageData` / `$stateParams` | `tempStorageData.js` | Se retira |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/packages` | `?page&size&status&serviceType` | Page<Package> (más recientes primero) | 401 | `get__packages.json` |
| GET | `/api/v1/packages/{id}` | — | Package | 400,404 | `get__packages__id.json` |
| POST | `/api/v1/packages` | `{serviceType*(pickup\|delivery\|mixed),guideNumber,name,address,standardizedAddress,location,geocodingScore,geocodingStatus,city,country(2 letras),postalCode,zoneId,weight,volume,pieceNumber,measure,durationStay(s),timeWindow{startUtc,endUtc},category,goodsTags,customerId,receiver{name,phone,email},sender{…},observation,status}` | 201 | 400,409 guía duplicada | `post__packages.json` |
| PUT | `/api/v1/packages/{id}` | registro completo sin solo-lectura | 200 | 400,404,409 | `put__packages__id.json` |
| DELETE | `/api/v1/packages/{id}` | — | 204 | 404, 409 en jornada | `delete__packages__id.json` |
| PATCH | `/api/v1/packages/{id}/status/{status}` | `?reason=<key>` opcional | Package con `statusReason` | 400 estado inválido, 422 motivo inexistente/inactivo/no aplica | `patch__packages__id__status__status.json` |
| GET | `/api/v1/package-status-reasons` | `?status&active=true` | Motivos del tenant que aplican al estado | — | — (capturar) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero gestionar paquetes persistidos con su estado y ubicación, para prepararlos para planificar y seguirlos.

## 3. Alcance

**Incluye**

- Listado paginado con filtros `status`, `serviceType` y estado de geocodificación (cliente), contadores ubicadas/aproximadas/manuales/no ubicadas, alta/edición (guía, nombre, servicio, dirección, ubicación, ciudad, país, CP, zona, peso, volumen, piezas, estancia, ventana horaria, remitente, destinatario, observación), geocodificar/mapa, borrado individual/lote, cambio de estado, exportar CSV con columnas legacy.

**Excluye (no tocar)**

- Carga masiva (PAQ-003); selección para planificar (JOR-001).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/packages/**`
- `master/js/custom/itinerary/itinerary_controller.js`
- `master/js/custom/itinerary/itinerary_form_controller.js`
- `master/js/custom/packages/**`
- `master/js/modules/config.js`
- `master/js/modules/services/csv_writer.js`
- `master/js/modules/services/itinerary_model.js`
- `master/js/modules/services/packages.api.js`
- `master/js/modules/services/tempStorageData.js`
- `server/sidebar-menu.json`
- `tests/api/packages.api.test.mjs`
- `tests/e2e/packages.e2e.mjs`
- `tests/integration/packages/**`
- `tests/unit/packages/**`
- `specs/migracion-api-v1/f3-paquetes/evidencia/PAQ-002/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar paquetes con filtros de servidor por estado y tipo de servicio
- **RF-2** — Filtrar y contar por estado de geocodificación
- **RF-3** — Crear y editar paquetes con geocodificación o punto en mapa
- **RF-4** — Borrar uno o varios con informe
- **RF-5** — Cambiar el estado de uno o varios (solo valores activos; cancelar pide confirmación)
- **RF-6** — Exportar a CSV con las columnas legacy
- **RF-7** — Ver un paquete en el mapa
- **RF-8** — Identificar los paquetes «listos para rutear» (con `location` y `geocodingStatus` `match` o `manual`)
- **RF-9** — Pedir un motivo (`reason`) al cambiar a un estado que tenga motivos activos, y mostrar `statusReason` en el listado
- **RF-10** — Ordenar en servidor por fecha, guía, nombre, estado, servicio, ciudad o estado de geocodificación (`sort`)

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado filtro estado=pending y servicio=delivery, Entonces `GET /packages?page=0&size=20&status=pending&serviceType=delivery`
- **CA-2** (RF-2) — Dado la página, Entonces los contadores ubicadas/aproximadas/manuales/no ubicadas suman el total de la página y el filtro reduce filas
- **CA-3** (RF-3) — Dado guía vacía, Entonces `POST` sin `guideNumber`; dado 409, Entonces «Ya existe un paquete con ese número de guía»
- **CA-4** (RF-3) — Dado nuevo paquete con dirección, Cuando geocodifico y guardo, Entonces aparece con estado de geocodificación
- **CA-5** (RF-4) — Dado «Atendido», Entonces `PATCH /packages/{id}/status/attended`; el menú ofrece solo valores activos de `PackageStatus` (`pending`, `attended`, `unattended`, `cancelled`); cancelar pide confirmación
- **CA-6** (RF-5) — Dado «Entregado», Entonces `PATCH /packages/{id}/status/delivered`; el menú no ofrece `returned` ni `demo_*`
- **CA-7** (RF-6) — Dado paquetes, Cuando exporto, Entonces CSV `;` con cabecera `ID_GUIA;LONGITUD;LATITUD;CIUDAD;PAIS;DIRECCION;DIRECCION ESTANDARIZADA;PRECISION;ESTADO DE GEOCODIFICACION;ESTADIA;VOLUMEN;PESO;ZONA;NUM_PIEZAS;CODIGO_POSTAL;REMITENTE;TEL_REMITENTE;DESTINATARIO;TEL_DESTINATARIO;OBSERVACIONES;`, peso correcto y `'=` protegido
- **CA-8** (RF-7) — Dado una fila, Cuando «Ver en mapa», Entonces el mapa centra el punto
- **CA-9** (RF-8) — Dado paquetes con estados `match`, `mean`, `unmatch` y `manual`, Entonces el indicador «listos para rutear» cuenta solo `match` y `manual` con ubicación
- **CA-10** (RF-3) — Dado una geocodificación confirmada, Cuando guardo, Entonces el cuerpo lleva `address`, `standardizedAddress`, `location`, `geocodingScore`, `geocodingStatus`, `city` y `country` en 2 letras
- **CA-11** (RF-9) — Dado cambiar a `unattended` con motivos activos, Entonces el diálogo ofrece `GET /package-status-reasons?status=unattended&active=true` y envía `PATCH …/status/unattended?reason=customer_absent`; dado 422, Entonces «El motivo ya no aplica»
- **CA-12** (RF-3) — Dado peso 2,5 kg y volumen 0,015 m³ en el formulario, Entonces se envía `weight:2500` y `volume:15000` (g, cm³); dado 409 `details.field:'guideNumber'`, Entonces el error va al campo guía
- **CA-13** (RF-4) — Dado borrar un paquete incluido en una jornada (409 `referencedBy:'journeys'`), Entonces «Está en N jornadas» y no se borra
- **CA-14** (RF-10) — Dado clic en la columna Guía, Entonces `GET /packages?…&sort=guideNumber,asc` y la tabla deja de ordenar en cliente

## 6. Diseño y restricciones técnicas

Crear `packages.api.js`, `custom/packages/*`, `pages/packages/*`, `csv_writer.js`. Eliminar `itinerary_*`, `itinerary_model.js`, `tempStorageData.js` (si queda sin uso).

**Pantallas y flujos.** Paquetes → filtros → acciones por fila/lote → exportar. «Planificar con seleccionados» lleva a JOR-001. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.packages.list/add/edit (nuevo; sustituye app.itinerary.*)` | `pages/packages/*` | tenant_admin, super_admin, agent | Nuevo módulo; `app.itinerary.*` redirige |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[PAQ-002 CA-1]` en `tests/unit/packages/` |
| T-2 | CA-1 | contrato | Prueba `[PAQ-002 CA-1]` en `tests/integration/packages/` |
| T-3 | CA-1 | e2e | Prueba `[PAQ-002 CA-1]` en `tests/e2e/packages.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[PAQ-002 CA-2]` en `tests/unit/packages/` |
| T-5 | CA-3 | unitaria | Prueba `[PAQ-002 CA-3]` en `tests/unit/packages/` |
| T-6 | CA-3 | contrato | Prueba `[PAQ-002 CA-3]` en `tests/integration/packages/` |
| T-7 | CA-4 | e2e | Prueba `[PAQ-002 CA-4]` en `tests/e2e/packages.e2e.mjs` |
| T-8 | CA-5 | unitaria | Prueba `[PAQ-002 CA-5]` en `tests/unit/packages/` |
| T-9 | CA-5 | e2e | Prueba `[PAQ-002 CA-5]` en `tests/e2e/packages.e2e.mjs` |
| T-10 | CA-6 | unitaria | Prueba `[PAQ-002 CA-6]` en `tests/unit/packages/` |
| T-11 | CA-6 | contrato | Prueba `[PAQ-002 CA-6]` en `tests/integration/packages/` |
| T-12 | CA-6 | e2e | Prueba `[PAQ-002 CA-6]` en `tests/e2e/packages.e2e.mjs` |
| T-13 | CA-7 | unitaria | Prueba `[PAQ-002 CA-7]` en `tests/unit/packages/` |
| T-14 | CA-8 | e2e | Prueba `[PAQ-002 CA-8]` en `tests/e2e/packages.e2e.mjs` |
| T-15 | CA-9 | unitaria | Prueba `[PAQ-002 CA-9]` en `tests/unit/packages/` |
| T-16 | CA-10 | unitaria | Prueba `[PAQ-002 CA-10]` en `tests/unit/packages/` |
| T-17 | CA-10 | contrato | Prueba `[PAQ-002 CA-10]` en `tests/integration/packages/` |
| T-18 | CA-11 | unitaria | Prueba `[PAQ-002 CA-11]` en `tests/unit/packages/` |
| T-19 | CA-11 | contrato | Prueba `[PAQ-002 CA-11]` en `tests/integration/packages/` |
| T-20 | CA-12 | unitaria | Prueba `[PAQ-002 CA-12]` en `tests/unit/packages/` |
| T-21 | CA-12 | contrato | Prueba `[PAQ-002 CA-12]` en `tests/integration/packages/` |
| T-22 | CA-13 | unitaria | Prueba `[PAQ-002 CA-13]` en `tests/unit/packages/` |
| T-23 | CA-14 | unitaria | Prueba `[PAQ-002 CA-14]` en `tests/unit/packages/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: MAE-004, MAE-006, FND-003, MAE-009.
- Riesgos: D2, D3, D8.
- Pregunta no bloqueante: ¿Exponer `timeWindow` y `measure`? → Decisión propuesta: Sí, opcionales
- Pregunta no bloqueante: Estados de paquete → Decisión propuesta: Resuelta (§8)

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/PAQ-002/...` |
| CA-2 | | | `evidencia/PAQ-002/...` |
| CA-3 | | | `evidencia/PAQ-002/...` |
| CA-4 | | | `evidencia/PAQ-002/...` |
| CA-5 | | | `evidencia/PAQ-002/...` |
| CA-6 | | | `evidencia/PAQ-002/...` |
| CA-7 | | | `evidencia/PAQ-002/...` |
| CA-8 | | | `evidencia/PAQ-002/...` |
| CA-9 | | | `evidencia/PAQ-002/...` |
| CA-10 | | | `evidencia/PAQ-002/...` |
| CA-11 | | | `evidencia/PAQ-002/...` |
| CA-12 | | | `evidencia/PAQ-002/...` |
| CA-13 | | | `evidencia/PAQ-002/...` |
| CA-14 | | | `evidencia/PAQ-002/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §8, GEOCODING_API §3); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B6, D2, D3, D14, D16, B8, unidades) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
