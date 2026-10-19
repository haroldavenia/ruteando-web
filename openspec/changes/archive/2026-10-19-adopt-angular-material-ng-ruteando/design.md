# Design

## Context

`ng-ruteando` es Angular `^17.3` standalone con builder `application`, `prerender: true`, SSR (`server.ts`, `@angular/ssr`), `strictTemplates`, SCSS y budgets de 500kb/1mb (initial) y 2kb/4kb (por componente). Hoy tiene `main.ts` y `main.server.ts` que importan ficheros inexistentes bajo `src/app/`. El `.gitignore` ignora `app` salvo `ruteando-ng/src/app/`. Ver `proposal.md` para la motivación y el skill `angular-ruteando` para las convenciones.

## Goals / Non-Goals

**Goals:**
- Proyecto que compila, sirve en navegador y con SSR.
- Tema Material global y layout base listo para añadir features.

**Non-Goals:**
- `ruteando-ng` (17.0), M3, salto a Angular 19, auth, mapas, PDF, features de negocio, i18n.

## Decisions

1. **Material 17.3.x con tema M2.** En 17.x M3 es experimental; M2 es el camino estable. Alternativa descartada: M3 experimental (API inestable). Al subir a 19 se migra el tema (documentado en el skill).
2. **Tema en `styles.scss` con mixins por componente** (`mat.core()`, `mat.button-theme`, `mat.toolbar-theme`, `mat.sidenav-theme`, `mat.list-theme`, `mat.icon-theme`, etc.) en vez de `all-component-themes`, para controlar el peso. Alternativa: `all-component-themes` (más simple, más CSS). Si crece el uso, se revisa.
3. **Animaciones con `provideAnimationsAsync()`** en `app.config.ts`: carga diferida y SSR-compatible. Alternativa `provideAnimations()` penaliza el bundle inicial.
4. **Fuentes e iconos por `<link>` en `index.html`** (Roboto y Material Icons desde Google Fonts; es la fuente que `mat-icon` usa por defecto, Material Symbols exigiría configurar un font set). Alternativa: autohospedar; se difiere por simplicidad, con la nota de que pasa por terceros.
5. **Layout como componente standalone** `app-shell` con `MatToolbar` + `MatSidenavContainer` + `MatNavList`; el modo (`side`/`over`) lo decide `BreakpointObserver` del CDK con umbral 960px. Se usa `toSignal` sobre el observable de breakpoints. Alternativa: media queries CSS puras (no controla `mode` del sidenav).
6. **Rutas y estructura:** `app.routes.ts` con ruta `''` a `HomeComponent` (`loadComponent`) y comodín que redirige a `''`. Estructura `src/app/{core,layout,features}`; solo `layout` y `home` en este change.
7. **`app.config.ts`:** `provideRouter(routes)`, `provideClientHydration()`, `provideHttpClient(withFetch())`, `provideAnimationsAsync()`. `app.config.server.ts` fusiona con `provideServerRendering()` mediante `mergeApplicationConfig`.
8. **`.gitignore`:** añadir `!ng-ruteando/src/app/` junto a la regla existente de `ruteando-ng`. Verificar con `git check-ignore -v`.
9. **Dependencias:** `npm uninstall bootstrap @popperjs/core` en `ng-ruteando`; `npm uninstall @ng-bootstrap/ng-bootstrap` en la raíz; `ng add @angular/material@17.3` (o `npm i` con versión fijada) en `ng-ruteando`, actualizando `package-lock.json` de cada uno. No tocar `@angular/*`.
10. **Español:** etiquetas ARIA y textos del layout en español.

## Risks / Trade-offs

- [Budget `anyComponentStyle` 2kb] → tema global solo en `styles.scss`; estilos de componente mínimos.
- [`ng add` modifica `angular.json`, `index.html` y `styles.scss`] → revisar el diff y quedarse con lo necesario.
- [Prerender con `prerender: true`] → solo la ruta `/` es estática; sin datos privados en este change.
- [SSR y APIs del navegador] → el layout no usa `window`; `BreakpointObserver` es seguro en servidor (devuelve estado por defecto).
- [Fuentes de Google] → dependencia de tercero y privacidad; aceptable ahora, revisable.
- [Migración posterior a 19] → tema M2 requiere reescritura de SCSS; coste conocido y acotado.
- [`strictTemplates` + Material] → tipar correctamente los imports de cada módulo.

## Migration Plan

1. Rama dedicada; pasos en orden de `tasks.md`.
2. Verificar `ng build` y SSR antes de quitar nada más.
3. Rollback: revertir el commit; no hay datos ni backend implicados.

## Open Questions

- ¿Se autohospedan las fuentes más adelante? No cambia specs ni tareas.
