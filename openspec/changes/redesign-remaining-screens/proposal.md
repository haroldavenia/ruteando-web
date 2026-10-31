# Proposal

## Why

El acceso, Inicio y el marco del área privada (riel, búsqueda, tema, Manrope) ya siguen el diseño «Ruteando Atlas». El resto de la aplicación (27 rutas, 20 componentes de pantalla: flota, lugares, zonas, configuraciones, paquetes y jornadas) conserva el aspecto anterior y desentona al lado de lo nuevo. Medido en Chrome real sobre las 18 rutas distintas, en claro y oscuro, a 1366 y 390 px (72 combinaciones, ninguna con desborde de página):

- Los botones de página miden 40 px y son píldoras, a diferencia de los de acceso e Inicio (44 y 48 px, esquinas de 12 px). Su zona táctil sí es de 48 px (la añade Material); lo que queda por debajo de 44 px son los enlaces con el nombre de cada jornada en el listado (17 px), los radios de color de una zona (13 px), los botones de zoom del mapa (22 px) y las entradas de la tabla de vértices.
- Los títulos salen finos (peso 400) y las acciones principales no llevan el hilo de la marca.
- Los campos del filtro y de los formularios siguen rellenos y con esquinas de 4 px, a diferencia de los de acceso.
- El mapa sigue claro en tema oscuro y la atribución de OpenStreetMap queda a 3,4 a 1 de contraste (mínimo 4,5 a 1).
- A 390 px las tablas obligan a desplazarse: la de rutas de una jornada mide 1126 px de ancho (12 columnas), la de vértices de una zona 450 px y las de importar 464 px.
- «Sin permiso» no tiene título en la barra ni entrada activa en el riel.

La persona pidió que la rama sirva para todo el rediseño y que se cuide **mucho** lo que ya funciona, por eso este change es primero un plan: dice qué se hace, en qué orden, qué no se toca y cómo se comprueba que nada se rompió.

## What Changes

Nueve secciones de trabajo, de menor a mayor riesgo, cada una con su verificación completa antes de pasar a la siguiente (ver `tasks.md`):

1. **Fundaciones compartidas**: controles de 44 px, campos con contorno y esquinas de 12 px en toda la aplicación, títulos con peso, acción principal con el hilo de la marca, avisos de resultado con tono, diálogos, y «Sin permiso» con su panel y su título en la barra.
2. **Mapas en oscuro**: teselas oscuras, colores de marcador, halos y polígonos desde los tokens, controles de zoom y atribución legibles.
3. **Tabla compartida y listados** (los ocho listados y el selector de paquetes): filtro con su alcance visible, carga con la forma de la tabla, primera columna que no se recorta en pantallas estrechas, y pestañas de Flota.
4. **Formularios por secciones** (tipo de vehículo, conductor, vehículo, lugar): secciones con icono, dos columnas desde 720 px, barra de acciones con «Cambios sin guardar».
5. **Configuraciones y zonas**: secciones, interruptores y resumen en lenguaje natural; editor de zona con mapa ancho, vértices al lado y colores de 44 px.
6. **Paquetes**: listado, formulario por secciones e importación con pasos visibles.
7. **Jornadas, listado y planificar**: enlaces de 44 px; planificar en una página con secciones numeradas y resumen fijo.
8. **Jornadas, detalle y ruta**: mapa fijo con las rutas como tarjetas en pantallas anchas, visitas como línea de tiempo y sin tablas de 12 columnas.
9. **Cierre**: documentación, memoria y verificación final en ambos temas y todos los anchos.

Fuera de alcance, a propósito, porque el gateway no da los datos o porque cambiaría comportamiento: chips de estado con recuento sobre **todo** el listado (el gateway no filtra ni ordena), progreso por jornada y «rutas en curso» (no hay recurso de visitas por jornada), acciones en lote en paquetes (serían N peticiones), mapa de selección de paquetes (solo se conocen las coordenadas de los cargados), geocodificación, una página 404 propia (hoy una ruta desconocida redirige a Inicio y se mantiene), tarjetas de vehículos y mapa de lugares (opcionales, ver decisiones).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `app-ui-system`: tamaño táctil de los controles, campos con contorno en toda la aplicación, acción principal de cada pantalla y avisos con tono.
- `data-management-ui`: cabecera con recuento, alcance visible del filtro, tabla legible a 360 px, pestañas de Flota y formulario por secciones con barra de acciones.
- `map-view`: mapa base según el tema, controles con tamaño y contraste suficientes, marcas con colores del tema.

Los deltas de `journey-planning`, `route-detail`, `route-map`, `settings-management`, `zone-management`, `package-import`, `fleet-management` y `place-management` se escriben al empezar la sección que los toca (5 a 8), porque dependen de las decisiones D2 y D3 de `design.md`.

## Impact

- `ng-ruteando/src/styles.scss` (tokens de Material para botones, campos y casillas), `src/app/shared/ui/_ui-system.scss` (clases comunes: acción principal, sección de formulario, tabla auxiliar, controles del mapa), `shared/data/` (tabla, cabecera), `shared/form/` (resultado, acciones), `shared/map/` (paleta, mapa base, controles), `core/theme/theme.service.ts` (esquema efectivo, solo lectura) y las plantillas y hojas de las 20 pantallas.
- **Sin cambios** en `core/api`, `core/auth`, `core/geo`, `server/`, rutas, guardas, roles, validadores, mensajes, nombres de control, `autocomplete`, `aria-label` y peticiones al gateway: lo comprueba la guardia de alcance y la comparación de contrato de `tasks.md` (0.3 y 0.4).
- Sin dependencias nuevas. Presupuestos: lo común va a la hoja global (22 kB hoy frente a 500 kB de aviso del inicial) y cada hoja de componente se mantiene bajo 2 kB.
- Pruebas: las 629 que cubren estas áreas (flota 43, lugares 18, zonas 24, configuraciones 30, jornadas 147, paquetes 118, datos 80, mapa 106, formularios 23, interfaz 40) no se eliminan; las que fijan estructura (rutas de jornada, visitas, acceso) se reescriben sobre el mismo comportamiento y se listan en `tasks.md`.
