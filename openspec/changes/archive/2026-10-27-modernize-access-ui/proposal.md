# Proposal

## Why

La vista de acceso es la primera pantalla que ve cualquiera y hoy parece un borrador: una tarjeta blanca de 440 px pegada arriba sobre un fondo gris plano, con «Ruteando» como texto morado suelto, sin identidad ni sensación de producto, sin tema oscuro, y con el mismo estilo de título, formulario y enlaces copiado en cada una de las pantallas. Se quiere una imagen más moderna sin tocar la lógica de acceso ni el resto de la aplicación.

## What Changes

- **Tarjeta flotante centrada** (vertical y horizontalmente) sobre un fondo temático, con efecto de cristal suave, borde y sombra, y con una alternativa opaca donde el navegador no lo soporte o la persona pida más contraste.
- **Fondo decorativo en SVG dibujado por código** con el lenguaje del negocio: un depósito «D», rutas por vehículo, paradas numeradas y una zona. Es decorativo (oculto a lectores de pantalla), ligero y usa los colores del tema; una animación discreta dibuja la ruta una vez y se desactiva con `prefers-reduced-motion`.
- **Marca nueva en SVG**: el cronómetro con flechas de ruta del logo original recreado y recoloreado en violeta con los colores del tema, y la palabra «Ruteando» como texto real. No se reutilizan los PNG del legacy ni la foto de Bogotá.
- **Tema claro y oscuro automático** según la preferencia del sistema, **solo en la vista de acceso**: el resto de la aplicación conserva su tema.
- **Estilos comunes de las pantallas de acceso** (título, formulario, botón a ancho completo, enlaces secundarios) en un solo sitio, y las pantallas dejan de duplicarlos.
- **BREAKING (visual)**: cambia el aspecto de `/acceso`, `/acceso/registro`, `/acceso/recuperar`, `/acceso/verificar-email` y `/acceso/restablecer`; ninguna ruta, texto de validación ni comportamiento cambia.
- Fuera de alcance: interruptor manual de tema o recordar la elección, el tema del resto de la aplicación, cambios en la lógica de acceso, y reutilizar imágenes raster del legacy (el logo original y la foto quedan solo como referencia en el historial de git, en `c917528^:app/img/`).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities
- `access-screens`: se añaden requisitos de tema claro y oscuro automático, marca, fondo decorativo accesible, movimiento reducido, contraste suficiente, tarjeta centrada y coherencia visual entre pantallas; los requisitos existentes se mantienen.

## Impact

- `ng-ruteando/src/app/features/access/access-layout.component.ts` (y su spec), las pantallas `login`, `register`, `forgot-password`, `reset-password` y `verify-email` para quitar estilos duplicados, y nuevos componentes de marca y de fondo en `features/access/`.
- `ng-ruteando/src/styles.scss` (solo una regla acotada a la vista de acceso) y un parcial de estilos nuevo.
- Sin dependencias nuevas, sin imágenes en el repositorio (todo es SVG inline) y sin cambios en `core/`, el servidor ni el gateway.
- Presupuestos de `anyComponentStyle` (2 kB de aviso, 4 kB de error): los estilos nuevos deben caber o ir en el parcial global.
