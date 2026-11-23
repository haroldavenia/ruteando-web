# FND-005: Sistema de interfaz y maquetas de las pantallas nuevas

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f0-fundaciones` |
| Clave anterior | F0-05 · `UI-SYSTEM` |
| Depende de | FND-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-sistema-ui` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | — |
| Maqueta | `docs/ui/maquetas/index.html#fnd-005` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Definir y construir los componentes y patrones de interfaz que usarán todas las pantallas migradas y nuevas (listado, formulario, detalle, mapa, asistente, estados de carga/vacío/error, diálogos, insignias de estado), sobre el tema Angle/Bootstrap 3 existente, con maquetas navegables como referencia para cada spec.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Listados con paginación de cliente, buscador y selección (`table-checkall`, `pagination`) | `master/js/modules/directives/table-checkall.js; pagination.js` | Cambia: `rw-data-table` con página de servidor |
| L2 | Mensajes con `message.show` / `notify` | `master/js/modules/services/message.js; notify.service.js` | Se mantiene; se usa desde `rw-list-state` y `ErrorMessages` |
| L3 | Confirmaciones con `ngDialog` y plantillas `tpl.*` | `controladores *_controller.js` | Cambia: `rw-confirm` reutilizable |
| L4 | Menú lateral desde `server/sidebar-menu.json` | `modules/controllers/sidebar-menu.js` | Cambia: menú por rol (ACC-005) con iconos y secciones |

### Contrato `/api/v1`

Sin endpoints propios (historia transversal).

## 2. Historia de usuario

Como integrante del equipo (diseño, desarrollo, QA), quiero un sistema de interfaz y maquetas navegables de todas las pantallas, para implementar y revisar cada pantalla contra una referencia común.

## 3. Alcance

**Incluye**

- `docs/ui/sistema-ui.md`, `docs/ui/maquetas/index.html` (todas las pantallas salvo la app móvil del conductor), directivas AngularJS reutilizables (`rw-list-state`, `rw-data-table`, `rw-status-badge`, `rw-confirm`, `rw-form-actions`, `rw-page-head`), estilos en `master/less/app/_ruteando-ui.less`, claves i18n base.

**Excluye (no tocar)**

- Rediseño de marca o cambio de framework CSS.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `docs/ui/**`
- `master/js/modules/directives/rw-*.js`
- `master/less/custom/ruteando-ui.less`
- `master/less/app.less` (import)
- `master/i18n/{es,en,es_AR}.json` (ui.*)
- `tests/helpers/sources.json`
- `tests/unit/sistema-ui/**`
- `tests/integration/master-domains-svc/**` (tonos de insignia)
- `tests/tools/sistema-ui.test.mjs`
- `tests/e2e/sistema-ui.e2e.mjs`
- `.agents/skills/disenar-pantalla/SKILL.md`
- `docs/architecture/adr/0006-sistema-ui.md`
- `specs/migracion-api-v1/f0-fundaciones/evidencia/FND-005/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Documentar tokens (color, tipografía, espaciado), patrones de pantalla y reglas de accesibilidad en `docs/ui/sistema-ui.md`
- **RF-2** — Publicar maquetas HTML navegables de cada pantalla en alcance, con un ancla por spec (`#<id>`)
- **RF-3** — Implementar las directivas base reutilizables con pruebas unitarias
- **RF-4** — Mostrar estados de carga, vacío y error uniformes en listados y detalles
- **RF-5** — Mostrar insignias de estado con color y texto (nunca solo color) desde los catálogos

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado `docs/ui/sistema-ui.md`, Cuando `node tools/specs.mjs lint-ui`, Entonces lista las secciones obligatorias (tokens, componentes, patrones, accesibilidad, i18n) sin faltantes
- **CA-2** (RF-2) — Dado cada spec con cambios de interfaz, Cuando `node tools/specs.mjs lint <ID>`, Entonces su campo Maqueta apunta a un ancla existente en `docs/ui/maquetas/index.html`
- **CA-3** (RF-3) — Dado `<rw-data-table>` con 45 elementos y página 2 de 20, Entonces muestra «21–40 de 45», emite `onPage(2)` al cambiar y la selección persiste entre páginas
- **CA-4** (RF-4) — Dado `<rw-list-state state='error' retry='reload()'>`, Cuando pulso «Reintentar», Entonces se llama `reload()`; con `state='empty'` muestra el texto de vacío y la acción de crear
- **CA-5** (RF-5) — Dado `<rw-status-badge domain='PackageStatus' key='unattended'>`, Entonces muestra la etiqueta del catálogo, un icono y el tono de advertencia
- **CA-6** (RF-3) — Dado la maqueta de paquetes y la pantalla implementada, Cuando corro el E2E visual, Entonces ambas muestran las mismas columnas, acciones y estados

## 6. Diseño y restricciones técnicas

Crear `master/js/modules/directives/rw-*.js`, `master/jade/views/partials/rw-*.jade`, `master/less/app/_ruteando-ui.less`, `docs/ui/**`. Modificar `master/less/app/app.less` (import), `app/i18n/*.json`.

**Pantallas y flujos.** Patrones: listado (cabecera + filtros + tabla/tarjetas + paginación + acciones por fila/lote), formulario (secciones + acciones fijas + cambios sin guardar), detalle (resumen + pestañas), asistente (pasos), mapa (panel lateral + capa). Ver `docs/ui/sistema-ui.md`. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `(transversal)` | `views/partials/rw-*.jade` | todos | Componentes base |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Prueba (`[FND-005 CA-n]`) |
| --- | --- | --- | --- |
| T-1 | CA-1 | arnés | `tests/tools/i18n.test.mjs` |
| T-2 | CA-1 | arnés | `tests/tools/sistema-ui.test.mjs` |
| T-3 | CA-2 | arnés | `tests/tools/sistema-ui.test.mjs` |
| T-4 | CA-3 | unitaria | `tests/unit/sistema-ui/rw_components.spec.js` |
| T-5 | CA-4 | unitaria | `tests/unit/sistema-ui/rw_components.spec.js` |
| T-6 | CA-5 | contrato | `tests/integration/master-domains-svc/master_domains.contract.spec.js` |
| T-7 | CA-5 | unitaria | `tests/unit/sistema-ui/rw_components.spec.js` |
| T-8 | CA-6 | e2e | `tests/e2e/sistema-ui.e2e.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: FND-001.
- Riesgos: El tema Angle usa Bootstrap 3 y jQuery: las directivas no deben depender de plugins nuevos.
- Pregunta no bloqueante: ¿Paleta de marca de Ruteando? → Decisión propuesta: Usar la del tema Angle actual; ajustable por tokens

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | `tests/tools/i18n.test.mjs`, `tests/tools/sistema-ui.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-005/2026-11-20-implementador.md` |
| CA-2 | `tests/tools/sistema-ui.test.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-005/2026-11-20-implementador.md` |
| CA-3 | `tests/unit/sistema-ui/rw_components.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-005/2026-11-20-implementador.md` |
| CA-4 | `tests/unit/sistema-ui/rw_components.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-005/2026-11-20-implementador.md` |
| CA-5 | `tests/integration/master-domains-svc/master_domains.contract.spec.js`, `tests/unit/sistema-ui/rw_components.spec.js` | sin commit (ADR-0001 pendiente) | `evidencia/FND-005/2026-11-20-implementador.md` |
| CA-6 | `tests/e2e/sistema-ui.e2e.mjs` | sin commit (ADR-0001 pendiente) | `evidencia/FND-005/2026-11-20-implementador.md` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-20 | Spec nueva: sistema UI y maquetas (pedido de Harold) | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-20 | Implementación propuesta de F0 a petición del usuario (alcance «Arnés + F0 implementado»), antes de la aprobación formal de la spec: los gates G0 (Lista) y G5 (merge) siguen pendientes de una persona. | Pedido explícito del usuario 2026-11-20 | pendiente |
| 2026-11-20 | Directivas con plantilla en línea (no `rw-*.jade`) para probarlas en Karma sin `templateUrl`; estilos en `master/less/custom/ruteando-ui.less` importado desde `master/less/app.less`. | Probabilidad y convención del tema | pendiente |
| 2026-11-20 | CA-6: la comparación maqueta↔pantalla de paquetes se traslada a PAQ-002 (la pantalla no existe en F0); aquí CA-6 verifica que cada pantalla de la maqueta abre por su ancla, documenta sus estados y el menú respeta el rol. | PAQ-002 aún no implementada | pendiente |
| 2026-11-20 | Maquetas: 33 pantallas (todas las specs con interfaz salvo la app móvil del conductor). | Alcance | pendiente |
