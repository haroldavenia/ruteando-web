# Design

## Context

Ver proposal.md (Why). Estado observado en el código:

- **Tema:** `styles.scss` define el tema claro en `html` y `features/access/_access-theme.scss` define otro, claro y oscuro (`theme-type: color-scheme`), acotado a `.access-theme`. Ya se comprobó (pruebas de contraste y navegador) que `light-dark()` con `color-scheme` funciona y cumple 4,5 a 1 y 3 a 1.
- **Shell:** `layout/shell.component.*` usa `mat-toolbar color="primary"` con un override para teñirlo de `primary`, `mat-sidenav` de 240 px con `mat-nav-list`, `.content { padding: 16px }` sin ancho máximo, y la entrada activa ya usa `secondary-container`. El menú sale de `layout/nav-items.ts` (`navItemsFor`).
- **Compartidos:** `PageHeaderComponent` (h1 `headline-small` y acciones), `DataTableComponent` (filtro, `mat-table`, estados de carga, vacío y error con estilos propios, `.visually-hidden`, `.swatch`), `FormResultComponent`, `PasswordFieldComponent`, `ConfirmDialogComponent`.
- **Estilos repetidos:** 24 componentes declaran los suyos (títulos, `dl.summary`, `h2`, tablas internas, `.visually-hidden`); `journey-detail`, `route-detail`, `journey-routes` y `route-visits` repiten la rejilla de resumen y la tabla.
- **Estados** se muestran como texto plano en tablas (`journeyStatusLabel`, `packageStatusLabel`, `statusText` de visitas).
- **Pruebas** que dependen del DOM y se deben conservar: `dl.summary > div > dt/dd` del detalle, `caption.visually-hidden` de las tablas, `tr.route`, `tr.stops`, `[role=status]`, `[role=alert]`, etiquetas `aria-label` de botones.
- **Mapas:** `MapViewComponent`, `RoutesMapComponent` y el editor de polígonos usan teselas de OpenStreetMap (claras) con contenedores de alto fijo.
- **Presupuesto:** `anyComponentStyle` 2 kB de aviso y 4 kB de error; centralizar estilos en un parcial global ayuda.

## Goals / Non-Goals

**Goals:**
- Que toda la aplicación comparta la línea de diseño de la vista de acceso, en claro y oscuro, con un solo tema.
- Concentrar el estilo común (página, superficie, resumen, estados) en un sistema, para que las pantallas no lo repitan.
- Cero cambios de comportamiento, de rutas, de peticiones y de la estructura semántica que usan las pruebas y los lectores de pantalla.

**Non-Goals:**
- Interruptor manual de tema ni recordar la preferencia.
- Teselas del mapa en oscuro (se dejan las claras; el contenedor sí se adapta).
- Rediseñar la lógica o el flujo de ninguna pantalla, ni añadir ilustraciones nuevas.
- Un sistema de diseño separado como librería: es un parcial y unos componentes dentro de la aplicación.

## Decisions

1. **Un solo tema, en el `html`.** `styles.scss` pasa a `color-scheme: light dark` con `mat.theme(... theme-type: color-scheme)` y se borra el bloque de tema de `_access-theme.scss` (queda en él solo el estilo común de las pantallas de acceso). `.access-theme` sigue existiendo como ámbito de esos estilos, ya sin tokens propios. La prueba que asegura que «fuera de la clase el tema sigue claro» se sustituye por una que asegura que todo el documento cambia con `color-scheme`. Alternativa: mantener dos temas; descartada, es justo lo que se quiere quitar.
2. **Parcial global del sistema de interfaz** `shared/ui/_ui-system.scss`, cargado desde `styles.scss`, con selectores de baja especificidad (`:where`) y clases pequeñas: `.page` (contenedor centrado, `max-width` ~1200 px, espaciado vertical), `.card` (superficie redondeada de 20 px con borde `outline-variant` y relleno), `.card-title`, `.stat-grid` y `.stat` (rejilla de datos resumen que sustituye a la de cada detalle, manteniendo el marcado `dl.summary > div > dt/dd`), `.section` (separación entre bloques), `.visually-hidden` único. Los componentes dejan de declarar títulos, `dl` y `visually-hidden` propios. Alternativa: componentes `app-card` y `app-page`; descartada para no tocar el marcado de cada plantilla y las pruebas que dependen de él.
3. **`StatusBadgeComponent`** (`app-status-badge`, entradas `label` y `tone`: `neutral`, `success`, `info`, `warning`, `danger`) con icono y texto; el icono es `aria-hidden` y el tono usa pares de tokens del tema (`*-container` con `on-*-container`) para que cumpla 4,5 a 1 en ambos temas. Una función pura `statusTone(domain, key)` decide el tono: paquetes (`attended` éxito, `pending` neutro, `unattended` aviso, `cancelled` peligro, desconocido neutro), jornadas (`planned`/`completed` éxito/info, `failed`/`cancelled` peligro, `in_progress` info) y visitas («No disponible» neutro). Alternativa: `mat-chip`; descartada porque su semántica de selección no aplica y su alto fijo choca con las tablas.
4. **Shell:** la barra pasa a `surface-container` con borde inferior (sin el override de `primary`), con `BrandComponent` (que sube a `shared/brand/` y gana una variante compacta por entrada `size`) y un botón avatar con las iniciales. El menú lateral lleva un encabezado con la marca, subencabezados de sección ya existentes en versión más discreta, entradas con radio de píldora y la activa con `secondary-container`, `aria-current="page"` (ya presente) y borde de acento. El contenido va en `.page` dentro de `mat-sidenav-content`. Se conserva `nav-items.ts`, los breakpoints y el menú de usuario con la confirmación.
5. **Tabla de datos:** `DataTableComponent` envuelve filtro, tabla y paginador en una `.card` con cabecera; cabecera de columnas en `surface-container`, filas con `hover`, y los bloques de carga, vacío y error pasan a un único bloque con icono reutilizable. Las columnas de estado usan `StatusBadgeComponent` mediante la plantilla de celda que `DataColumn` ya permite, o un campo `badge` nuevo en la definición de columna. Se mantienen `caption.visually-hidden`, `role="status"`, `role="alert"` y los textos.
6. **Formularios:** cada formulario se envuelve en una `.card` con `.form-grid` (una columna y dos desde 720 px) y `.form-actions` (separadas arriba por una línea). Solo cambian clases y estructura de contenedores, no los controles ni los `formControlName`. El selector de configuración y el editor de zonas conservan su contenido.
7. **Detalles y mapas:** el resumen de jornada y de ruta usa `.stat-grid`; las tablas de rutas y de paradas van en `.card`; el estado de las visitas y de la jornada con `StatusBadgeComponent`; los contenedores de mapa (`.map` de `routes-map`, `map-view`, editor de polígonos) reciben borde y radio. Las teselas siguen claras.
8. **Inicio:** `HomeComponent` pasa a un saludo (nombre o correo), los accesos como mosaicos con icono en un círculo tonal, y las últimas jornadas en una `.card` con las etiquetas de estado; la lógica de carga no cambia.
9. **Contraste y movimiento:** se amplía `access-contrast.spec.ts` a un `contrast.spec.ts` compartido que mide los pares de las etiquetas de estado y de las superficies nuevas (`on-*-container` sobre `*-container`, `on-surface` sobre `surface-container`) en ambos esquemas. Las transiciones (hover de filas y mosaicos) se limitan a `@media (prefers-reduced-motion: no-preference)`.
10. **Estrategia de despliegue por capas:** primero tema y sistema (tareas 1 a 3), con el shell y los compartidos; después las pantallas por familias (listados, formularios, detalles, inicio). Cada paso deja la aplicación funcionando y las pruebas en verde, de modo que se puede parar en cualquier punto con una aplicación coherente.

## Risks / Trade-offs

- [Cambio visual muy extenso: muchos archivos y regresiones de maquetación] → capas pequeñas con pruebas y recorrido en navegador al final de cada una; no se toca el marcado semántico que usan las pruebas.
- [Teselas claras sobre tema oscuro desentonan] → contenedor con borde y radio, y capa de atribución legible; se anota como mejora futura (filtro o teselas oscuras) en lugar de arriesgar los colores de las rutas.
- [Dependencia de `modernize-access-ui`] → se archiva antes o se trabaja sobre su rama; la primera tarea lo comprueba y retira el escenario que deja de ser cierto.
- [Contraste de las etiquetas de estado en oscuro] → pares `*-container`/`on-*-container` del tema y prueba automática de contraste en ambos esquemas.
- [El presupuesto de estilos de componente se queda corto con más estilos] → el estilo común vive en el parcial global, no en los componentes.
- [Gráficos y tablas muy anchas en 360 px] → desplazamiento horizontal dentro de la tarjeta y comprobación de 360 px en todas las pantallas con un iframe, como en acceso.
- [Dos criterios de «estado»] → `statusTone` único por dominio, con pruebas, en lugar de tonos decididos en cada plantilla.

## Migration Plan

Cambio visual sin migración de datos. Se despliega junto con el resto; para revertir basta revertir los commits (uno por capa). Se verifica a mano en el navegador con el mock del gateway (`npm run mock:gateway`), en claro y oscuro, en 360 px y en pantalla ancha, solo con teclado y con movimiento reducido.

## Open Questions

- ¿Se quiere más adelante un interruptor manual de tema o teselas oscuras? No cambia este plan y se puede decidir después.
