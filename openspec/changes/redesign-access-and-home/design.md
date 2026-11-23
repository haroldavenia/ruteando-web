# Design

## Contexto

El tema es único (M3 con `color-scheme: light dark`, definido en `styles.scss`) y cada pantalla toma sus colores de `--mat-sys-*`. Las pantallas de acceso acotan su aspecto a `.access-theme`; las pantallas del área privada usan `shared/ui/_ui-system.scss`. Las pruebas fijan varios contratos (título ≥ 28 px con 20 px de margen, `.links` con 24 px de margen, pantallas sin estilos propios de título o formulario), que se respetan; los de Inicio (`h1` «Ruteando» y mosaicos `a.area.tile`) cambian a propósito con el rediseño y se reescriben en su spec.

## Decisiones

- **Pantalla dividida desde 1024 px, no antes.** Con 960 px la ilustración quedaba en 384 px y la presentación no cabía. La base sigue siendo la tarjeta centrada (la pedía la spec) y el diseño ancho es una mejora progresiva por `min-width`. La ilustración es `position: sticky` con la altura de la ventana, así el formulario se desplaza y ella no; en pantallas estrechas ocupa toda la ventana detrás de la tarjeta (mismo elemento, distinto CSS).
- **Orden del DOM = orden de lectura.** El formulario va antes que la ilustración y la presentación; la columna izquierda se coloca con `grid-template-areas`, no con `order`.
- **Material por tokens, no por clases internas.** Esquinas y alturas con `mat.form-field-overrides` y `mat.button-overrides` dentro de `.access-theme` (y en `.hero-actions` del Inicio); el contorno de los campos con `MAT_FORM_FIELD_DEFAULT_OPTIONS` en el layout, de modo que las cinco pantallas lo heredan sin tocar sus plantillas y el resto de la aplicación no cambia.
- **Presentación como componente propio** (`AccessPitchComponent`): mantiene cada hoja de estilos por debajo de los 2 kB de aviso y deja el layout legible.
- **Colores de estado como tokens junto al tema.** Material no trae verde, azul ni ámbar. Se añaden seis variables `--app-{success,info,warning}-container` y `--app-on-…` con `light-dark()` en `styles.scss`; el peligro sigue siendo `error-container`. Cada par supera 4,5:1 en ambos temas (prueba de contraste) y el color nunca es la única señal (icono y nombre).
- **Rutas luminosas con `light-dark()`.** `routeColorThemed(i)` devuelve `light-dark(claro, oscuro)` para SVG y CSS; el mapa de OpenLayers sigue con `routeColor()` (hexadecimal) porque no entiende `light-dark()`. Las ocho variantes oscuras superan 3:1 frente a la superficie oscura y frente al tinte de la marca.
- **Cabecera de Inicio como rejilla.** Texto en una columna `auto` e ilustración en el espacio restante, con máscara que la funde con el tinte: la ilustración no puede quedar debajo de un botón en ningún ancho. Por debajo de 720 px la ilustración se oculta y las acciones ocupan su fila.
- **Los datos de las últimas jornadas no cambian.** Servicios y vehículos salen de los campos que el listado ya devuelve (`totalServices`, `totalResources`), solo si son numéricos; no se pide nada nuevo.
- **Negrita en peso 500.** Roboto se carga en 300 a 500; el 700 lo inventaría el navegador con trazo emborronado.

## Riel, búsqueda y barra

- **Riel en pantallas anchas (≥ 960px), menú desplegable en las estrechas.** Se mantiene el `BreakpointObserver` del shell (con `isWide` en verdadero al arrancar, para que servidor y cliente rendericen lo mismo). El riel y la búsqueda son componentes propios (`NavRailComponent`, `GlobalSearchComponent`) y no parte del shell: el shell con todo dentro superaba los 4 kB de presupuesto de estilos del componente. Ambos reciben `items` del shell, que sigue siendo la única fuente (`navItemsFor`).
- **Nombres cortos con nombre accesible completo.** «Config.» cabe en el riel; su `aria-label` es «Configuraciones». «Flota» es un botón con `mat-menu` porque agrupa tres pantallas y se marca activa en cualquiera de ellas (`router.isActive`).
- **Búsqueda local, sin gateway.** Solo conoce las pantallas del menú del rol y tres acciones (`quickActionsFor`). Su panel se ancla a la píldora entera con `matAutocompleteOrigin`: por defecto el CDK lo ancla al campo interno y el panel salía más estrecho. El CDK 21 adjunta el panel junto al campo (popover) y no en el contenedor de overlays, así que las pruebas lo buscan en el documento.
- **Selector de tema segmentado.** Tres botones seguidos en lugar de un menú: se ve de un vistazo cuál está elegido y cambia con un clic. Es un `mat-button-toggle-group` de selección única (radios: `aria-checked`, no `aria-pressed`) con botones de 44px; el borde se dibuja con `outline` hacia dentro para que la píldora mida justo 44px.
- **Barra estrecha de 360px.** Menú (48) + marca + tema (134) + avatar (44) no caben con el nombre de la marca: por debajo de 480px la marca compacta muestra solo el emblema y deja el nombre para lectores de pantalla.
- **Tipografía.** `mat.theme` con `typography: (plain-family: Roboto, brand-family: Manrope)`: los titulares y títulos grandes usan Manrope sin tocar cada componente. Los nombres de jornada (`title-medium`, que Material deja en la familia plana) lo piden con `font-family: var(--mat-sys-title-large-font)`.

## Inicio como en el diseño

- **Mapa de ciudad en SVG** (`CityMapComponent`): sin imágenes ni peticiones, con colores de tema (`light-dark()`) y rutas con `routeColorThemed`; decorativo (`aria-hidden`) y con animación de trazado solo si no se pide movimiento reducido. En la cabecera ocupa su propia columna y se funde con el tinte.
- **El resumen no inventa.** «N de las últimas jornadas están en curso y hay M paquetes esperando ruta» sale de datos ya cargados; sin ellos, «Planificación de rutas.».
- **Lo que el diseño mostraba y no se hace.** Barras de progreso por jornada y «rutas en curso» / «paradas por visitar»: el listado de jornadas no trae avance ni visitas y calcularlos exigiría una petición por jornada. Se dejan las cifras de paquetes («Pendientes de ruta» y «Sin atender»), que sí tienen origen real.
- **Sin mosaicos de áreas.** El riel y la búsqueda ya llevan a cada área; quien no tiene ninguna lee el mensaje de «Tu rol no tiene áreas disponibles en la aplicación web».

## Responsive

- Puntos de corte: 480px (acciones de la cabecera a ancho completo; marca solo con emblema), 720px (mapa de la cabecera), 960px (riel y búsqueda), 1024px (acceso en dos columnas) y 1100px (Inicio en dos columnas de 3 a 1).
- **`min-width: 0` en la tarjeta de acceso.** Como elemento de una rejilla, la tarjeta no podía encoger por debajo del ancho mínimo de los campos de Material (318px) y en 320px desbordaba 14px; con `min-width: 0` mide 288px y todo cabe.

## No se hace en este change

- El mapa de OpenLayers en oscuro y el rediseño del contenido de las demás pantallas (heredan riel, barra y tipografía).

## Selector de tema

- **Un solo mecanismo.** `data-theme` en `<html>` solo cambia `color-scheme` (`html[data-theme='light'|'dark']` en `styles.scss`); como todos los tokens usan `light-dark()`, el tema entero cambia sin redefinir nada. Sin elección no hay atributo y `light dark` sigue al sistema, también en vivo.
- **Sin destello.** `src/assets/theme-init.js` lee `localStorage` y pone el atributo con el documento todavía cargando. Es un fichero y no un script en línea porque la CSP solo admite `script-src 'self'`; se verificó con el servidor en `CSP_MODE=enforce` y sin violaciones. `ThemeService` usa la misma clave y valores y es seguro en servidor (no toca el almacenamiento allí).
- **Tres botones seguidos, no un menú.** Son tres opciones excluyentes y caben en la barra: se ve la elegida sin abrir nada (ver «Riel, búsqueda y barra»).

## Cifras de Inicio

- `GET /packages` solo pagina: no filtra ni agrupa por estado. Recorrer todas las páginas en cada visita sería pesado, así que se pide **una** página de los 100 paquetes más recientes y se cuentan los estados en el cliente. Son exactas cuando el total cabe en ella; si no, la frase lo dice («los más recientes de T»). Es una decisión reversible si el gateway añade totales por estado.
- Un fallo de las cifras no afecta a las jornadas ni a los accesos (y al revés): cada tarjeta tiene su carga, su error y su «Reintentar».

## Corrección del recorte del final

- `mat-sidenav-content` es `content-box` y tiene `height: 100%` más el relleno de `.content`: medía 2 × relleno más de lo disponible y el contenedor, con `overflow: hidden`, recortaba el final. `box-sizing: border-box` lo arregla para todas las pantallas del área privada.

## Riesgos

- El cambio de color de las etiquetas llega a todas las pantallas que las usan; se cubre con las pruebas de contraste y de la etiqueta.
- `light-dark()` y `color-mix()` requieren navegadores recientes; la aplicación ya depende de `light-dark()` por el tema de Material.
- El diseño ancho no se puede ejercer en Karma (su ventana mide 800 px): se verifica con un banco de pruebas en Chrome real (estructura, capturas en claro y oscuro a seis anchos, colores forzados, más contraste y movimiento reducido).
