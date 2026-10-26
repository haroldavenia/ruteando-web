# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `ZonesApi` (`list()` devuelve un arreglo sin paginar; `get`, `create`, `update`, `remove` y `containing`) añade el `tenantId` con `TenantContext`; sin usuario falla con el error genérico de sesión no válida. El modelo `Zone` trae `boundary` (GeoJSON `Polygon` con un solo anillo cerrado `[[lon, lat], …]`), `code`, `name`, `color` (`string | null`) y `active`. Los fixtures reales (`get__zones`, `post__zones`, `put__zones__id`, `delete__zones__id`, `get__zones__id`) usan un cuadrado de cuatro vértices en sentido antihorario y no traen color.
- `shared/map` tiene el cargador diferido de OpenLayers (`openlayers.ts`, con `OPENLAYERS_LOADER` sustituible), la configuración de teselas con atribución, `MapViewComponent`, `LocationFieldsComponent` (patrón «campos primero, mapa como atajo») y la paleta de rutas (`route-colors.ts`).
- `shared/data` ofrece `ListState`, `ClientPaging` (para listas sin paginar), `DeleteFlow`, `SubmitState`, `RecordLoader` y `unsavedChangesGuard`. `features/places` es la referencia de formulario con mapa.
- No hay nada en el legacy: las zonas son una entidad nueva del gateway.

## Goals / Non-Goals

**Goals:**
- Que un administrador cree y mantenga zonas válidas sin herramientas externas.
- Un editor de polígonos reutilizable cuya versión sin ratón sea completa, no un recurso de emergencia.
- Detectar en el cliente los polígonos que el gateway probablemente rechazaría, sin inventar reglas del servidor.

**Non-Goals:**
- Huecos, multipolígonos, importar GeoJSON o KML, mostrar zonas en el mapa de rutas y asignarlas a lugares y paquetes.

## Decisions

### 1. La fuente de verdad es la lista de vértices
El editor trabaja con `vertices: LatLng[]` (un `model()`), sin el vértice repetido que cierra el anillo. El mapa y la tabla son dos vistas de esa lista: dibujar o arrastrar escribe vértices; editar la tabla escribe vértices. El anillo GeoJSON se construye solo al entregar (`ringFromVertices`) y se lee al cargar (`verticesFromRing`). Evita bucles de sincronización y mantiene la geometría pura y probable sin OpenLayers.

### 2. Geometría pura en `polygon-geometry.ts`
- `verticesFromRing(ring)`: quita el cierre y los vértices inválidos.
- `ringFromVertices(vertices)`: devuelve `[lon, lat][]` cerrado y en sentido antihorario (si el área con signo es negativa se invierte el orden).
- `signedArea`, calculada en un plano local con la longitud escalada por `cos(latitud media)`; `areaKm2` con la misma proyección (aproximada, suficiente para mostrar y para detectar áreas nulas).
- `validatePolygon(vertices)`: `too-few` (menos de tres vértices distintos), `no-area` (área menor que un umbral relativo) y `self-intersection` con los pares de lados que se cruzan (los lados contiguos que comparten un vértice no cuentan). Cálculo O(n²), aceptable hasta unos miles de vértices; por encima se avisa de que no se comprueban cruces.
- *Alternativa descartada:* una librería de geometría (turf). Peso innecesario para tres comprobaciones.

### 3. Tabla de vértices como vía principal accesible
`VertexTableComponent`: `FormArray` de `{ lat, lng }` con validadores de rango, botón «Añadir vértice» y un botón de quitar por fila con etiqueta («Quitar el vértice 3»). Un cambio válido propaga la lista; con un valor inválido la lista no cambia (igual que `LocationFieldsComponent`). Está siempre visible junto al mapa y funciona sin él.

### 4. Dibujo y edición con las interacciones de OpenLayers
`Draw` (`type: 'Polygon'`) para dibujar: al terminar se leen las coordenadas, se pasan a vértices y se pinta el polígono propio en una capa vectorial; `Modify` sobre esa capa permite arrastrar vértices y añadirlos sobre un lado. Botones «Dibujar polígono», «Terminar polígono» (`finishDrawing`), «Cancelar» (`abortDrawing`, también con Escape) y «Borrar polígono» (con confirmación si hay más de tres vértices). Solo hay un polígono: al empezar a dibujar uno nuevo se conserva el anterior hasta terminarlo (y se descarta al cancelar).
- *Alternativa descartada:* dibujar sobre el propio polígono editable. Mezcla dos estados (a medias y válido) en la misma capa.

### 5. Estilo y retroalimentación
Línea y relleno semitransparente con el color de la zona (o gris neutro sin color), vértices visibles al editar y borde rojo discontinuo cuando el polígono no es válido. El resumen («5 vértices · 12,4 km²» o el motivo del error) va en una región `aria-live`. El mapa se encuadra al polígono al cargarlo.

### 6. Formulario de zona
Reactive form con nombre (obligatorio), código (obligatorio, recortado, sin espacios, hasta 20 caracteres: regla del cliente por prudencia, no documentada en el gateway), color (grupo de botones de opción con muestra y nombre, más «Sin color») y el editor de polígono, cuya validez entra en la del formulario. Alta: `{ name, code, boundary }` más `color` solo si hay. Edición: registro cargado sin `id`, `tenantId` ni fechas y con lo editado encima (`color: null` si se quita), para conservar `active`.

### 7. Listado
`ZonesApi.list()` devuelve un arreglo: `ClientPaging` lo pagina en el navegador y el filtro de texto funciona sobre la página. Columnas: muestra de color, nombre, código, vértices y estado. Una sesión sin `tenantId` produce el error genérico de sesión y el botón «Reintentar» del listado.

### 8. Menú y roles
`/zonas` con `roleGuard(ADMIN_ROLES)` y `unsavedChangesGuard`; entrada «Zonas» (icono `hexagon`) para `ADMIN_ROLES`, a continuación de «Lugares».

## Risks / Trade-offs

- [Reglas de validación del gateway desconocidas] → Validación conservadora en el cliente; el mensaje del gateway llega al usuario si rechaza; verificación contra el gateway real con autorización.
- [Dibujo no operable con teclado] → La tabla de vértices es completa y está siempre visible.
- [O(n²) con muchos vértices] → Aviso por encima de 2000 vértices y sin comprobar cruces.
- [Área aproximada] → Se muestra como «aproximada» y no se usa para decidir nada salvo el área nula.
- [Borrar una zona usada deja referencias huérfanas] → Mapeo de 400 y 409 con mensaje propio; comportamiento real pendiente.
- [Orientación forzada antihoraria] → Es el estándar GeoJSON; el gateway devolvió así el fixture.

## Migration Plan

1. Geometría de polígonos con pruebas de tabla.
2. Ampliar el cargador de OpenLayers.
3. Tabla de vértices y editor de mapa con sus estados límite.
4. Listado, formulario y borrado de zonas.
5. Rutas, menú, verificación (build, navegador real) y documentación.

Reversión: aditivo; quitar la ruta y el menú oculta la pantalla.

## Open Questions

- ¿Qué valida el gateway de un polígono (cruces, orientación, tamaño máximo, solapes entre zonas) y cómo responde? Se contrasta con el gateway real.
- ¿Qué pasa con los `zoneId` de lugares y paquetes al borrar una zona?
- ¿Formato exacto de `color` (`#RRGGBB`, con o sin almohadilla)? Se asume `#RRGGBB`, como la paleta.
