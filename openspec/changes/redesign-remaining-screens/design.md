# Design

## 1. Cómo se protege lo que ya funciona

Todo el trabajo es de presentación: plantillas, hojas y tokens. Se congela este contrato y se comprueba en cada sección, no al final.

| Se queda igual | Cómo se comprueba |
|---|---|
| Rutas, guardas y roles (`app.routes.ts`, `*.routes.ts`, `*.guard.ts`), `core/` (API, sesión, geo) y `server/` | Guardia de alcance (0.4): `git diff --name-only` contra esas rutas debe salir vacío |
| Peticiones al gateway: mismo número, orden y parámetros (`size=100` de Inicio, visitas de a 6, páginas de 200 al exportar, una petición por paquete importado) | Las pruebas de `RouteVisitsStore`, `package-importer`, `package-export` y `package-figures` no se tocan y siguen verdes |
| Validadores, mensajes de error, foco al primer campo inválido, aviso al salir con cambios sin guardar, confirmación de borrado | Pruebas existentes de cada formulario y de `shared/data`, sin editar |
| Nombres de control, `autocomplete`, `aria-label`, textos de botones y enlaces, `href`, regiones `role="alert"`/`role="status"` | Comparación de contrato (0.3): volcado del DOM por ruta, antes y después |
| Semántica de tabla (`mat-table`, `th scope`, `caption`, `aria-expanded`) | Pruebas de `shared/data`, `journey-routes`, `route-visits` y la comparación de contrato |
| Entradas, salidas y señales públicas de los componentes (`routeFocus`, `stopFocus`, `selectedIds`, `[(vertices)]`, `pointChange`…) | Compilación estricta (`strictTemplates`) y las pruebas que los usan |

Reglas de trabajo:

- **Una sección cada vez, con compuerta completa** (la «Compuerta C» de `tasks.md`). No se empieza otra con la anterior en rojo.
- **Ninguna prueba se borra.** Si una prueba fija estructura y no comportamiento (por ejemplo, que existe una `table` con 12 columnas), se reescribe sobre el mismo comportamiento (el texto de la ruta, el evento que emite, el `aria-expanded`) y el cambio se explica en el resumen de la sección.
- **Se mantienen los ganchos que las pruebas ya usan**: `tr.mat-mdc-row`, `th.mat-mdc-header-cell`, `.table-scroll`, `section.card.flush`, `.state.error`, `.state-icon`, `.filter`, `input[type="search"]`, `a[empty-action]`, `mat-paginator`, `mat-progress-bar`, los textos «Cargando vehículos…», «No hay resultados» y «Limpiar búsqueda», y los radios de color de una zona localizados por su nombre («Azul», «Sin color»). Se cambia el aspecto con tokens y hojas, no sustituyendo el elemento.
- **Material por tokens**, nunca por clases internas (`.mdc-…`) salvo el caso ya documentado del degradado sobre `mat-flat-button`.
- **Lo que no se puede probar contra el gateway real se declara** (sigue sin haber sesión real: se usa el gateway simulado con los fixtures del repositorio).

## 2. Línea base medida (antes de tocar nada)

Registro completo: `qa-visual/baseline/base-restantes.log`. 18 rutas × claro/oscuro × 1366/390: 72 de 72 sin desborde de página. Lo que sí falla o se queda corto:

- **Objetivos de menos de 44 px** (corregido al medir con la zona táctil de Material: botones, botones de icono, casillas e interruptores llevan una zona invisible de 48 px, así que **no** son un problema de acierto; el primer informe los daba por fallos porque medía solo la parte visible): enlaces de nombre del listado de jornadas a 17 px (37 px en móvil); radios de color de una zona a 13 px (9); botones de zoom de OpenLayers a 22 px (6 rutas); entradas de la tabla de vértices. Los botones visibles de 40 px sí desentonan con acceso e Inicio (44 y 48 px, esquinas de 12 px): eso es coherencia, no accesibilidad.
- **Contraste**: atribución de OpenStreetMap a 3,4 a 1 en oscuro (6 rutas); «Quitar la selección» deshabilitado a 2,3 y 3,0 (un control deshabilitado está exento, pero se puede mejorar).
- **Estrechas**: a 390 px, tablas de 450 px (vértices), 464 px (importar) y 1126 px (rutas de una jornada) que obligan a desplazar dentro de su tarjeta; la primera columna de los listados se recorta («Dirección» cortada).
- **Marco**: `/sin-permiso` sin título en la barra y sin entrada activa en el riel.
- **Aspecto**: títulos de peso 400, filtro y campos rellenos, acciones principales sin degradado, colores del mapa fijos (`#6200ee`, `#ffffff`, `#6750a4`, `#b3261e`).

## 3. Decisiones (con recomendación)

- **D1. Controles de 44 px y campos con contorno en toda la aplicación.** Recomendado: **sí**, definidos una vez con tokens en `styles.scss` (`mat.button-overrides`, `mat.icon-button-overrides`, `mat.form-field-overrides`, `mat.checkbox-overrides`) y `MAT_FORM_FIELD_DEFAULT_OPTIONS` en `app.config.ts`. Es lo que ya tienen acceso e Inicio (que conservan sus 48 px). El coste es que cambian las alturas de diálogos, paginador y menús: se verifica en cada pantalla.
- **D2. Planificar jornada.** Recomendado: **una sola página con tres secciones numeradas (Configuración, Paquetes, Revisar) y un resumen fijo a la derecha** (debajo en estrecho). Mantiene un único envío y todos los controles a la vista, que es lo que cubren las pruebas. Alternativa: un asistente `mat-stepper` por pasos, que oculta contenido, cambia el orden de tabulación y obliga a reescribir `journey-form` y su selector. Solo si se pide.
- **D3. Detalle de jornada.** Recomendado: **las rutas pasan de una tabla de 12 columnas a tarjetas** (color de la ruta, vehículo, paradas, distancia, duración, uso de peso y volumen con barra, inicio y fin, y los mismos botones), junto a un mapa fijo desde 1100 px. Conserva `aria-expanded`/`aria-controls` de las paradas y los eventos `routeFocus` y `stopFocus`. Cuesta reescribir las pruebas de `journey-routes`. Alternativa: dejar la tabla y solo darle estilo, que no resuelve el desplazamiento de 1126 px en móvil.
- **D4. Vehículos en tarjetas y lugares con mapa.** Recomendado: **no en esta rama** (todos los listados comparten la tabla; las tarjetas y el mapa de lugares solo conocen la página cargada). Flota gana pestañas, que sí cambian la navegación visible sin tocar datos.
- **D5. OpenSpec.** Recomendado: **este change nuevo** (`redesign-remaining-screens`) junto al actual (`redesign-access-and-home`), que ya describe lo hecho. Ambos van en la misma rama y se archivan juntos al fusionar. Una página 404 propia **no**: se mantiene la redirección a Inicio.

Sin respuesta, se aplican las recomendaciones.

## 4. Piezas compartidas

**4.1 Controles.** Altura visible de 44 px y esquinas de 12 px (las de acceso e Inicio) en `mat-flat-button`, `mat-stroked-button` y `mat-button` con los tokens de Material (`button-*-container-height` y `-container-shape`); botón de icono con capa de 44 px (la zona táctil de 48 px de Material se conserva); casillas, radios e interruptores conservan su zona táctil de 48 px; el enlace con el nombre de cada fila de un listado con `min-height: 44px` (la fila ya mide 52). Una sola definición en `styles.scss`: no se repite en cada hoja, y acceso e Inicio mantienen sus 48 px por su propia hoja.

**4.2 Campos.** Contorno y 12 px de esquina por token en toda la aplicación; el campo del filtro de las tablas mide 44 px. Cambia el espacio de pistas y errores respecto de los campos rellenos: se revisa en cada formulario.

**4.3 Cabecera y acción principal.** `h1` en Manrope con peso 700 desde `_ui-system.scss`. `PageHeaderComponent` conserva `title` y `subtitle`; los listados pasan el recuento real (`state.total()`: «137 paquetes») cuando ya cargó. La acción principal de cada pantalla lleva la clase `primary-action` (degradado `--app-brand-gradient`, texto de `on-primary`, con la especificidad que exige `mat-flat-button`, sin `:where`); como máximo una por pantalla; las demás, de contorno.

**4.4 Tabla compartida (`DataTableComponent`).** Sigue siendo una `mat-table` dentro de `.table-scroll`. Cambia: cabecera con peso y tinte, filtro de 44 px con «Mostrando N de TOTAL» (alcance real: «Filtrar esta página» solo recorre las filas cargadas), carga con la barra y el mensaje de siempre más filas de esqueleto `aria-hidden`, estados vacío y error con el mismo marcado y un icono mayor, acciones de fila de 44 px, y en pantallas estrechas la **primera columna fija con sombra** para que no se recorte. Las columnas pueden llevar `tone` (ya existe): el estado «Activo/Inactivo» de conductores y zonas pasa a etiqueta con el mismo texto.

**4.5 Formularios.** Clases en `_ui-system.scss`: `.form-section` (icono tonal y `h2`), enlace de vuelta de 44 px sobre el `h1` y `FormActionsComponent` (solo diseño: proyecta los botones que cada formulario ya tiene, de modo que «Guardar» y «Cancelar» no cambian). Muestra «Cambios sin guardar» (`role="status"`) mientras `hasUnsavedChanges()` es verdadero y, bajo 720 px, queda fijo al pie del área con desplazamiento. **Riesgo declarado:** el final recortado ya ocurrió una vez; toda sección con barra fija repite la comprobación `fin` del banco visual.

**4.6 Resultados y diálogos.** `FormResultComponent` mantiene sus dos regiones siempre presentes; el error pasa a contenedor `error-container` con icono y el éxito a tono verde con sus tokens `--app-success-*`. `ConfirmDialogComponent` recibe `destructive?: boolean` (opcional, `DeleteConfirmation` lo activa): la acción pasa a los colores de error; el foco inicial sigue en «Cancelar». Diálogo de asignar conductor: mismos controles con el estilo nuevo. Snack-bar con esquinas de 12 px por token.

**4.7 Mapas.** `ThemeService` expone `scheme` (claro u oscuro efectivo; sigue a `data-theme` y a `prefers-color-scheme` en vivo; claro en el servidor). `shared/map/map-palette.ts` resuelve los tokens a colores concretos (OpenLayers dibuja en canvas y no entiende `light-dark()`: se lee `getComputedStyle(...).color` de un elemento de prueba) y la usan el mapa de un punto, el de rutas y el editor de polígonos. Las teselas se oscurecen con un filtro CSS sobre la capa base (clase propia `app-tiles`, global, porque el DOM de OpenLayers queda fuera de la encapsulación); las rutas usan `ROUTE_COLORS_DARK` en oscuro y el halo cambia de blanco a oscuro. Los controles de zoom pasan a 44 px y la atribución lleva fondo de superficie para llegar a 4,5 a 1. Al cambiar el tema, cada mapa repinta sus capas.

**4.9 Acciones de solo icono con título.** Regla pedida por la persona: un icono sin texto cerca debe decir para qué sirve al pasar el cursor. `ActionTitleDirective` (selector `[mat-icon-button]`) copia el `aria-label` a `title`, de modo que nombre accesible y título no se pueden separar y una acción nueva lo hereda con solo importar la directiva. Se eligió el `title` nativo y no `matTooltip` por ser lo que se pidió y por no abrir un overlay por cada fila de cada tabla; no sale con el foco del teclado, pero el nombre accesible sí lo anuncian los lectores de pantalla. El paginador de Material y el selector de tema (`mat-button-toggle`) se resuelven a su manera.

**4.8 Tablas auxiliares.** Seis hojas repiten `th/td/caption` (rutas, visitas, importar, vértices). Se factoriza en `:where(table.grid)` de `_ui-system.scss` y cada pantalla adopta la clase cuando la toca, reduciendo el peso de sus hojas.

## 5. Pantalla por pantalla

| Pantalla (ruta) | Cambia | No cambia | Riesgo | Red de seguridad |
|---|---|---|---|---|
| `/sin-permiso` | Panel con icono, nombre del rol y «Volver al inicio»; título «Sin permiso» en la barra | Textos «Sin permiso» y «No tienes permiso para ver esta página.», redirecciones de los guards | Bajo | `forbidden` y `shell` specs; barra y riel en banco |
| Tipos, conductores, vehículos (`/flota/*`) | Pestañas de Flota; tabla; formulario por secciones | Asignar y retirar conductor, enviar restablecimiento, confirmaciones, `ClientPaging` de conductores | Bajo | 43 pruebas de flota; contrato |
| Lugares (`/lugares`) | Tabla y formulario con mapa junto a las coordenadas desde 720 px | `LocationFields`: campos primero, mapa como ayuda, par incompleto no mueve el marcador | Medio (mapa) | 18 pruebas + 106 de `shared/map` |
| Zonas (`/zonas`) | Editor con mapa ancho y vértices al lado desde 1100 px; colores de 44 px; barra de guardado | Lista de vértices como fuente de verdad, validación del polígono, valores de color enviados | Medio | 24 pruebas; radios por nombre; `polygon-*` specs |
| Configuraciones (`/configuraciones`) | Secciones con icono, interruptores en lugar de casillas, resumen en lenguaje natural | Campos condicionales (`showFixedRoutes`, `showShift`, `showStayValue`), valores, reenvío de campos no editados | Medio | 30 pruebas; prueba nueva de `describeSettings` |
| Paquetes (`/paquetes`) | Cabecera con tres acciones (una principal); tabla con chips; formulario por secciones | Menú de estado, exportación (progreso, CSV), borrado, `buildUpdateBody` | Medio | 118 pruebas; export e importer sin editar |
| Importar (`/paquetes/importar`) | Pasos 1·2·3 visibles según `phase()`, selector de archivo estilizado con `::file-selector-button`, resultado en cifras | El `input[type=file]`, lectura en el navegador, límites, informe de errores, reintentar | Medio | specs de `package-import*`; flujo en banco con archivo de ejemplo |
| Jornadas, listado (`/jornadas`) | Enlace de nombre de 44 px, recuento, acción principal | Columnas (servicios y vehículos solo si el listado los informa), borrado | Bajo | Pruebas de `journeys`; contrato |
| Planificar (`/jornadas/nueva`) | Secciones numeradas y resumen fijo; botones de la barra del selector a 44 px | Un solo envío, `settingsId` y `selectedIds`, «Seleccionar todos los pendientes» (de 200 en 200), mensajes de planificación lenta | Alto | `journey-form` y `package-picker` specs; flujo con el simulado |
| Detalle de jornada (`/jornadas/:id`) | Cabecera con estado, cifras, mapa fijo desde 1100 px y rutas como tarjetas | Estados, `invalidPackageIds`, selección compartida mapa-tarjetas-leyenda, desplazamiento al mapa | Alto | `journey-detail`, `journey-routes` (reescrita), `routes-map` specs |
| Ruta (`/jornadas/:id/rutas/:n`) | Cabecera con avance y barra de marca; visitas como línea de tiempo | `RouteVisitsStore` entero (de a 6, una vez por id, «No disponible»), filtros, menú de estado | Alto | `route-visits` (reescrita), `route-visits.store` y `route-visit-filters` sin editar |

## 6. Responsive

Se verifica en 16 anchos (320 a 2560), a ambos lados de 479/480, 719/720, 959/960, 1023/1024 y 1099/1100, en claro y oscuro.

- **Bajo 480 px**: acciones de la cabecera bajo el título y la principal a ancho completo; barra de formulario fija al pie.
- **Bajo 720 px**: formularios en una columna; tablas con primera columna fija; tarjetas de ruta en una columna; la línea de tiempo con las acciones debajo.
- **720 a 1099 px**: formularios en dos columnas; mapa sobre las rutas en detalle de jornada; zona con vértices bajo el mapa.
- **Desde 1100 px**: detalle de jornada y zona divididos (mapa fijo con `position: sticky`), configuración con el resumen a un lado.
- **Pantallas grandes**: `.page` conserva 1200 px; las vistas divididas usan 1440 px (`.page.wide`); nada se estira más.

## 7. Lo que no se hace (y por qué)

- **Chips con recuento por estado, filtro de todo el listado, orden**: el gateway ignora `sort` y no filtra; solo se conoce la página cargada. Se muestra «Mostrando N de TOTAL» en su lugar.
- **Progreso por jornada, «rutas en curso», «paradas por visitar»**: no hay recurso de visitas por jornada; el avance por ruta ya sale de los estados de sus paquetes.
- **Acciones en lote**: cada cambio de estado es una petición.
- **Mapa de selección de paquetes y aviso «todos ubicados»**: solo se conocen coordenadas de los paquetes cargados, no de todos los elegidos.
- **Arrastrar y soltar el CSV, geocodificación**: comportamiento nuevo o sin contrato.

## 8. Riesgos y mitigación

- **Pruebas atadas a la estructura** (rutas de jornada, visitas): se reescriben sobre comportamiento, una a una, y el resumen de la sección lista cada cambio.
- **Barra fija y final recortado**: comprobación `fin` en cada sección con barra fija.
- **Cambio global de tokens (D1)**: la sección 1 se cierra con las 27 rutas medidas antes de seguir.
- **Colores del mapa en canvas**: la paleta se resuelve y se repinta al cambiar el tema; prueba de que el relleno del marcador cambia.
- **Colisión de clases**: `routes-map.component.scss` define sus propios `.card` y `.card-head` (encapsulados, ganan a los globales `:where`); al tocarlo se renombran.
- **Presupuestos**: lo común va a la hoja global; ninguna hoja de componente pasa de 2 kB.
- **Sin gateway real**: las cifras, el listado de jornadas y la importación se prueban con fixtures; se declara pendiente su comprobación con sesión real.
