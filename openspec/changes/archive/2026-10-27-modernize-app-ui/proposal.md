# Proposal

## Why

La vista de acceso ya tiene una imagen moderna (tema claro y oscuro, tarjeta de cristal, marca y fondo de rutas), pero en cuanto la persona inicia sesión pasa a un área privada con el aspecto por defecto de Material: barra superior de color plano, menú lateral básico, títulos y resúmenes con estilos repetidos pantalla a pantalla, tablas y formularios sin superficies, y siempre en tema claro. La experiencia salta de una a otra. Se quiere llevar la misma línea de diseño a todas las vistas de la aplicación.

## What Changes

- **Tema claro y oscuro automático en toda la aplicación**, según la preferencia del sistema, con una sola definición del tema (la de `access-theme` pasa al `html` y la vista de acceso deja de tener una propia).
- **Shell moderno**: barra superior en tono de superficie con la marca de la aplicación y un avatar con las iniciales de la persona, menú lateral con encabezado, secciones rotuladas y elemento activo en píldora, y un contenido centrado con ancho máximo y márgenes que respiran.
- **Sistema de interfaz común** en un parcial global: superficies (tarjetas redondeadas con borde suave), rejilla de datos resumen, apilado y espaciado, y un componente de **etiqueta de estado** (icono y texto, con tono por significado) para estados de paquetes, jornadas y visitas.
- **Componentes compartidos renovados**: cabecera de página (título, subtítulo opcional y acciones), tabla de datos dentro de una tarjeta con cabecera, filtro, estados de carga, vacío y error con icono, formulario por secciones en tarjeta con rejilla de dos columnas en pantallas anchas, diálogos redondeados.
- **Todas las pantallas de negocio** adoptan el sistema: listados (lugares, paquetes, flota, configuraciones, jornadas, zonas), formularios, importación de CSV, detalle de jornada y de ruta con sus visitas, selector de paquetes, y las vistas con mapa y editor de polígonos (contenedores con borde y radio).
- **Inicio** con tarjetas: saludo, accesos como mosaicos con icono y últimas jornadas en una tarjeta.
- **BREAKING (visual)**: cambia el aspecto de todas las pantallas; ninguna ruta, texto de validación, permiso, petición al gateway ni comportamiento cambia, y se conserva la estructura semántica que usan las pruebas y los lectores de pantalla (`dl.summary`, tablas con subtítulo, regiones `aria-live`).
- Fuera de alcance: interruptor manual de tema, tema oscuro de las teselas del mapa (las teselas de OpenStreetMap se quedan como están), ilustraciones nuevas más allá de las ya hechas, y cualquier cambio de lógica, rutas o API.

## Capabilities

### New Capabilities
- `app-ui-system`: tema claro y oscuro global, superficies y estilo común de página, etiquetas de estado con icono, estados vacío y de error con icono, contraste, movimiento reducido y comportamiento en pantallas estrechas para toda la aplicación.

### Modified Capabilities
- `ui-material-theme`: el tema global pasa a ser claro y oscuro automático y el layout base añade el aspecto del shell (marca, avatar, menú con encabezado y contenido centrado).
- `data-management-ui`: se añade la presentación de listados y formularios en tarjetas.
- `home-dashboard`: se añade la presentación del inicio con tarjetas.

## Impact

- `ng-ruteando/src/styles.scss` (el tema pasa al `html`), un parcial nuevo del sistema de interfaz, `layout/shell.component.*`, `shared/data/*`, `shared/form/*`, `shared/confirm-dialog`, `shared/map/*` (solo contenedores), `home/`, y los componentes con estilos propios de `features/fleet`, `places`, `packages`, `settings`, `journeys`, `zones` (unos 24 archivos que hoy repiten estilos de título, resumen y tabla).
- La `BrandComponent` de acceso pasa a `shared/` porque la usa también el shell.
- Pruebas: se actualizan las que dependen del tema acotado a acceso (`access-theme.spec.ts`) y se añaden las del sistema de interfaz; las demás no deben cambiar de comportamiento.
- Sin dependencias nuevas, sin imágenes en el repositorio y sin cambios en `core/`, el servidor ni el gateway.
- **Orden**: este change se apoya en `modernize-access-ui` (marca, tema y estilos comunes de acceso); hay que archivarlo antes, o aplicar este sobre su rama, y entonces retirar de la spec `access-screens` el escenario «El resto de la aplicación no cambia», que deja de ser cierto.
