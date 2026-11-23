# Proposal

## Why

El detalle de una jornada ya muestra rutas y paradas en tablas, pero lo que el usuario necesita para revisar una planificación es **verla sobre el mapa**: por dónde pasa cada vehículo, en qué orden atiende las paradas y si alguna ruta se solapa con otra. El modelo de dominio ya está listo para eso (`DomainRoute.geometry` con la polilínea decodificada y `DomainWaypoint.position` con `LatLng`), el mapa reutilizable existe (`shared/map`, OpenLayers cargado solo en el navegador) y el legacy dibujaba las rutas con colores propios y un panel de información (`master/js/custom/maps`, `routes`). Falta el componente que las pinte.

## What Changes

- Componente reutilizable **`RoutesMapComponent`** (`shared/map`): dibuja las rutas de una jornada como líneas con un color distinto por ruta, las paradas numeradas por orden, los depósitos con un símbolo propio y ajusta la vista para que se vea todo.
- **Selección de ruta**: elegir una ruta (desde la leyenda o desde la tabla de rutas) la resalta, atenúa las demás y encuadra el mapa en ella; volver a elegirla o pulsar «Ver todas» restablece la vista.
- **Selección de parada**: un clic en una parada del mapa, o el botón «Ver en el mapa» de su fila en la tabla de paradas, la centra y muestra su ficha (ruta, orden, tipo, llegada, salida y enlace al paquete).
- **Leyenda accesible**: lista de rutas con su color, nombre, vehículo y distancia, operable con el teclado, que es también la alternativa al mapa (que no se puede operar con teclado ni con lector de pantalla). Los colores salen de una paleta apta para daltonismo y las líneas se distinguen además por el número de ruta en cada parada.
- **Integración** en `/jornadas/:id`: el mapa va entre el resumen y la tabla de rutas.
- Si una ruta no trae geometría, se une el orden de sus paradas con una línea discontinua; las paradas sin posición válida se omiten sin romper el mapa.
- Fuera de alcance: navegación giro a giro (`navigations`), recorrido animado, edición de rutas, exportar a PDF, métricas y gráficas, y reordenar paradas.

## Capabilities

### New Capabilities
- `route-map`: mapa de las rutas de una jornada con color por ruta, paradas numeradas, depósitos, resaltado y selección de ruta y de parada, con una leyenda accesible como alternativa.

### Modified Capabilities
- `journey-planning`: el detalle de la jornada incluye el mapa de sus rutas y permite enfocar una ruta o una parada desde las tablas.

## Impact

- Código nuevo: `ng-ruteando/src/app/shared/map/routes-map.component.ts` (+ paleta y utilidades de geometría) y la leyenda y la ficha de parada en `features/journeys/`.
- Modificado: `shared/map/openlayers.ts` (más símbolos de OpenLayers: línea, texto, extensión), `journey-detail.component.*`, `journey-routes.component.*` y pruebas.
- Dependencias: ninguna nueva.
- Requiere: `add-journeys-planning` archivado (ya lo está).
- Riesgos: el tamaño del fragmento de OpenLayers crece algo (línea, texto, extensión), pero sigue diferido; una jornada con muchas rutas y miles de puntos puede ser lenta de pintar (se simplifica la geometría al alejar el zoom, con la tolerancia de OpenLayers); sin jornadas reales con rutas (el defecto de `journeys/plan` impide generarlas) la verificación usa los fixtures reales (`post__journeys__plan` trae una polilínea de ~46 km con cuatro paradas); el color por sí solo no basta (daltonismo), por lo que cada ruta se identifica también con su número en las paradas y en la leyenda; los teselas de OpenStreetMap siguen siendo de uso ligero.
- Sin impacto en `server/` ni en `master/`.
