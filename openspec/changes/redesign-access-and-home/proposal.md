# Proposal

## Why

La aplicación ya tiene tema claro y oscuro, pero las pantallas por las que entra cualquiera (iniciar sesión, crear cuenta) y la primera que se ve al entrar (Inicio) se quedaron en lo correcto sin ser memorables: una tarjeta de 440 px sobre un fondo de rutas apagado, campos con relleno tonal, enlaces en el azul por defecto del navegador, botones de 40 px, una lista de requisitos de contraseña de texto plano, y un Inicio que es una rejilla de enlaces. Además las etiquetas de estado usan los colores de la marca (una jornada completada sale violeta y un aviso, rosa), y en tema oscuro las rutas dibujadas se ven apagadas. Se quiere una imagen más cuidada y legible, con los dos temas tratados con el mismo esmero, sin tocar la lógica de acceso ni las llamadas al gateway.

## What Changes

- **Pantalla de acceso dividida desde 1024 px**: la ilustración de rutas con una presentación breve (título con una palabra en degradado de marca y tres ventajas) queda fija a la izquierda; el formulario ocupa su columna a pantalla completa. En pantallas más estrechas se conserva la tarjeta centrada sobre la ilustración. La presentación va después del formulario en el orden de lectura.
- **Controles de acceso con Material**: campos con contorno y esquinas de 12 px (`mat.form-field-overrides`), botones de 48 px (`mat.button-overrides`), enlaces con el color de la marca y de al menos 44 px de alto en el bloque de enlaces secundarios, y negrita en peso 500 (Roboto no carga el 700).
- **Registro más compacto**: nombre y apellidos comparten fila desde 420 px.
- **Requisitos de contraseña como etiquetas** con icono y texto (pendiente, cumplido, no cumplido), en lugar de una lista de texto.
- **Inicio con cabecera**: saludo y acciones principales («Planificar jornada» e «Importar paquetes», solo para quienes operan jornadas y paquetes) sobre un tinte de la marca, con la ilustración de rutas en su propia columna; las últimas jornadas muestran servicios y vehículos cuando el listado los informa, en columnas alineadas y con enlaces en el color de la marca.
- **Estados con color de significado**: verde, azul, ámbar y rojo en las etiquetas de estado (tokens `--app-*` definidos junto al tema, con contraste comprobado en claro y oscuro). **BREAKING (visual)** en todas las pantallas que usan `app-status-badge`.
- **Rutas luminosas en tema oscuro**: una variante más clara de la paleta de rutas (`ROUTE_COLORS_DARK`, `routeColorThemed`) para ilustraciones con `light-dark()`; la ilustración se mueve a `shared/brand/` porque ahora la usan el acceso y el Inicio.
- **Selector de tema** (Sistema, Claro u Oscuro): tres botones de icono seguidos (un grupo de opciones excluyentes de Material) arriba a la derecha de las pantallas de acceso y en la barra del área privada. Cambia al instante, recuerda la elección en el navegador (`ThemeService`) y la aplica antes del primer pintado con `assets/theme-init.js`, un fichero propio porque la CSP no admite scripts en línea.
- **Hilo de la marca**: `--app-brand-gradient` (primario a terciario del tema) en el botón principal de los formularios de acceso, la acción principal de Inicio, la barra de seguridad de la contraseña, el anillo de progreso y una palabra destacada de los títulos.
- **Pantallas de acceso terminadas como en el diseño**: títulos de bienvenida con frase de apoyo, iconos de sobre y candado dentro de los campos, «¿Olvidaste tu contraseña?» a la derecha y «¿No tienes cuenta?» centrado, barra de seguridad de cinco tramos sobre las etiquetas de requisitos, columna de pasos hasta la primera jornada en el registro y paneles de estado con icono (correo enviado, verificando, enlace no válido).
- **Inicio con cifras**: anillo de paquetes atendidos y cifras de pendientes y sin atender, con **una sola petición** de los 100 paquetes más recientes (el gateway no filtra por estado) y diciendo siempre sobre cuántos paquetes están calculadas.
- **Área privada con riel y búsqueda**: en pantallas anchas (960px o más) el menú lateral se sustituye por un **riel de iconos** (la marca arriba, una entrada por área con su nombre corto; «Flota» abre un menú con sus tres pantallas) y la barra superior pasa a mostrar el título de la pantalla, una **búsqueda «Buscar o ir a…»** (Ctrl K) que encuentra las pantallas del rol y las acciones principales, el selector de tema y el avatar con el degradado de la marca. En pantallas estrechas se conserva el menú desplegable, con la marca reducida al emblema por debajo de 480px.
- **Tipografía de marca**: Manrope para titulares, cifras y nombres destacados (Roboto sigue en el texto); afecta a los títulos de todas las pantallas.
- **Inicio como en el diseño**: fecha, saludo según la hora y un resumen con datos reales sobre un **mapa de ciudad** decorativo (SVG con tres rutas), anillo de paquetes con su leyenda, dos cifras sueltas y las últimas jornadas con una acción «Ver todas»; los mosaicos de áreas desaparecen de Inicio porque el riel y la búsqueda ya llevan a cada área.
- **Corrección en el área privada**: el área con desplazamiento medía el doble de su relleno más de lo que cabía en la ventana y recortaba el final de cada pantalla; ahora el final se ve entero con su margen.
- Fuera de alcance, a propósito: el rediseño del contenido del resto de pantallas (flota, lugares, zonas, configuraciones, jornadas, paquetes: solo heredan el riel, la barra y la tipografía), el mapa de OpenLayers en oscuro y lo que el diseño mostraba sin datos reales detrás: barras de progreso por jornada y «rutas en curso / paradas por visitar» (las jornadas del listado solo informan tiempos mínimo, medio y máximo y el gateway no tiene un recurso de visitas por jornada), por lo que se muestran las cifras de paquetes que sí existen.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities
- `access-screens`: la tarjeta centrada pasa a ser el diseño de pantallas estrechas y se añade el diseño dividido desde 1024 px; se añaden la presentación del producto, los controles de acceso (campos con contorno, botones y enlaces con tamaño táctil), el registro compacto y los requisitos de contraseña como etiquetas; las rutas del fondo ganan una variante luminosa en tema oscuro.
- `home-dashboard`: la cabecera pasa a ser fecha, saludo, resumen y acciones principales con un mapa de ciudad; los mosaicos de accesos se sustituyen por el riel y la búsqueda; se añaden las cifras de paquetes y el detalle (servicios y vehículos) de las últimas jornadas.
- `app-ui-system`: las etiquetas de estado usan colores con el significado del estado (verde, azul, ámbar, rojo) definidos una sola vez junto al tema; el tema sigue al sistema salvo que la persona elija otro con el nuevo selector de tema; y el degradado de la marca se define una vez.
- `ui-material-theme`: el riel de navegación, la búsqueda de la barra superior, la tipografía de marca, el selector de tema en la barra y el área con desplazamiento sin recortes; el layout base y el menú por secciones pasan a describir el riel y el menú desplegable.

## Impact

- `ng-ruteando/src/app/features/access/` (layout con plantilla y hoja propias, componente de presentación nuevo, parcial `_access-theme.scss`, registro), `shared/brand/route-backdrop.component.*` (movido desde `features/access/`), `shared/form/password-field.component.ts`, `shared/ui/status-badge.component.ts` y `_ui-system.scss`, `shared/map/route-colors.ts`, `home/` (plantilla y hoja propias), `layout/` (`shell`, `nav-rail`, `global-search`, `nav-items`), `shared/brand/` (`brand`, `city-map`), `shared/ui/theme-toggle.component.ts` y `src/styles.scss` (tokens `--app-*` y tipografía) con `src/index.html` (Manrope).
- Pruebas: layout de acceso, estilo común de las pantallas, campo de contraseña, etiqueta de estado, colores de ruta, fondo de rutas, contraste e Inicio.
- Sin dependencias nuevas y con una sola fuente nueva (Manrope, del mismo origen de Google Fonts que ya admite la CSP), sin cambios en `core/`, el servidor, el gateway ni las rutas, y sin cambios de comportamiento en validación, mensajes, foco, redirección ni carga de datos.
- Presupuestos: ningún estilo de componente supera los 2 kB de aviso (el layout de acceso se partió en layout y presentación para cumplirlo).
