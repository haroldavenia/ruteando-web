# JOR-006: Seguimiento de visitas y visitas no atendidas

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f4-jornadas` |
| Clave anterior | F4-06 · `VISITS-TRACKING` |
| Depende de | JOR-003, PAQ-002, MAE-009 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-visits-tracking` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `PATCH /packages/{id}/status/{status}`, `GET /packages`, `GET /package-status-reasons` |
| Maqueta | `docs/ui/maquetas/index.html#jor-006` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Las visitas usaban un mock local (`json/visits.json`). Ahora una visita es una parada con `packageId`; su estado es el del paquete.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listado de visitas desde mock `json/visits.json` y `RoutesHttp.getList` | `visits_controller.js; visits_http.js` | Cambia: paradas de la ruta + `GET /packages/{id}` |
| L2 | Detalle de visita (`app.visits.detail`) | `visits_controller.js `detail`` | Se mantiene con datos del paquete |
| L3 | Ir al mapa de asignados | `visits_controller.js `goToMap`` | Se mantiene |
| L4 | Visitas no atendidas (`app.visitsUnattended`) sin lógica | `visits_unattended/*` | Cambia: paquetes con estado no atendido (filtro de servidor) |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| PATCH | `/api/v1/packages/{id}/status/{status}` | — | Package | 400 | `patch__packages__id__status__status.json` |
| GET | `/api/v1/packages` | `?status=` | Page | — | `get__packages.json` |
| GET | `/api/v1/package-status-reasons` | `?status&active=true` | Motivos | — | — (capturar) |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como operador, quiero seguir el estado de cada visita y registrar motivos, para saber qué se atendió y por qué no.

## 3. Alcance

**Incluye**

- Visitas de una ruta (lista y detalle) con estado, filtro por estado y texto, avance «X de N atendidas», cambio de estado; visitas no atendidas como vista filtrada de paquetes por estado.

**Excluye (no tocar)**

- Reporte de entrega del conductor (`/driver/packages/report`).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/visits/visits_controller.js`
- `master/js/custom/visits_unattended/visit_unattended_controller.js`
- `master/js/custom/visits_unattended/visits_unattended_list_controller.js`
- `master/js/modules/config.js`
- `master/js/modules/services/visits_http.js`
- `master/js/modules/services/visits_store.js`
- `server/sidebar-menu.json`
- `tests/api/visits-tracking.api.test.mjs`
- `tests/e2e/visits-tracking.e2e.mjs`
- `tests/integration/visits-tracking/**`
- `tests/unit/visits-tracking/**`
- `specs/migracion-api-v1/f4-jornadas/evidencia/JOR-006/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Listar las visitas de una ruta con el estado de `packageInfo.status` del detalle de la jornada (sin una petición por paquete) y refrescar recargando la jornada
- **RF-2** — Filtrar por estado y texto
- **RF-3** — Mostrar el avance de visitas atendidas
- **RF-4** — Cambiar el estado de una visita (pesimista; cancelar con confirmación)
- **RF-5** — Ver visitas no atendidas de todas las jornadas
- **RF-6** — Mostrar «No disponible» si un paquete falla

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado una ruta con 15 paradas `delivery`/`pickup`, Entonces las 15 visitas salen del detalle ya cargado sin peticiones adicionales; «Actualizar» vuelve a pedir `GET /journeys/{id}`
- **CA-2** (RF-2) — Dado filtro «Entregado» y texto «calle 100», Entonces solo visitas que cumplen ambos (sin acentos ni mayúsculas)
- **CA-3** (RF-3) — Dado 4 de 10 visitas en `attended`, Entonces «4 de 10 visitas atendidas» y barra al 40 %
- **CA-4** (RF-4) — Dado «Marcar no atendido», Entonces diálogo con motivos de MAE-009 y `PATCH …/status/unattended?reason=…`; la fila cambia tras la respuesta y muestra el motivo
- **CA-5** (RF-5) — Dado «No atendidas», Entonces `GET /packages?status=unattended` paginado
- **CA-6** (RF-6) — Dado una parada sin `packageInfo` (jornada antigua), Entonces esa visita muestra «No disponible»

## 6. Diseño y restricciones técnicas

Crear `visits_store.js`. Eliminar `visits_http.js`, `json/visits.json`, controladores de visitas legacy.

**Pantallas y flujos.** Ruta → Visitas → filtro → cambiar estado. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.visits.* → app.journeys.route.visits` | `pages/journeys/visits.jade` | tenant_admin, super_admin, agent | Re-ubicación |
| `app.visitsUnattended` | `pages/visits_unattended/*` | ídem | Paquetes no atendidos |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[JOR-006 CA-1]` en `tests/unit/visits-tracking/` |
| T-2 | CA-2 | unitaria | Prueba `[JOR-006 CA-2]` en `tests/unit/visits-tracking/` |
| T-3 | CA-3 | unitaria | Prueba `[JOR-006 CA-3]` en `tests/unit/visits-tracking/` |
| T-4 | CA-4 | unitaria | Prueba `[JOR-006 CA-4]` en `tests/unit/visits-tracking/` |
| T-5 | CA-4 | e2e | Prueba `[JOR-006 CA-4]` en `tests/e2e/visits-tracking.e2e.mjs` |
| T-6 | CA-5 | unitaria | Prueba `[JOR-006 CA-5]` en `tests/unit/visits-tracking/` |
| T-7 | CA-5 | e2e | Prueba `[JOR-006 CA-5]` en `tests/e2e/visits-tracking.e2e.mjs` |
| T-8 | CA-6 | unitaria | Prueba `[JOR-006 CA-6]` en `tests/unit/visits-tracking/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: JOR-003, PAQ-002, MAE-009.
- Riesgos: D10, D2.
- Pregunta no bloqueante: Estados que cuentan como «atendido» → Decisión propuesta: Resuelta: `attended` (§8); el conductor los reporta desde la app

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/JOR-006/...` |
| CA-2 | | | `evidencia/JOR-006/...` |
| CA-3 | | | `evidencia/JOR-006/...` |
| CA-4 | | | `evidencia/JOR-006/...` |
| CA-5 | | | `evidencia/JOR-006/...` |
| CA-6 | | | `evidencia/JOR-006/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §8); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-19 | v3: respuesta del backend 2026-11-19 (B3, D14, M3 parcial) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
