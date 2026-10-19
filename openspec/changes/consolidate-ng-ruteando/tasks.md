# Tasks

## 1. Preparación

- [x] 1.1 Confirmar que `upgrade-angular-21-ng-ruteando` está terminado (`npm ls @angular/core` en `ng-ruteando/` muestra 21.x) y que `adopt-angular-material-ng-ruteando` está archivado (`openspec list --specs` incluye `frontend-app-shell`)
- [x] 1.2 Crear la rama `chore/consolidate-ng-ruteando` y verificar con `git branch --show-current`
- [x] 1.3 Ejecutar `npx ng build` en `ng-ruteando/`, listar `dist/ng-ruteando/browser` y anotar el fichero de entrada de cliente (`index.csr.html` o `index.html`) y si `index.html` contiene ya el HTML prerenderizado de `/`; verificar que el nombre queda registrado en este fichero (resultado en Angular 21.2: el fichero de entrada de cliente es `index.csr.html` con `<app-root>` vacío; `index.html` es la página prerenderizada de `/`, con el texto de inicio ya incluido; el servidor debe usar `index.csr.html` como respuesta de las rutas del cliente)

## 2. Entornos y proxy (frontend-environments)

- [x] 2.1 Generar los ficheros de entorno con `npx ng generate environments`, definir `apiUrl` en cada uno (desarrollo: ruta del proxy `/hanoit/api/v1`) y verificar con `ng build --configuration development` y `ng build` que cada compilación contiene su valor (`grep` en la salida)
- [x] 2.2 Crear `ng-ruteando/proxy.conf.json` con destino por defecto `http://hanoit:9000`, `changeOrigin` y `secure: false`, y enlazarlo en el target `serve` de `angular.json`; verificar que `ng serve` arranca y que una petición a `/hanoit/...` se reenvía (el log del proxy muestra el destino)
- [x] 2.3 Verificar que no hay URLs ni credenciales literales con `grep -rnE "https?://" ng-ruteando/src/app --include=*.ts` y `grep -rniE "secret|Basic |client_secret" ng-ruteando/src`, sin coincidencias de API o credenciales
- [x] 2.4 Documentar en `ng-ruteando/README.md` los entornos y cómo cambiar el destino del proxy, y verificar que el procedimiento documentado funciona cambiando el destino y reiniciando

## 3. Servicio de tokens (auth-token-storage)

- [x] 3.1 Crear `ng-ruteando/src/app/core/auth/token-storage.service.ts` con token de acceso en memoria, refresco y caducidad en `localStorage` (claves `hanoitToken` y `hanoitTokenExpiresDate`), caducidad `Date.now() + expires_in * 1000` en ISO, lectura tolerante al formato de fecha de AngularJS, `reset` y `expiresAt`, sin `setTimeout`; verificar que compila con `ng build`
- [x] 3.2 Hacer el servicio seguro en SSR con `PLATFORM_ID`: en servidor lecturas vacías o nulas y escritura sin efecto; verificar con una prueba que inyecta `PLATFORM_ID: 'server'` y no lanza excepciones
- [x] 3.3 Escribir `token-storage.service.spec.ts` que cubra: acceso solo en memoria y ausente de `localStorage`/`sessionStorage`; caducidad de 3600 s guardada a las 10:00:30 resulta 11:00:30 (con reloj simulado); token vigente, caducado (devuelve `null` y limpia); sesión previa con fecha en formato `Date.toString()`; fecha ilegible tratada como caducada; `reset`; verificar `npm run test:ci` en verde
- [x] 3.4 Comprobar el render SSR con el servicio inyectado en un componente de prueba o en `AppComponent`: `ng build` y `curl` al servidor SSR sin errores en el log, y retirar el uso temporal tras la prueba

## 4. Servidor (frontend-serving)

- [x] 4.1 En `server/server.js`, añadir la constante de ruta del build (`WEB_DIST` con valor por defecto `ng-ruteando/dist/ng-ruteando/browser`) y servir ese directorio como estático; verificar con `curl -I /` y con un `.js` compilado
- [x] 4.2 Mover el registro de las rutas `/api/*` y `/auth/*` antes del estático y del comodín, y limitar el comodín a `GET` con `Accept: text/html` y sin extensión de fichero; verificar `curl /api/me` (401 JSON), `curl /rutas/listado -H 'Accept: text/html'` (200 HTML), `curl /inexistente.js` (404)
- [x] 4.3 Añadir la comprobación de arranque de la compilación ausente: log con `npm run build:web` y respuesta 503 en rutas del cliente; verificar arrancando con `WEB_DIST` apuntando a un directorio vacío
- [x] 4.4 Añadir el script `build:web` a `package.json` raíz y el script `test:server`; verificar que `npm run build:web` genera el build y termina con código 0
- [x] 4.5 Escribir `server/test/serving.test.js` con `node:test` que arranque el servidor con `PORT` libre y un `WEB_DIST` temporal con un `index.html` de ejemplo, y cubra `/`, ruta profunda, `/inexistente.js`, `GET /api/me`, `POST /auth/login` (llega al manejador) y el 503 con directorio vacío; verificar `npm run test:server` en verde sin MongoDB accesible

## 5. Eliminar `ruteando-ng` y documentación (frontend-app-shell)

- [x] 5.1 Confirmar con `git diff --stat` y revisión manual que nada de `ruteando-ng/` queda sin portar (home trivial, tokens portados, entornos sin valores útiles)
- [x] 5.2 Ejecutar `git rm -r ruteando-ng` y quitar `!ruteando-ng/src/app/` de `.gitignore`; verificar con `git check-ignore -v app/x.js` (ignorado) y `git check-ignore -v ng-ruteando/src/app/x.ts` (no ignorado)
- [x] 5.3 Eliminar las referencias a `ruteando-ng` en `CLAUDE.md` (tabla, comandos, arquitectura, notas) y describir el flujo `npm run build:web` + `npm start`, `WEB_DIST`, el proxy y los entornos; verificar con `grep -n "ruteando-ng" CLAUDE.md` que no queda ninguna referencia
- [x] 5.4 Actualizar `.claude/skills/angular-ruteando/` (`SKILL.md`, `references/*`), borrar `references/angular-17-ngmodule.md` y las menciones al proyecto antiguo; verificar con `grep -rn "ruteando-ng" .claude/skills/angular-ruteando` que no quedan

## 6. Verificación integral

- [ ] 6.1 Con una instalación limpia (`npm ci` en `ng-ruteando/` y en la raíz), ejecutar `npm run build:web`, `npm run test:server`, `npm run test:ci` en `ng-ruteando/` y `npm start`; comprobar `/`, una ruta profunda, `/api/me` y `/inexistente.js`, y que la aplicación abre en el navegador sin errores de consola
- [ ] 6.2 Ejecutar `grep -rIl "ruteando-ng" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist` y verificar que solo quedan menciones en `openspec/changes/archive` y en este change
- [ ] 6.3 Ejecutar `openspec validate consolidate-ng-ruteando` y verificar que no reporta errores

## Workflow follow-up

- Revisar el diff completo y fusionar tras la revisión del equipo; avisar de que cualquier despliegue que apunte a `ruteando-ng/dist` debe cambiarse (o usar `WEB_DIST` temporalmente).
- Archivar el change tras fusionar y verificar que existen `openspec/specs/frontend-serving`, `frontend-environments` y `auth-token-storage`.
