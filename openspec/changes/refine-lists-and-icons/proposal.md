# Proposal

## Why

La propuesta «Ruteando Atlas» define un diseño propio para los listados y las tablas, y unos iconos de línea. La aplicación ya tiene el tema, el marco, los formularios y los detalles, pero conserva el listado de la primera pasada (un filtro de «esta página», una tabla de filas planas) y los iconos rellenos de Material Icons. La persona pidió llevar los dos al diseño:

- **Iconos**: el diseño dibuja contornos; la aplicación usaba iconos con relleno.
- **Listados**: el diseño trae chips de estado con recuento, búsqueda con atajo `/`, alternador de densidad, referencia en monoespaciada, filas con selección y una barra de acciones, acciones que aparecen al pasar el cursor, vehículos como tarjetas y lugares con mapa.

El gateway no filtra por estado ni ordena (`sort` se ignora), así que los recuentos, la búsqueda y el orden de la propuesta solo son ciertos si el cliente tiene todos los registros. La persona eligió cargar todo en el cliente (hasta 1000 registros, en páginas de 100) para paquetes, jornadas, vehículos y lugares.

## What Changes

- **Iconos de línea** en toda la aplicación: `Material Symbols Outlined` a un trazo fijo en lugar de `Material Icons`, con los mismos nombres de icono (no cambia ninguna plantilla). Las etiquetas de estado usan los glifos del diseño (anillo, marca, círculo, exclamación, cruz). Paquetes usa el cubo del diseño.
- **Estilo común de los listados** (`DataTableComponent`, todos los listados): búsqueda de 44 px con la pista `/` y atajo de teclado, alternador de densidad (cómoda y compacta) que se recuerda, cabecera en mayúsculas pequeñas, referencia en monoespaciada, acciones de fila que aparecen al pasar el cursor o al enfocar (siempre visibles en pantallas táctiles), filas con relieve al pasar el cursor.
- **Carga completa en el cliente** (`FullListState`): paquetes, jornadas, vehículos y lugares piden todas las páginas (de 100 en 100, hasta 1000) y filtran, cuentan, buscan y paginan sobre todo; si hay más de 1000 se avisa y se trabaja con los primeros 1000.
- **Paquetes**: chips de estado con recuento, casillas por fila y barra inferior «N seleccionados · Cambiar estado · Exportar» (el cambio de estado va paquete a paquete: el gateway no tiene lote).
- **Jornadas**: chips de estado con recuento.
- **Flota, vehículos**: tarjetas (nombre, tipo, matrícula, conductor con iniciales o «Asignar») con alternador tarjetas/tabla.
- **Lugares**: lista con mapa y un pin por tipo de lugar.

## Out of scope

- Orden por columna (el diseño no lo trae y el gateway ignora `sort`) y paginación del servidor para estos listados.
- Zonas, configuraciones, tipos de vehículo y conductores: toman el estilo común de la tabla (búsqueda, densidad, cabecera, acciones al pasar el cursor) pero siguen paginando desde el servidor, con su búsqueda de «esta página»; pasarlos a carga completa es un cambio aparte.
- Comprobación contra el gateway real: se prueba con el gateway simulado y datos ficticios y queda declarada como pendiente hasta que el gateway real esté activo.
