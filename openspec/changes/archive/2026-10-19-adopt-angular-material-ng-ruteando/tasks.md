# Tasks

## 1. Repositorio y dependencias

- [x] 1.1 Añadir `!ng-ruteando/src/app/` al `.gitignore` y verificar con `git check-ignore -v ng-ruteando/src/app/x.ts` (sin salida) y que `ruteando-ng/src/app/` sigue sin ignorarse
- [x] 1.2 En `ng-ruteando/`, ejecutar `npm install` y verificar que `node_modules` se crea sin errores
- [x] 1.3 Desinstalar `bootstrap` y `@popperjs/core` de `ng-ruteando` y verificar que no aparecen en `package.json` ni `package-lock.json`
- [x] 1.4 Desinstalar `@ng-bootstrap/ng-bootstrap` del `package.json` raíz (actualizar `package-lock.json`) y verificar con `grep -r ng-bootstrap package.json package-lock.json`
- [x] 1.5 Instalar `@angular/material@17.3` y `@angular/cdk@17.3` en `ng-ruteando` y verificar con `npm ls @angular/material @angular/cdk @angular/core` que coinciden en 17.3

## 2. Esqueleto de la aplicación (frontend-app-shell)

- [x] 2.1 Crear `src/app/app.config.ts` con `provideRouter`, `provideClientHydration`, `provideHttpClient(withFetch())` y `provideAnimationsAsync()`; verificar que `ng build` no reporta el import faltante
- [x] 2.2 Crear `src/app/app.config.server.ts` con `mergeApplicationConfig` y `provideServerRendering()`, y comprobar que `src/main.server.ts` resuelve sus imports
- [x] 2.3 Crear `src/app/app.routes.ts` con ruta `''` (`loadComponent` a `HomeComponent`) y comodín `**` que redirige a `''`; verificar en `ng serve` que una ruta desconocida vuelve a `/`
- [x] 2.4 Crear `src/app/app.component.ts` standalone (selector `app-root`, `OnPush`) que renderice el layout, y `src/app/home/home.component.ts` con el título de la aplicación; verificar que `/` lo muestra sin errores en consola
- [x] 2.5 Ejecutar `npx ng build` y verificar código 0, salida en `dist/ng-ruteando/{browser,server}` y budgets respetados
- [x] 2.6 Ejecutar `npm run serve:ssr:ng-ruteando`, pedir `curl http://localhost:4000/` y verificar que el HTML contiene el texto de la página de inicio

## 3. Tema y layout Material (ui-material-theme)

- [x] 3.1 Configurar en `src/styles.scss` el tema M2 (`mat.core()`, paletas primaria/acento, tipografía, mixins por componente usados) y verificar que `ng build` pasa y un `mat-raised-button` de prueba usa el color del tema
- [x] 3.2 Añadir en `src/index.html` los `<link>` de Roboto y Material Icons (la fuente por defecto de `mat-icon`) y `lang="es"`; verificar que los iconos se ven y no hay avisos de recursos bloqueados
- [x] 3.3 Crear `src/app/layout/shell.component.ts` (`MatToolbar`, `MatSidenavContainer`, `MatNavList`, `MatIcon`, `MatIconButton`) con modo `side`/`over` según `BreakpointObserver` a 960px vía `toSignal`; verificar manualmente a 1200px (fijo) y 600px (oculto con botón)
- [x] 3.4 Añadir etiquetas ARIA en español y enlaces de menú con `routerLinkActive`; verificar navegación con Tab/Enter y que el elemento activo queda marcado
- [x] 3.5 Confirmar que ningún componente repite el tema y que el estilo de cada componente es menor de 2kb (`ng build` sin avisos de budget)

## 4. Verificación integral y documentación

- [x] 4.1 Ejecutar `npx ng build`, `npm run serve:ssr:ng-ruteando` y `ng serve`, y comprobar el flujo completo (home, ruta desconocida, responsive) sin errores en consola ni en servidor
- [x] 4.2 Grep de `bootstrap` en `ng-ruteando/src`, `ng-ruteando/package.json` y `package.json` raíz (sin resultados salvo el verbo "bootstrap" de Angular) y revisión de `npm ls` sin conflictos de peer dependencies
- [x] 4.3 Actualizar `CLAUDE.md` (sección `ng-ruteando/`: ya no es solo scaffolding, usa Angular Material) y el skill `angular-ruteando` si algún dato cambió; verificar que ambos describen el estado real

## Workflow follow-up

- Archivar el change tras cumplir la revisión del proyecto.
- Verificar que las specs principales `frontend-app-shell` y `ui-material-theme` aparecen en `openspec list --specs`.
