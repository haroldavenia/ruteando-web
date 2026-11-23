# Tasks

## 1. Iconos de línea
- [x] 1.1 `Material Symbols Outlined` en `index.html` y clase `material-icons` en `styles.scss`; glifos de estado del diseño en `TONE_ICONS`; cubo en Paquetes
- [x] 1.2 Comprobado en Chrome real que ningún icono de las 19 rutas del área privada se queda como texto (sonda `probe-ligaduras.js`)

## 2. Base de los listados
- [x] 2.1 `FullListState` (carga completa, tope de 1000, `truncated`) con pruebas
- [x] 2.2 `DataTableComponent`: búsqueda con `/`, densidad, cabecera, referencia en monoespaciada (`DataColumn.kind`), acciones al pasar el cursor, modo cliente (filtro y paginación) — estilo en `shared/data/_data-list.scss`
- [x] 2.3 Chips de estado con recuento (`facet`), selección con barra de acciones (`selectable`, `#selectionActions`) y vista de tarjetas (`#card`)
- [x] 2.4 `formatRelativeTime` («hace 12 min») para la columna «Actualizado»

## 3. Módulos
- [x] 3.1 Paquetes: chips, selección, cambio de estado de varios (`package-bulk-status.ts`) y exportación de los elegidos
- [x] 3.2 Jornadas: chips de estado
- [x] 3.3 Flota, vehículos: tarjetas y alternador tarjetas/tabla
- [x] 3.4 Lugares: lista con mapa (`PlacesMapComponent`), chips de tipo y ficha del pin elegido

## 4. Cierre
- [x] 4.1 Responsive medido en Chrome real con la suite `scroll` en los ocho listados: 13 anchos de 320 a 1366px en claro (104 de 104) y en oscuro (104 de 104) y el texto al 200 % a 320 y 390px (16 de 16); `test:ci` 1670 correctas; `build` sin avisos
- [x] 4.2 `CLAUDE.md`, memoria y banco visual al día
- [ ] 4.3 Sin verificar y se declara (cierre acordado con la persona el 2026-10-31; se repite cuando el gateway real esté activo): todo contra el gateway real (hoy caído; se probó con el gateway simulado y datos ficticios, y hay que repetirlo cuando esté activo: carga de las páginas de 100, cambio de estado de varios paquetes, recuentos), Safari, Firefox, un lector de pantalla real y un teléfono físico
- [ ] 4.4 Sin commit ni PR hasta que la persona lo pida
