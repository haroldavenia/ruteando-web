# Tasks

## 1. Colores de estado, hilo de la marca y rutas luminosas

- [x] 1.1 Definir en `styles.scss` los pares `--app-{success,info,warning}-container` y `--app-on-…` con `light-dark()` y usarlos en `StatusBadgeComponent` (el peligro sigue con `error-container`); verificar con `contrast.spec.ts` (cada par al menos 4,5 a 1 en claro y oscuro) y con `status-badge.component.spec.ts` (cada tono resuelve el color de su token y el éxito ya no es el contenedor de la marca)
- [x] 1.2 Definir una sola vez `--app-brand-gradient` (primario a terciario del tema); verificar con `contrast.spec.ts` (el texto de `on-primary` supera 4,5 a 1 sobre los dos extremos en los dos temas)
- [x] 1.3 Añadir `ROUTE_COLORS_DARK` y `routeColorThemed()` a `shared/map/route-colors.ts`; verificar con `route-colors.spec.ts` y con `contrast.spec.ts` (cada variante oscura supera 3 a 1 frente a la superficie oscura y frente al tinte de la marca)
- [x] 1.4 Mover `RouteBackdropComponent` a `shared/brand/` (con `git mv`), añadirle la entrada `align` y usar `routeColorThemed`; verificar con su spec

## 2. Selector de tema

- [x] 2.1 `ThemeService` (`core/theme/`): elección Sistema, Claro u Oscuro guardada en `localStorage` (`ruteando-theme`), aplicada con `data-theme` en `<html>`, segura en el servidor y sin romperse si el almacenamiento falla; `html[data-theme]` en `styles.scss` solo cambia `color-scheme`; verificar con `theme.service.spec.ts` (aplica y guarda, olvida con Sistema, ignora valores no válidos, el color del documento cambia de verdad, almacenamiento bloqueado, servidor)
- [x] 2.2 `src/assets/theme-init.js`, cargado en `index.html`, para aplicar la elección antes del primer pintado sin script en línea (la CSP solo admite `'self'`); verificar en Chrome real que se aplica con el documento en «loading» y antes del primer pintado, y con el servidor en `CSP_MODE=enforce` sin violaciones
- [x] 2.3 `ThemeToggleComponent` (tres botones de icono seguidos, grupo de selección única de 44px), en la barra del shell y arriba a la derecha de las pantallas de acceso; verificar con `theme-toggle.component.spec.ts`, `shell.component.spec.ts` y `access-layout.component.spec.ts`

## 3. Pantallas de acceso

- [x] 3.1 `AccessLayoutComponent` con plantilla y hoja propias: tarjeta centrada en estrecho y, desde 1024 px, dos columnas con la ilustración fija; presentación en `AccessPitchComponent` y, en el registro (`data: { pitch: 'steps' }`), en `AccessStepsComponent`; verificar con sus specs (estructura, orden de lectura, oculta en estrecho; el diseño ancho se cubre en el navegador, ver 5.2)
- [x] 3.2 Controles de Material por tokens: campos con contorno (`MAT_FORM_FIELD_DEFAULT_OPTIONS`), esquinas de 12 px y botones de 48 px con `mat.form-field-overrides` y `mat.button-overrides` en `.access-theme`, enlaces en el color de la marca, negrita de peso 500; verificar con `access-screens-style.spec.ts`
- [x] 3.3 Título de bienvenida y frase de apoyo, iconos de sobre y candado en los campos, «¿Olvidaste tu contraseña?» a la derecha y «¿No tienes cuenta?» centrado, y botón principal con `--app-brand-gradient` (con la especificidad necesaria para ganar a `.mdc-button { background: transparent }`); verificar con `access-screens-style.spec.ts` y `app.routes.spec.ts`
- [x] 3.4 Registro compacto (nombre y apellidos en una fila hasta 420 px), requisitos de contraseña como etiquetas y barra de seguridad de cinco tramos; verificar con `access-screens-style.spec.ts` y `password-field.component.spec.ts`
- [x] 3.5 Paneles de estado con icono (correo enviado en registro y en recuperar, verificando, enlace no válido en verificar y restablecer); verificar con los specs de cada pantalla, que siguen sin cambios de comportamiento

## 4. Inicio y área privada

- [x] 4.1 `HomeComponent` con plantilla y hoja propias: cabecera con título «Ruteando», saludo, acciones por rol (la principal con el degradado) e ilustración en su columna desde 720 px; verificar con `home.component.spec.ts`
- [x] 4.2 Cifras de paquetes: una sola petición de los 100 paquetes más recientes (`packageFigures`, con su spec), anillo de progreso (`ProgressRingComponent`, con su spec), «Pendientes de ruta» y «Sin atender», con estados de carga, error con «Reintentar», sin paquetes, roles sin acceso y servidor; la frase dice siempre sobre cuántos paquetes está calculado
- [x] 4.3 Detalle de las últimas jornadas (servicios y vehículos si el listado los informa), filas alineadas desde 720 px (`.status-rows` en el sistema de interfaz) y enlaces de 44 px en el color de la marca; botones de la página de 48 px
- [x] 4.4 Corregir el recorte del final de las pantallas del área privada: `mat-sidenav-content` usaba `content-box` y medía 2 × el relleno más de lo que cabía en la ventana; ahora `box-sizing: border-box`; verificar con `shell.component.spec.ts` y midiendo en Chrome real que la última tarjeta queda entera con su margen

## 5. Riel, búsqueda, tipografía y Inicio como en el diseño

- [x] 5.1 Manrope en `index.html` y `typography` de `mat.theme` en `styles.scss`; titulares, cifras y nombres de jornada en Manrope; verificar con `home.component.spec.ts` (familia y peso) y en Chrome real
- [x] 5.2 `NavRailComponent` (riel de iconos con la marca, nombres cortos con nombre accesible completo, «Flota» con menú, entrada activa con barra de la marca y `aria-current`) y `BrandComponent` con tamaño `mark`; verificar con `nav-rail.component.spec.ts` y `brand.component.spec.ts`
- [x] 5.3 `GlobalSearchComponent` (píldora de 44px, Ctrl K, grupos «Ir a» y «Acciones», filtro sin tildes, «Sin resultados», panel con el ancho de la píldora) y `quickActionsFor` en `nav-items.ts`; verificar con `global-search.component.spec.ts` y `nav-items.spec.ts`
- [x] 5.4 `ShellComponent` con riel y barra (título, búsqueda, tema, avatar con degradado) en pantallas anchas y menú desplegable en las estrechas, con la marca reducida al emblema bajo 480px; verificar con `shell.component.spec.ts` y `app.routes.spec.ts`
- [x] 5.5 `CityMapComponent` y cabecera de Inicio con fecha, saludo según la hora, resumen con datos reales, acciones en fila y leyenda del anillo; sin mosaicos de áreas; verificar con `city-map.component.spec.ts`, `home.component.spec.ts` y `progress-ring.component.spec.ts`
- [x] 5.6 Anchura mínima de la tarjeta de acceso (`min-width: 0`) para que en 320px no desborde; verificar con `access-layout.component.spec.ts` y en Chrome real

## 6. Verificación

- [x] 6.1 `npm --prefix ng-ruteando run test:ci`, `npm --prefix ng-ruteando run build` sin avisos de presupuesto, `npm run test:server`, `openspec validate redesign-access-and-home --strict` y `openspec validate --specs --strict` (las cifras exactas están en el resumen de la rama)
- [x] 6.2 Banco de pruebas en Chrome real (gateway simulado con los fixtures del repo): capturas y auditoría de contraste, desbordes, tipografía y objetivos táctiles de iniciar sesión, crear cuenta, recuperar y restablecer a 360, 768, 1024, 1366 y 1920 px en claro y oscuro; estados de error de credenciales, requisitos de contraseña, correo enviado, enlace no válido y formularios vacíos; Inicio como administrador, agente y conductor; estructura del diseño dividido, 320 px, móvil horizontal, colores forzados, más contraste, movimiento reducido y recorrido con teclado; selector de tema segmentado (cambio, recarga, sin destello, seguir al sistema en vivo, barra del shell, persistencia al navegar y CSP estricta); riel, búsqueda (Ctrl K, filtro, Enter y flechas, panel del ancho de la píldora), menú de Flota y menú desplegable con la CSP en `enforce` sin violaciones; las diez áreas de la aplicación dentro del shell nuevo (título de la barra y entrada activa del riel); Inicio y acceso en 16 anchos de 320 a 2560px, incluidos ambos lados de cada punto de corte (479/480, 719/720, 959/960, 1023/1024 y 1099/1100), sin desbordes ni fallos de contraste
- [ ] 6.3 Sin verificar: Safari, y Firefox salvo el inicio de sesión (se vio en claro y oscuro a 1366 y 360 px con Firefox sin interfaz: rejilla, degradado, `light-dark()` y Manrope bien; el Inicio y el resto exigen sesión y no se vieron), un lector de pantalla real (NVDA, VoiceOver o TalkBack: se comprobó el árbol y los atributos, no el audio), un teléfono físico con teclado en pantalla, y el Inicio contra el gateway real (las cifras de paquetes dependen de que `GET /packages?page=0&size=100` responda como los fixtures; los totales de las jornadas llegan nulos en ellos)
