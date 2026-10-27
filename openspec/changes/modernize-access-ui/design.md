# Design

## Context

Ver proposal.md (Why). Estado observado en el código:

- `AccessLayoutComponent` es un `<main class="access">` con `align-items: flex-start`, fondo `surface-container-low`, una tarjeta `.panel` de 440 px y «Ruteando» como `<p class="brand">`; envuelve un `<router-outlet>` con las pantallas hijas.
- Cada pantalla (`login`, `register`, `forgot-password`, `reset-password`, `verify-email`) declara en su propio componente los estilos de `h1`, del `form` (columna con `gap: 8px`), de `.links` o `.alt`, de modo que el aspecto está repetido.
- El tema vive en `styles.scss`: `html { color-scheme: light; @include mat.theme(...) }` con paleta violeta y terciaria rosa, `theme-type: light`, Roboto y densidad 0. Los componentes leen `--mat-sys-*`.
- Los presupuestos de `ng-ruteando` son `anyComponentStyle` 2 kB de aviso y 4 kB de error; los estilos de componente grandes los romperían.
- La spec `access-screens` ya exige errores asociados a los campos, foco al primer campo inválido, anuncios sin mover el foco, 360 px sin desplazamiento horizontal y textos en español. Su `layout.spec` comprueba que se muestre «Ruteando», que exista `main`, un `router-outlet` y que no haya barra ni menú lateral.
- Imágenes del legacy: el logo real es un PNG de 920x280 con el texto gris oscuro (desaparece en oscuro) y en azul (choca con el violeta); la foto de Bogotá pesa 2,7 MB y su licencia es desconocida. Se descartan.

## Goals / Non-Goals

**Goals:**
- Una vista de acceso moderna, coherente en las cinco pantallas, en claro y oscuro.
- Sin imágenes en el repositorio y sin peticiones nuevas: todo SVG inline.
- Cero cambios de comportamiento: validación, foco, anuncios y redirecciones intactos.

**Non-Goals:**
- Interruptor manual de tema ni recordar la preferencia (solo `prefers-color-scheme`).
- Cambiar el tema o el aspecto del resto de la aplicación.
- Reproducir el logo original píxel a píxel: se recrea su idea (cronómetro con tres flechas de ruta) en SVG.

## Decisions

1. **Tema acotado con una clase, no con `html`.** Se añade `.access-theme` al `<main>` del layout y en un parcial `features/access/_access-theme.scss` (cargado desde `styles.scss`) se declara `color-scheme: light dark` y `mat.theme(...)` con la misma paleta violeta y rosa y `theme-type: color-scheme`, de modo que los tokens `--mat-sys-*` usan `light-dark()` y siguen la preferencia del sistema solo dentro de esa rama del DOM. El `html` y el área privada no cambian. Alternativa: cambiar `html` a claro y oscuro; descartada, afecta a toda la aplicación (fuera de alcance). Si `theme-type: color-scheme` no funcionara como se espera en la versión instalada, plan B: dos bloques `@media (prefers-color-scheme)` con `theme-type: light` y `dark`.
2. **Marca como componente con SVG inline.** `BrandComponent` dibuja el emblema (círculo con botón de cronómetro y tres flechas en rotación) con `fill: currentColor` y tokens del tema, marcado `aria-hidden`, y la palabra «Ruteando» como texto HTML (Roboto 500, espaciado de letras) para que sea real, nítida y la lea el lector de pantalla. Alternativa: `<img>` con el PNG; descartada por el modo oscuro, la paleta y la resolución.
3. **Fondo como componente SVG aparte** (`RouteBackdropComponent`): `viewBox` fijo con `preserveAspectRatio="xMidYMid slice"`, posición absoluta detrás de la tarjeta, `aria-hidden="true"`, `focusable="false"` y `pointer-events: none`. Dibuja un depósito «D», dos o tres rutas con los colores de la paleta de rutas (`shared/map/route-colors.ts`, Okabe-Ito) a baja opacidad, paradas numeradas con el estilo del mapa de rutas (`2·3`) y un polígono de zona tenue. Los colores salen de variables CSS para que cambien con el tema. Alternativa: una foto (la de Bogotá) o un PNG; descartadas por peso, licencia y tema.
4. **Animación mínima:** `stroke-dasharray` y `stroke-dashoffset` dibujan las rutas una vez (~1,2 s, `ease-out`), y `@media (prefers-reduced-motion: reduce)` la quita dejando el dibujo completo. La tarjeta no se anima y el formulario es utilizable desde el primer instante.
5. **Tarjeta de cristal con alternativas.** Fondo `color-mix(in srgb, var(--mat-sys-surface) 78%, transparent)`, `backdrop-filter: blur(12px)`, borde `outline-variant` y sombra suave, solo dentro de `@supports (backdrop-filter: blur(1px))` y fuera de `@media (forced-colors: active), (prefers-contrast: more)`; en cualquier otro caso la tarjeta es opaca (`surface`). La legibilidad nunca depende del desenfoque.
6. **Centrado robusto:** `display: grid; place-items: center; min-height: 100dvh` con el panel `overflow-y: auto` solo en la página (no en la tarjeta), de modo que un formulario largo desplaza la página y se puede alcanzar; en 360 px la tarjeta ocupa el ancho con margen de 16 px.
7. **Estilos comunes en el parcial global acotado a `.access-theme`**, con selectores de baja especificidad (`:where()`), para título, formulario, botón principal a ancho completo y bloque de enlaces secundarios. Las cinco pantallas borran sus estilos duplicados y usan clases comunes (`.access-form`, `.access-links`); así el cambio visual futuro es de un solo sitio. Alternativa: un componente `AccessCard` con proyección; descartada por mayor alcance y por tocar la lógica de cada plantilla.
8. **Texto de apoyo opcional:** una línea de eslogan bajo la marca («Planifica y sigue tus rutas») como supuesto; es contenido, no comportamiento, y se puede cambiar en la revisión.

## Risks / Trade-offs

- [`backdrop-filter` penaliza equipos modestos] → desenfoque moderado, solo bajo `@supports`, y la tarjeta opaca como alternativa.
- [Contraste insuficiente sobre un fondo decorativo] → la tarjeta es casi opaca (78 %) y los trazos del fondo son de baja opacidad; una prueba calcula la relación de contraste de los pares de tokens en claro y oscuro (`color-scheme` explícito en el elemento de prueba) y se verifica a mano en navegador con ambos temas.
- [Presupuesto `anyComponentStyle`] → estilos comunes en el parcial global y SVG con atributos; se comprueba con `npm run build` sin avisos nuevos.
- [El logo recreado no gusta frente al original] → se muestra en la revisión; al ser un componente aislado, cambiarlo no toca nada más.
- [Dos mundos de tema (acceso oscuro, interior claro) al iniciar sesión] → es el alcance acordado; queda anotado como siguiente decisión por si se quiere extender.
- [Prerender y servidor] → todo es SVG y CSS puro, sin acceso a `window` ni a `matchMedia`, así que el render en servidor no cambia.

## Migration Plan

Cambio visual sin migración de datos. Se despliega con el resto; para revertir basta revertir el commit. Se verifica a mano en el navegador (claro, oscuro, 360 px, movimiento reducido, colores forzados) con el mock del gateway (`npm run mock:gateway`).
