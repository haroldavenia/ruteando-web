# Tasks

## 1. Preparación y línea base

- [x] 1.1 Archivar el change `adopt-angular-material-ng-ruteando` sincronizando sus specs, y verificar con `openspec list --specs` que aparecen `frontend-app-shell` y `ui-material-theme`
- [x] 1.2 Crear la rama `chore/upgrade-angular-21` y verificar con `git branch --show-current`
- [x] 1.3 Comprobar con `npm view @angular/cli@18 engines`, `@19`, `@20` y `@21` los rangos de Node de cada salto, elegir la versión de Node de trabajo para los saltos (candidata: 22 LTS), activarla y verificar con `node -v`
- [x] 1.4 En `ng-ruteando/`, ejecutar `npm ci` y `npx ng build` sobre 17.3 con esa versión de Node y anotar tamaños del bundle inicial como referencia; verificar código 0 (referencia 17.3: bundle inicial 456,76 kB brutos / 108,35 kB transferidos, 1 ruta prerenderizada, build con código 0)

## 2. Red de seguridad: pruebas sobre 17.3

- [x] 2.1 Añadir `karma.conf.js` con lanzador `ChromeHeadless` sin sandbox para CI y declararlo en el target `test` de `angular.json`; verificar que `npx ng test --watch=false --browsers=ChromeHeadless` arranca
- [x] 2.2 Añadir el script `test:ci` en `package.json` (una ejecución, sin watch, headless) y verificar que termina con código 0 y con código distinto de 0 si se rompe a propósito una aserción
- [x] 2.3 Escribir `app.component.spec.ts`, `home.component.spec.ts` y `shell.component.spec.ts` (crea el componente; `home` muestra el título; `shell` renderiza el enlace "Inicio" y alterna el modo del menú según el ancho) y verificar `npm run test:ci` en verde
- [x] 2.4 Documentar en `ng-ruteando/README.md` cómo ejecutar `build`, `test:ci` y el servidor SSR, y verificar que cada comando documentado funciona tal como está escrito

## 3. Salto a Angular 18

- [x] 3.1 Ejecutar `npx ng update @angular/core@18 @angular/cli@18` y `npx ng update @angular/material@18`, aceptar las migraciones y revisar el diff completo
- [x] 3.2 Verificar `npx ng build`, `npm run test:ci` y el arranque SSR con `curl http://localhost:4000/` (el HTML contiene el texto de la página de inicio)
- [x] 3.3 Commit del salto con las versiones resultantes, las advertencias nuevas y los tamaños del bundle inicial

## 4. Salto a Angular 19

- [x] 4.1 Ejecutar `ng update` de core/cli y de material a 19, aceptar las migraciones (incluida la de `standalone` por defecto) y revisar el diff
- [x] 4.2 Adaptar el SSR si la versión lo exige (`server.ts`, `app.config.server.ts`, `angular.json`) conservando `/` renderizado y el comodín que redirige a `/`; verificar con `curl /` y con una ruta inexistente
- [x] 4.3 Verificar `ng build`, `npm run test:ci` y la consola del navegador sin errores de hidratación, y hacer commit del salto

## 5. Salto a Angular 20

- [x] 5.1 Ejecutar `ng update` de core/cli y de material a 20, aceptar las migraciones y revisar el diff
- [x] 5.2 Completar la migración del SSR a la API de servidor vigente (motor de petición, rutas de servidor y modo de salida) y verificar con `curl /`
- [x] 5.3 Registrar los avisos de obsolescencia que emita el build (por ejemplo animaciones) en este fichero sin migrarlos; verificar `ng build`, `npm run test:ci` y hacer commit del salto (resultado en 20.3: el build no emitió avisos de obsolescencia; `CommonEngine` sigue vigente y sin marcar como obsoleto, por lo que se mantiene con `allowedHosts`)

## 6. Salto a Angular 21

- [x] 6.1 Ejecutar `ng update` de core/cli y de material a 21, aceptar las migraciones y revisar el diff (nota: `npm install` con npm 10.9 falló con `Cannot read properties of null (reading 'edgesOut')`, un fallo interno del resolutor; se resolvió con npm 11, lockfile regenerado, y las migraciones se ejecutaron después con `ng update <paquete> --migrate-only --from --to`; la migración de arranque añadió `provideZoneChangeDetection()`, que se dejó en `app.config.ts`)
- [x] 6.2 Verificar con `npm ls @angular/core @angular/common @angular/router @angular/platform-browser @angular/ssr @angular/cdk @angular/material` que todo resuelve a 21.x sin `ERESOLVE`, `invalid` ni `missing`, y que solo hay una versión de `@angular/core`
- [x] 6.3 Verificar que `npm ls ol jspdf @faker-js/faker` no reporta conflictos de peer dependencies; si los hay, actualizar la dependencia afectada sin importarla
- [x] 6.4 Verificar `ng build` (budgets respetados), `npm run test:ci`, SSR con `curl /` y consola del navegador sin errores; hacer commit del salto

## 7. Tema Material 3

- [x] 7.1 Sustituir la definición M2 de `src/styles.scss` por la API de tema M3 vigente, con un único `@include`, paleta predefinida cercana al índigo/rosa actual y tipografía Roboto; verificar que `ng build` pasa sin avisos de obsolescencia del tema
- [x] 7.2 Verificar con `grep -rn "define-light-theme\|define-palette" src` que no queda ninguna función M2 y que ningún `*.scss` de componente repite el tema
- [x] 7.3 Comprobar manualmente a 1200px y a 600px que el shell (barra, menú, elemento activo, botón de menú) conserva estructura y que el contraste del texto es al menos 4.5:1 con las herramientas del navegador (comprobado con capturas de Chrome sin interfaz y contrastes calculados a partir de los tokens compilados: barra 6,46:1, texto 16,33:1, menú 8,93:1, elemento activo 7,27:1; la barra conserva el color primario mediante `toolbar-overrides` porque en M3 `color="primary"` ya no tiñe el toolbar)
- [x] 7.4 Añadir a `shell.component.spec.ts` una comprobación de que el elemento de menú activo recibe la clase de activo, y verificar `npm run test:ci` en verde

## 8. Versiones soportadas y cierre

- [ ] 8.1 Comprobar con `npm view @angular/core@21 engines` el rango de Node soportado y declararlo en `engines` de `ng-ruteando/package.json` y en `.nvmrc`; verificar con una versión fuera de rango que `npm install` avisa de la incompatibilidad
- [ ] 8.2 Ejecutar `npm ci`, `npx ng build`, `npm run test:ci` y el servidor SSR con la versión mínima y con la más reciente del rango, sin avisos de "Unsupported" del CLI
- [ ] 8.3 Actualizar las referencias a Angular 17 de `ng-ruteando` en `CLAUDE.md` y en `.claude/skills/angular-ruteando/` (versión, comandos, tema M3, Node) y verificar con `grep -rn "17\.3" CLAUDE.md .claude/skills/angular-ruteando` que no quedan referencias obsoletas para `ng-ruteando`
- [ ] 8.4 Ejecutar `openspec validate upgrade-angular-21-ng-ruteando` y verificar que no reporta errores

## Workflow follow-up

- Revisar el diff completo de la rama y fusionar tras la revisión del equipo.
- Archivar el change cuando la rama esté fusionada y verificar que `openspec/specs/frontend-platform` existe.
