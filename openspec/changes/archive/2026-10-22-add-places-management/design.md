# Design

## Context

Estado de partida (ver `proposal.md` para la motivación):

- `core/api` ya ofrece `PlacesApi` (`CrudApi<Place, PlaceInput>` + `nearby`), el modelo `Place` (`location` GeoJSON `[lon, lat]`, `type` del dominio `PlaceType`) y fixtures reales de `places`. `core/geo` tiene `LatLng`, `toGeoJsonPoint`/`fromGeoJsonPoint`, `toOlCoordinate` y polilíneas (no hacen falta utilidades nuevas de coordenadas).
- `ol` 10.5 está en `package.json` pero no se importa en ningún sitio. Un `import` estático de OpenLayers toca `window` y el prerender de `ng build` fallaría; además pesa cientos de kB.
- `shared/data` (listado, borrado, envío, `RecordLoader`, guarda de cambios sin guardar) y `shared/form` ya fijan el patrón de pantallas de datos; `features/fleet` es la referencia de uso.
- El legacy (`master/js/custom/places`, `address`, `maps`) obtiene la ubicación con geocodificación del gateway y una pantalla de mapa aparte, y usa un proveedor de teselas de `config()`. La geocodificación no tiene contrato documentado y se deja fuera.
- Decisiones del usuario en esta fase: mapa base **OpenStreetMap**; alcance **solo lugares** (las zonas y su dibujo de polígonos van en la fase siguiente).

## Goals / Non-Goals

**Goals:**
- Un único componente de mapa que reutilicen zonas, paquetes, jornadas y rutas, seguro en SSR y sin engordar el bundle inicial.
- Que elegir una ubicación sea posible sin ratón: el mapa es un atajo, no la vía única.
- Lugares completos (CRUD) sobre los patrones ya fijados, para desbloquear el depósito de los vehículos.

**Non-Goals:**
- Geocodificar direcciones, buscar lugares cercanos, clusters, rutas pintadas o dibujo de polígonos.
- Un envoltorio genérico de OpenLayers: el componente expone solo lo que hoy se necesita (centro, zoom, un marcador, selección).

## Decisions

### 1. OpenLayers solo por `import()` dinámico dentro del navegador
Un módulo `shared/map/openlayers.ts` expone `loadOpenLayers()` (promesa memorizada) con los pocos símbolos de `ol/*` necesarios (`Map`, `View`, capa de teselas con `XYZ`, capa vectorial, `Feature`, `Point`, `Translate`, `fromLonLat`/`toLonLat`, estilo de círculo). Solo se llama desde `afterNextRender`, que no se ejecuta en servidor, y además se comprueba `isPlatformBrowser`. Así el código de OpenLayers queda en fragmentos diferidos y el render de servidor no lo ve.
- *Alternativa descartada:* `import` estático y `@defer`. Rompería el prerender y el bloque diferido no basta para evitar el import en el servidor.
- *Alternativa descartada:* Leaflet. Más ligero, pero OpenLayers ya está instalado, es el motor del legacy y hará falta para polígonos y rutas.

### 2. Marcador con estilo de círculo y arrastre con `Translate`
El marcador se pinta con un estilo vectorial (círculo con borde), sin imágenes ni recursos estáticos que servir. Se mueve con un clic en el mapa (si `selectable`) o arrastrándolo (`Translate`). El componente emite `pointChange: LatLng` y acepta `point` de entrada; ante un punto nuevo desde fuera mueve el marcador y centra el mapa solo si queda fuera de la vista.

### 3. Configuración del mapa por entorno, inyectada
`environment.map = { tilesUrl, attribution, center, zoom }` y un token `MAP_CONFIG` que `app.config.ts` provee desde el entorno, igual que `API_BASE_URL`. La URL de teselas (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) vive solo en `src/environments`, no en `src/app`. La atribución se pasa a la fuente de teselas para que el control de OpenLayers la muestre. Centro por defecto: Bogotá (4,6097; -74,0817) con zoom 11, que coincide con los datos de ejemplo; se cambia en el entorno.
- Política de OSM: uso ligero y atribución visible. Válido para desarrollo y uso interno; cambiar de proveedor es cambiar `tilesUrl` y `attribution`.

### 4. CSS de OpenLayers: global y medido
`ol/ol.css` (~4 kB) se añade a `styles` de `angular.json`. Meterlo en el componente rompería el presupuesto de 4 kB por estilo de componente, y cargarlo bajo demanda exige un `<link>` con nombre con hash. Se mide el coste en la tarea de verificación; si el inicial supera el límite, se pasa a estilo diferido (`inject: false` + enlace dinámico) como optimización.

### 5. `LocationFieldsComponent`: coordenadas y mapa sincronizados
Un componente reutilizable con latitud y longitud (`number|null`, validadores de rango) y el mapa debajo. Los campos son la fuente de verdad accesible: al escribir un par válido se mueve el marcador; al hacer clic o arrastrar se rellenan los campos (6 decimales). Con un par inválido o incompleto el marcador no se mueve. El mapa se etiqueta como región (`role="region"`) con "Mapa para elegir la ubicación. También puedes escribir la latitud y la longitud en los campos de arriba".
- *Alternativa descartada:* solo mapa. Inaccesible con teclado y lector de pantalla.

### 6. Fallo del mapa degrada, no bloquea
Si `import()` o las teselas fallan, el componente muestra un aviso en español y deja intactos los campos de coordenadas. El formulario de lugar sigue siendo utilizable sin mapa.

### 7. Lugares sobre los patrones existentes
`/lugares` (lista), `/lugares/nuevo` y `/lugares/:id` con `ListState`, `DataTableComponent`, `DeleteFlow`, `SubmitState`, `RecordLoader` y `unsavedChangesGuard`. Etiquetas de `PlaceType` en español en `place-labels.ts` con la clave como reserva (el dominio es editable en el gateway). Dirección, teléfono y contacto opcionales (el legacy los exigía; el gateway solo exige nombre, tipo y ubicación). Teléfono: `^\+?[0-9 ()-]{7,20}$`, más laxo que el legacy (7–10 dígitos) porque los usuarios reales del gateway llevan prefijo internacional.

### 8. Roles de administración compartidos
Los lugares usan los mismos roles que la flota. `FLEET_ROLES` se renombra a `ADMIN_ROLES` y pasa a `core/auth/admin-roles.ts` (fichero mínimo para no arrastrar rutas al bundle inicial). El menú gana la entrada "Lugares" con esos roles.

### 9. Pruebas con OpenLayers real
El componente se prueba en Karma con OpenLayers real en un contenedor de tamaño fijo, accediendo al `Map` mediante un accesor público de solo lectura; los clics se simulan con `map.dispatchEvent` de eventos de puntero. SSR se prueba con `PLATFORM_ID = 'server'`. Las teselas no se piden en las pruebas (fuente de teselas sustituida por una URL de datos).

## Risks / Trade-offs

- [OpenLayers engorda el bundle] → Solo en fragmentos diferidos; se verifica en el build y se mide el CSS global.
- [Servidor de teselas de OSM público] → Uso ligero, atribución visible, configurable; documentado para producción.
- [Mapa inaccesible con teclado] → Campos de coordenadas siempre presentes y sincronizados; etiqueta explicativa.
- [Colocar el punto a mano es incómodo sin geocodificación] → Se documenta como límite; la geocodificación entra cuando el gateway documente su contrato.
- [Rol real de gestión de lugares sin documentar] → Se parte de administradores; el gateway ya responderá 403 si no corresponde y se documenta.
- [Lugar usado como depósito no se puede borrar] → Mapeo de 400 y 409 con mensaje propio, a verificar con el gateway real (con autorización).

## Migration Plan

1. Entorno, token de configuración, utilidades de coordenadas y renombre de roles.
2. Cargador de OpenLayers, `MapViewComponent` y `LocationFieldsComponent` con pruebas.
3. Lugares: listado, formulario y borrado.
4. Rutas, menú y enlace desde el formulario de vehículo.
5. Verificación (build, SSR, navegador real, límites de bundle) y documentación.

Reversión: todo es aditivo; revertir el commit de rutas y menú oculta las pantallas.

## Open Questions

- ¿Pueden gestionar lugares también los `agent`? Se parte de solo administradores; ampliarlo es cambiar `ADMIN_ROLES` en las rutas y el menú.
- ¿Qué proveedor de teselas se usará en producción real? Hoy OSM; es solo configuración.
