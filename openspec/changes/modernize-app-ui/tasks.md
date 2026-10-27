# Tasks

## 1. Punto de partida y tema único

- [ ] 1.1 Confirmar que `modernize-access-ui` está archivado (o que se trabaja sobre su rama) y, con `access-screens` ya con el requisito «Tema claro y oscuro automático», añadir a este change el delta que lo modifica retirando el escenario «El resto de la aplicación no cambia», con todos sus demás escenarios intactos; verificar con `openspec validate modernize-app-ui --strict`
- [x] 1.2 Mover el tema claro y oscuro (`theme-type: color-scheme`) de `_access-theme.scss` al `html` de `styles.scss` y dejar en `_access-theme.scss` solo los estilos comunes de las pantallas de acceso; actualizar `access-theme.spec.ts` para comprobar que todo el documento cambia con `color-scheme`; verificar con `npm run test:ci`, que `npm run build` no emite avisos y que en el navegador el área privada ya sigue la preferencia del sistema
- [x] 1.3 Crear el parcial `shared/ui/_ui-system.scss` (`.page`, `.card`, `.card-title`, `.stat-grid`, `.stat`, `.section`, `.visually-hidden` único) con selectores `:where` y cargarlo desde `styles.scss`; verificar con una prueba que monta un elemento con cada clase y comprueba radio, borde y ancho máximo, y que el contraste de las superficies nuevas cumple 4,5 a 1 en ambos esquemas (ampliando la prueba de contraste a un spec compartido)

## 2. Componentes compartidos

- [x] 2.1 Crear `StatusBadgeComponent` y `statusTone(domain, key)` (paquetes, jornadas y visitas) con icono `aria-hidden`, texto en español y tonos de pares `*-container`; verificar con sus specs (icono y texto, tono por significado, clave desconocida neutra, solo el nombre para lectores) y contraste en claro y oscuro
- [x] 2.2 Renovar `PageHeaderComponent` (título, subtítulo opcional y acciones, con el estilo de título común) y los estados de carga, vacío y error de `DataTableComponent` con un bloque con icono; verificar con los specs existentes sin cambios de comportamiento y con pruebas de los bloques (`role="status"`, `role="alert"`, «Reintentar», texto de vacío con acción)
- [x] 2.3 Colocar `DataTableComponent` en una `.card` (filtro, tabla y paginador), con cabecera de columnas y hover de filas solo con movimiento permitido, y permitir columnas de estado como etiqueta; verificar con `data-table.component.spec.ts` y que `caption.visually-hidden` y las etiquetas `aria-label` se conservan
- [x] 2.4 Redondear `ConfirmDialogComponent` y los diálogos de Material con los tokens del tema y revisar `FormResultComponent`, `PasswordFieldComponent` y `LocationFieldsComponent` en tema oscuro; verificar con sus specs y a mano en el navegador

## 3. Shell

- [x] 3.1 Mover `BrandComponent` a `shared/brand/` con una variante compacta (`size`) y actualizar sus importaciones y su spec; verificar con `npm run test:ci` y que acceso se ve igual
- [x] 3.2 Rediseñar el shell: barra en tono de superficie con la marca y un avatar con las iniciales que abre el menú de usuario, menú lateral con encabezado, secciones rotuladas, entradas en píldora y activa con fondo propio y `aria-current`, y contenido en `.page`; verificar con `shell.component.spec.ts` (estructura, roles, menú por rol, cierre de sesión confirmado, marca y avatar con iniciales) y a mano en 360 px y en pantalla ancha

## 4. Inicio

- [x] 4.1 Rediseñar `HomeComponent` con saludo (nombre o correo), accesos como mosaicos con icono y las últimas jornadas en una tarjeta con etiqueta de estado; verificar con `home.component.spec.ts` (saludo, mosaicos como enlaces, etiqueta de estado, comportamiento por rol y estados de carga, vacío y error intactos)

## 5. Listados

- [x] 5.1 Adoptar cabecera, tarjeta y etiquetas de estado en los listados de paquetes y jornadas (columna de estado como etiqueta), y de lugares, zonas, configuraciones, tipos de vehículo, vehículos y conductores en cabecera y tarjeta; verificar con los specs de cada listado sin cambios de comportamiento y con una prueba de que los estados salen como etiqueta con icono y texto

## 6. Formularios

- [x] 6.1 Aplicar `.card`, `.form-grid` (dos columnas desde 720 px) y `.form-actions` a los formularios de lugares, paquetes, tipos de vehículo, vehículos, conductores, configuraciones y zonas, y al de planificar jornada y al de importar CSV, quitando sus estilos repetidos; verificar con los specs de cada formulario (validación, foco al primer campo inválido, salir con cambios, envío) sin cambios y con una prueba de que los campos se agrupan en tarjeta y en una columna en pantalla estrecha

## 7. Detalles y mapas

- [x] 7.1 Rediseñar el detalle de jornada y el de ruta con `.stat-grid` (conservando `dl.summary > div > dt/dd`), tablas de rutas y paradas en `.card`, y etiquetas de estado en la jornada y en las visitas; verificar con los specs de `journey-detail`, `journey-routes`, `route-detail` y `route-visits` sin cambios de comportamiento
- [x] 7.2 Dar borde y radio a los contenedores de mapa (`routes-map`, `map-view`, editor de polígonos y tabla de vértices) y estilo común al selector de paquetes de la planificación; verificar con sus specs y a mano en claro y oscuro que la leyenda, la ficha de parada y los controles se leen

## 8. Verificación y cierre

- [ ] 8.1 Levantar el mock del gateway (`npm run mock:gateway`) y la app, y recorrer todas las pantallas del área privada en tema claro y oscuro, en 360 px (con iframe) y en pantalla ancha, solo con teclado y con movimiento reducido; verificar con capturas de cada familia (inicio, listado, formulario, detalle de jornada, detalle de ruta con visitas, mapa y editor de zonas) y anotar los ajustes
- [x] 8.2 Documentar en `CLAUDE.md` el sistema de interfaz (`shared/ui/_ui-system.scss`, `StatusBadgeComponent`, la regla de no repetir estilos de título, resumen ni superficie en los componentes, y el tema único en `styles.scss`); verificar que lo escrito cita rutas y archivos que existen
- [x] 8.3 Ejecutar `npm run test:ci` y `npm run build` en `ng-ruteando/`, `npm run test:server` y `openspec validate --specs --strict`; verificar que pasan sin errores ni avisos nuevos (incluidos los presupuestos de estilos de componente)

## Workflow follow-up

- Si se quiere un interruptor manual de tema o teselas de mapa oscuras, abrir un change aparte.
- Archivar el change con `/opsx:archive` tras la revisión.
