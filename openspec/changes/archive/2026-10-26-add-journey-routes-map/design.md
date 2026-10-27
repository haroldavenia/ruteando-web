# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `JourneysApi.get` ya entrega `PlannedJourney` con `routes: DomainRoute[]`: `geometry: LatLng[]` (polilínea de precisión 5 ya decodificada con `core/geo/polyline`) y `waypoints: DomainWaypoint[]` con `position: LatLng | null`, `sequence`, `stopType`, `packageId`, `arrivalUtc` y `departureUtc`. El fixture real `post__journeys__plan` trae una ruta con geometría de decenas de kilómetros y cuatro paradas (depósito, dos servicios y depósito).
- `shared/map` tiene `MapViewComponent` (un marcador, clic y arrastre), `LocationFieldsComponent`, el cargador diferido de OpenLayers (`openlayers.ts`, con `OPENLAYERS_LOADER` sustituible en pruebas), la configuración de teselas por entorno y `ol.css` global.
- `features/journeys` tiene el detalle con la tabla de rutas expandible (`JourneyRoutesComponent`).
- El legacy coloreaba las rutas con una lista fija de colores hexadecimales, mostraba un panel por ruta y abría el mapa en otra pantalla.

## Goals / Non-Goals

**Goals:**
- Ver la planificación sobre el mapa con la misma información que las tablas, sin perderla para quien no pueda usar el mapa.
- Un componente reutilizable (zonas y seguimiento podrían pintar rutas más adelante).
- Sin engordar el bundle inicial ni romper SSR.

**Non-Goals:**
- Navegación giro a giro, animación del recorrido, edición de rutas, exportar PDF.
- Un motor de mapas propio: se amplía el cargador con los pocos símbolos de OpenLayers que faltan.

## Decisions

### 1. Un componente nuevo, no ampliar `MapViewComponent`
`RoutesMapComponent` es de solo lectura (no hay marcador editable ni coordenadas que sincronizar) y tiene su propia leyenda y ficha; `MapViewComponent` sigue siendo el selector de un punto. Comparten el cargador, la configuración de teselas y la atribución. Evita un componente con dos modos.

### 2. Datos de entrada como modelo de dominio
Entradas: `routes: readonly DomainRoute[]`; estado compartido con la pantalla por `model()`: `selectedRoute: number | null` (índice de ruta) y `selectedStop: { routeIndex: number; sequence: number } | null`. La pantalla de detalle es la dueña del estado y lo comparte con la tabla de rutas y la de paradas, de modo que «Ver en el mapa» en una fila y el clic en el mapa actúan sobre lo mismo.

### 3. Capas y estilos
Tres capas vectoriales sobre las teselas: **rutas** (líneas), **paradas** (puntos con número) y **selección** (halo de la parada marcada). Cada línea se pinta con un *casing* blanco de mayor grosor debajo y el color encima, para tener contraste sobre cualquier mapa base. El estilo se calcula con una función que lee el estado actual (ruta resaltada o no, parada marcada) y la capa se invalida con `changed()` cuando cambia. Resaltar = grosor 6 y opacidad completa; el resto, grosor 3 y opacidad 0,35.
- *Geometría ausente:* si `geometry` está vacía y hay al menos dos paradas con posición, se une su orden con línea discontinua. Con una sola parada o ninguna, la ruta solo aporta puntos.
- *Depósitos:* círculo con borde grueso y una «D» en lugar del número; las paradas de servicio, círculo relleno con el número de orden y el número de ruta delante (`2·3` = ruta 2, parada 3).

### 4. Paleta
Ocho colores de la paleta de Okabe-Ito y de Tol aptos para daltonismo (azul `#0072B2`, bermellón `#D55E00`, verde `#009E73`, rosa `#CC79A7`, naranja `#E69F00`, celeste `#56B4E9`, vino `#882255`, verde oscuro `#117733`), asignados por `routeIndex % 8`. Con más de ocho rutas se repiten; la identificación fiable la dan la leyenda y los números de ruta en las paradas, no el color. Se evita el amarillo puro por su bajo contraste.

### 5. Encuadre
`view.fit(extent, { padding, maxZoom: 16 })` con la extensión de todas las líneas y paradas (`boundingExtent` de las coordenadas válidas). Al elegir una ruta se encuadra en la suya; «Ver todas» vuelve al encuadre general. Con un solo punto se centra con un zoom razonable en lugar de ajustar a una extensión nula.

### 6. Selección y accesibilidad
El mapa no se opera con teclado: la **leyenda** (`<ul>` de botones con `aria-pressed`) y la tabla de rutas y paradas son la vía accesible y cubren lo mismo (elegir ruta, ver parada). La ficha de la parada es una región con `aria-live="polite"` que se actualiza al elegir una; cerrar la ficha devuelve el foco al elemento que la abrió. El mapa se etiqueta como región que remite a esas tablas.

### 7. Clic en una parada
`map.on('click')` con `forEachFeatureAtPixel` sobre la capa de paradas (`hitTolerance: 8` para el dedo). Un clic en vacío cierra la ficha.

### 8. Rendimiento
Las líneas se simplifican según el zoom con `simplify` de OpenLayers (la geometría llega con precisión de 5 decimales y miles de puntos); no se recalcula la decodificación (ya viene decodificada del modelo). Las paradas no se agrupan en esta fase.

### 9. SSR, fallos y vacío
Mismo patrón que `MapViewComponent`: solo en navegador, hueco del mismo tamaño en servidor, aviso en español si falla la carga y leyenda y tablas siguen funcionando. Sin rutas con nada que dibujar, mapa en la posición por defecto y aviso.

## Risks / Trade-offs

- [Muchas rutas y miles de puntos] → Simplificación por zoom; sin agrupar paradas todavía.
- [Dependencia del color] → Número de ruta en las paradas, leyenda con nombre y vehículo, resaltado por grosor y atenuado de las demás.
- [No hay jornadas reales que pintar mientras `journeys/plan` falle con ids hexadecimales] → Se verifica con el fixture real y, si existen jornadas ya creadas en el gateway, con el detalle de alguna (con autorización).
- [Mapa inaccesible con teclado] → Leyenda y tablas como alternativa completa; ficha en región viva.
- [OpenLayers crece al añadir línea, texto y extensión] → Sigue en fragmentos diferidos; se mide.

## Migration Plan

1. Paleta y utilidades de geometría con pruebas.
2. Ampliar el cargador de OpenLayers.
3. `RoutesMapComponent`: dibujo, resaltado, ficha, estados límite.
4. Integración en el detalle y botones «Ver en el mapa».
5. Verificación (build, navegador real) y documentación.

Reversión: aditivo; quitar el componente del detalle devuelve la pantalla anterior.

## Open Questions

- ¿Hay jornadas reales con rutas en el gateway que se puedan consultar sin planificar de nuevo? Si no, la verificación real depende del arreglo de `journeys/plan`.
- ¿Conviene agrupar paradas cuando haya cientos? Se decidirá con datos reales.
