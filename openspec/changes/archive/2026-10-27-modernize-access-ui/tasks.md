# Tasks

## 1. Tema claro y oscuro acotado a la vista de acceso

- [x] 1.1 Crear el parcial `features/access/_access-theme.scss` con la clase `.access-theme` (`color-scheme: light dark` y `mat.theme` con la misma paleta violeta y rosa y `theme-type: color-scheme`), cargarlo desde `styles.scss` y no tocar el `html`; verificar con `npm run build` sin avisos, y con una prueba que un elemento con `.access-theme` y `color-scheme: dark` resuelve `--mat-sys-surface` distinto del que resuelve con `color-scheme: light`, y que un elemento fuera de la clase conserva el valor claro (si `theme-type: color-scheme` no funciona, aplicar el plan B del diseño y anotarlo)
- [x] 1.2 Añadir una prueba de contraste que calcule la relación WCAG de los pares de tokens usados (texto sobre superficie, texto del botón sobre `primary`, error sobre superficie, borde del campo y foco sobre superficie) con `color-scheme` claro y oscuro; verificar que son al menos 4,5 a 1 para el texto y 3 a 1 para bordes y foco en ambos temas

## 2. Marca

- [x] 2.1 Crear `BrandComponent` (emblema SVG recreado con el cronómetro y las tres flechas, `aria-hidden`, y «Ruteando» como texto real) con colores de los tokens del tema y, opcionalmente, la línea de apoyo; verificar con su spec (el texto «Ruteando» está en el DOM, el SVG tiene `aria-hidden="true"` y no hay `<img>`) y que el estilo del componente cabe en el presupuesto de `anyComponentStyle`

## 3. Fondo decorativo

- [x] 3.1 Crear `RouteBackdropComponent` con el SVG (depósito «D», dos o tres rutas con la paleta de `route-colors.ts`, paradas numeradas y una zona tenue) con colores por variables CSS, `aria-hidden="true"`, `focusable="false"` y `pointer-events: none`; verificar con su spec (oculto a lectores, sin elementos enfocables, sin `<img>` ni `url()` externos) y que no añade peticiones de red
- [ ] 3.2 Añadir la animación de entrada (las rutas se dibujan una vez, menos de dos segundos) y desactivarla con `prefers-reduced-motion: reduce`; verificar con una prueba que el CSS del componente contiene la regla de movimiento reducido que quita la animación y deja el trazo completo, y a mano en el navegador con la preferencia activada

## 4. Layout y tarjeta

- [x] 4.1 Reescribir `AccessLayoutComponent` con `.access-theme`, el fondo, la marca y la tarjeta centrada (cuadrícula con `min-height: 100dvh`, desplazamiento de la página en pantallas bajas, 16 px de margen en 360 px) y la tarjeta de cristal bajo `@supports` con alternativa opaca en `forced-colors` y `prefers-contrast: more`; verificar con `access-layout.component.spec.ts` actualizado (sigue mostrando «Ruteando», `main`, `router-outlet`, sin barra ni menú lateral, y ahora la marca y el fondo) y a mano que en 360 px no hay desplazamiento horizontal

## 5. Coherencia de las pantallas

- [x] 5.1 Mover al parcial los estilos comunes (título, formulario, botón principal a ancho completo, enlaces secundarios agrupados) con selectores de baja especificidad bajo `.access-theme`, y quitar los estilos duplicados de `login`, `register`, `forgot-password`, `reset-password` y `verify-email`, usando las clases comunes; verificar con los specs existentes de las cinco pantallas sin cambios de comportamiento (validación, mensajes, foco al primer campo inválido, redirección, anuncios) y con una prueba de que cada pantalla con formulario usa las clases comunes y no declara estilos propios de título ni de enlaces

## 6. Verificación en el navegador y cierre

- [ ] 6.1 Levantar el mock del gateway (`npm run mock:gateway`) y la app, y recorrer las cinco pantallas en tema claro y oscuro, en 360 px y en pantalla alta, con movimiento reducido y con colores forzados, y solo con teclado; verificar con capturas de cada caso y anotar cualquier ajuste (o revisión de la marca y del eslogan) antes de cerrar
- [x] 6.2 Documentar en `CLAUDE.md` la regla de que el tema oscuro y los estilos comunes son solo de la vista de acceso (`.access-theme`) y dónde viven la marca y el fondo; verificar que lo escrito cita rutas y archivos que existen
- [x] 6.3 Ejecutar `npm run test:ci` y `npm run build` en `ng-ruteando/` y `openspec validate --specs --strict`; verificar que pasan sin errores ni avisos nuevos (incluidos los presupuestos de estilos de componente)

## Workflow follow-up

- Si se quiere extender el tema oscuro al resto de la aplicación, abrir un change aparte.
- Archivar el change con `/opsx:archive` tras la revisión.
