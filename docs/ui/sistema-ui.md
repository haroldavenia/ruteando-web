# Sistema UI de ruteando-web

Referencia de diseño de la migración a `/api/v1` (FND-005, ADR-0006). Se apoya en el tema Angle/Bootstrap 3 que ya usa la app: no cambia el framework CSS, añade tokens, componentes `rw-*` y patrones de pantalla. Las maquetas navegables están en [`maquetas/index.html`](maquetas/index.html) (una sección por spec, ancla `#<id>`; selector de rol arriba a la derecha).

Fuentes: estilos en `master/less/custom/ruteando-ui.less`; directivas en `master/js/modules/directives/rw-*.js`; textos en `master/i18n/{es,en,es_AR}.json` (`ui.*`, `errors.*`).

## 1. Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `@rw-primary` | `#5d9cec` | Acción principal, enlaces, selección, foco |
| `@rw-success` | `#27c24c` | Atendido, activo, coincidencia exacta |
| `@rw-info` | `#23b7e5` | Pendiente, planificando, aproximada |
| `@rw-warning` | `#ff902b` | No atendido, vencido, cambios sin guardar |
| `@rw-danger` | `#f05050` | Errores, acciones destructivas, sin resultado |
| `@rw-muted` | `#909fa7` | Inactivo, cancelado, textos secundarios |
| `@rw-text` / `@rw-canvas` / `@rw-surface` / `@rw-border` | `#3a3f51` / `#f5f7fa` / `#fff` / `#e4eaec` | Texto, fondo de página, tarjetas, bordes |
| Espaciado | 4 · 8 · 16 · 24 px (`@rw-space-1..4`) | Márgenes y rellenos; nada fuera de la escala |
| Radio | 4 px | Tarjetas, botones, campos; insignias 10 px |
| Tipografía | Source Sans Pro (Angle) 14 px; títulos de pantalla 20 px; etiquetas de campo 12 px | — |
| Foco | `0 0 0 3px` primario al 45 % | Todo control interactivo |

Tonos de insignia (`rw-badge-<tono>`): `success`, `info`, `warning`, `danger`, `primary`, `muted`. Texto oscurecido sobre fondo al 15 % para contraste ≥ 4.5:1.

## 2. Componentes

| Componente | Uso | API |
| --- | --- | --- |
| `<rw-page-head>` | Cabecera de toda pantalla | `title`, `subtitle` (claves i18n); acciones por transclusión (máx. 1 primaria) |
| `<rw-list-state>` | Cargando / vacío / error con «Reintentar» | `state` (`loading`\|`empty`\|`error`\|`ready`), `retry()`, `create()`, `empty-text`, `error-text` (texto de `ErrorMessages`) |
| `<rw-data-table>` | Listados con página de servidor | `items`, `total`, `page` (base 0), `size`, `columns[{key,label,sortable,format}]`, `actions[{label,icon,danger,visible,onClick}]`, `selection` (ids, persiste entre páginas), `sort`, `on-page(page)`, `on-sort(sort)` |
| `<rw-status-badge>` | Estado con color + icono + texto | `domain` (`PackageStatus`, `JourneyStatus`, `GeocodingStatus`, `Active`, `InvitationStatus`), `key`, `label` opcional; etiqueta del catálogo (`MasterDomains`) |
| `RwConfirm.ask()` / `rw-confirm` | Confirmar acciones destructivas o irreversibles | `{title, message, params, confirmText, danger}` → promesa; usa `$modal` de ui-bootstrap |
| `<rw-form-actions>` | Barra fija de Guardar/Cancelar | `form`, `saving`, `on-cancel()`, `submit-text`; deshabilita Guardar si el formulario es inválido o está guardando; avisa de cambios sin guardar |
| `ErrorMessages.for(error, overrides)` | Texto de un `ApiError` | Override de pantalla → código del backend → estado HTTP |
| `domainLabel` (filtro) | Etiqueta de una clave de catálogo | `{{ p.type \| domainLabel:'PlaceType' }}` |
| `Units.display/toApi` | Mostrar y capturar magnitudes | g↔kg, cm³↔m³, cm↔m, m→km, s→h:mm |

Iconos: Font Awesome 4 del tema (`fa-*`), siempre con `aria-hidden="true"` y texto o `aria-label` al lado.

## 3. Patrones de pantalla

**Listado** (`MAE-*`, `PAQ-002`, `JOR-002`, `EMP-001`…): `rw-page-head` con acción primaria «+ Nuevo» → filtros de servidor en una fila (búsqueda, selects de catálogo, «solo activos») → `rw-data-table` con orden por las columnas de la lista blanca (`apiConfig.sortable`) → barra de lote cuando hay selección (eliminar, cambiar estado) → pie con rango «21–40 de 45» y paginación. Estados con `rw-list-state`. Borrado por lote con `ApiClient.runBulk` y **informe**: «3 eliminados, 1 no se pudo: lo usan 2 configuraciones» (409 `details.referencedBy`).

**Formulario** (alta/edición): secciones con `<fieldset>` y leyenda; campos obligatorios con `*`; ayuda bajo el campo (formato, unidad de captura); errores de `VALIDATION_ERROR` (`details`) junto a su campo y resumen arriba; `rw-form-actions` fija abajo. Unidades: se captura en kg/m³/m/min y se envía en g/cm³/cm/s (`Units.toApi`). `PUT` sustituye el registro: el servicio reenvía el registro completo sin campos de solo lectura. Volver con `returnTo` cuando se llegó desde otro flujo.

**Detalle**: cabecera con KPI (`.kpis`) → pestañas o paneles (rutas, paradas, línea de tiempo) → mapa a la derecha en pantallas ≥ 1100 px.

**Asistente** (`JOR-001`, `PAQ-003`): pasos numerados; el botón final se deshabilita durante el envío; espera larga no bloqueante con mensaje («hasta 3 min»); la selección se conserva si falla.

**Mapa** (`MAE-005/006`, `JOR-003/007`, `SEG-001`): OpenLayers 3 con `GeoUtils.toWebMercator`; panel lateral con la lista equivalente (alternativa accesible); colores por ruta en orden primario, success, warning, `#7266ba`; marcador gris para posiciones de más de 15 min.

**Acceso** (`ACC-*`, aceptar invitación): tarjeta centrada sobre fondo primario; mensajes por código (sin revelar si un correo existe en recuperación).

Mapa de pantallas → specs: índice de [`maquetas/index.html`](maquetas/index.html). La app móvil del conductor queda fuera; la gestión web de conductores (MAE-003) y su asignación a vehículos (MAE-002) están dentro.

## 4. Accesibilidad

- Estados con texto e icono, nunca solo color (insignias, posiciones antiguas, cambios sin guardar).
- Foco visible en todo control; orden de tabulación natural; atajos no obligatorios.
- Todo campo con `<label>`; errores asociados al campo (`aria-describedby`) y anunciados (`role="alert"`).
- `rw-list-state` usa `role="status"` y `aria-live="polite"`; las columnas ordenables exponen `aria-sort`.
- Botones solo con icono llevan `aria-label` y `title` traducidos.
- Diálogos con `aria-labelledby` y foco atrapado (ui-bootstrap `$modal`).
- Mapas con alternativa en tabla (vértices de zona, paradas, conductores).
- Contraste ≥ 4.5:1 para texto (tonos oscurecidos de las insignias).

## 5. Textos e i18n

- Todo texto nuevo pasa por `angular-translate` con clave en `es`, `en` y `es_AR` (`master/i18n/*.json`; Gulp los copia a `app/i18n`). Prueba: `tests/tools/i18n.test.mjs`.
- Espacios de nombres: `ui.*` (componentes), `errors.code.*` y `errors.status.*` (`ErrorMessages`), `<modulo>.*` por pantalla (`places.title`, `places.errors.duplicate`).
- Tono: tú en `es`, vos en `es_AR`; frases cortas en imperativo para acciones («Guardar», «Reintentar»); mensajes de error que dicen qué pasó y qué hacer.
- Datos del backend siempre como texto (`ng-bind` / `{{ }}`); nunca `ng-bind-html` con datos del servidor.
- Números con separadores del idioma (`Units.formatNumber`); fechas en la zona horaria de la empresa (`tenants/me.timezone`).
