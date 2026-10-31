# Design

## D1. Iconos: fuente de línea con los mismos nombres
Se sustituye la hoja `Material Icons` por `Material Symbols Outlined` con ejes fijos (`opsz 24`, `wght 350`, `FILL 0`, `GRAD 0`) y la clase `material-icons` que Material pone a cada `mat-icon` pasa a usar esa fuente. Ninguna plantilla cambia (los nombres son los mismos), no hay dependencia nueva y la CSP ya admite Google Fonts. Se descartó un juego de SVG propio (95 usos y todas las pruebas que leen el nombre) y `remixicon` (otra dependencia y renombrar todos los usos): si la fuente de línea no bastara, se cambia sin tocar la API de `mat-icon`.

## D2. Datos: carga completa en el cliente
`FullListState<T>` extiende `ListState<T>`: `load()` pide `GET ...?page=n&size=100` hasta traer todo o llegar a 1000 y deja `rows` con todos los registros y `truncated` si el gateway informa más. `DataTableComponent` detecta el modo cliente (`state.clientSide`) y entonces filtra, cuenta y pagina él mismo; con un `ListState` normal (paginado desde el servidor) se comporta como hasta ahora y su búsqueda sigue diciendo que solo recorre la página.

## D3. Chips y selección
Los chips son una entrada de `DataTableComponent` (`facet`: cómo se lee el estado de una fila y el orden y los nombres de los estados). Cuentan sobre todas las filas, y la búsqueda y el chip se combinan. La selección es opcional (`selectable`) y solo guarda ids; las acciones de la barra las aporta quien usa la tabla (`<ng-template #selectionActions>`).

## D4. Estados que el gateway no da
Se mantiene la regla de la rama anterior: lo que el gateway no da no se simula. Los recuentos son de los registros cargados (todos, hasta 1000) y el cambio de estado de varios paquetes es una petición por paquete, con un resumen de los que fallaron.

## D5. Responsive
La tabla sigue apilándose como tarjetas bajo 840 px de caja (`.stack-scope`); la barra de selección y los chips caben a 320 px (los chips se desplazan en una fila o se envuelven) y todo se mide con la suite `scroll` del banco, también con el texto al 200 %.
