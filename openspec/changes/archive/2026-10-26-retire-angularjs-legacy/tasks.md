# Tasks

## 1. Verificación contra el gateway real (puerta previa a cualquier borrado)

- [ ] 1.1 Con `npm start` y el `.env` local, iniciar sesión con el usuario de prueba que facilite quien revisa, abrir una jornada planificada con rutas, comprobar si las paradas de servicio traen `packageId`, mirar las visitas de una ruta y cambiar el estado de un paquete de prueba; anotar el resultado (y las diferencias de contrato) en una sección «Verificado contra el gateway real» de `.claude/skills/angular-ruteando/references/gateway-api.md` con la fecha. Si las visitas salen vacías, parar y proponer otro change antes de seguir con el grupo 3
- [ ] 1.2 Pedir `GET /gateway/journeys` con sesión y comprobar el orden por defecto y si `sort=createdAt,desc` lo cambia; anotar la conclusión en `gateway-api.md` (decide cómo se piden las últimas jornadas en 2.3)

## 2. Home útil

- [x] 2.1 Extraer `NAV_ITEMS` a `layout/nav-items.ts` con una función pura `navItemsFor(role)` y hacer que `ShellComponent` la use; verificar con `nav-items.spec.ts` (un caso por rol, incluido `driver` y sin rol) y que `shell.component.spec.ts` pasa sin cambios
- [x] 2.2 Convertir `HomeComponent` en la página de accesos (`h1` «Ruteando», sección `h2` «Áreas» con las entradas del menú sin «Inicio» y con los hijos de Flota aplanados, y el mensaje para el rol sin áreas); verificar con `home.component.spec.ts` (administración, agente, `driver`, mismos nombres que el menú, un solo `h1`) y con `app.routes.spec.ts` (la home dentro del shell para cada rol)
- [ ] 2.3 Añadir «Últimas jornadas» (cinco, con nombre, estado en español, fecha local y enlace al detalle, «Ver todas las jornadas», estados de carga, vacío con enlace a planificar y error con «Reintentar», sin petición para roles sin acceso ni en el servidor) según lo decidido en 1.2; verificar con el spec de la home (cada estado, que los accesos aparecen mientras carga, que `driver` no pide nada) y documentar el orden usado en `gateway-api.md`

## 3. Retirar la aplicación AngularJS

- [x] 3.1 Borrar `master/`, el `index.html` de la raíz y `build/` con `git rm -r`; verificar que `grep -rIn "master/js\|master/jade\|data-ng-app" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec .` no devuelve nada fuera de la documentación que se reescribe en el grupo 6, y que `npm run build:web` sigue compilando

## 4. Retirar librerías de terceros y datos de ejemplo

- [x] 4.1 Borrar `externModules/` y `json/` con `git rm -r`; verificar con `grep -rIn "externModules\|json/" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec --exclude=CLAUDE.md .` que no queda ninguna referencia en código, scripts ni configuración (en particular `scripts/extract-gateway-fixtures.mjs`), y que `npm run test:ci` en `ng-ruteando/` pasa

## 5. Servidor mínimo

- [x] 5.1 Reescribir `server/server.js` con solo `.env`, `morgan`, `/gateway`, el estático con `redirect: false`, el 404 JSON de `/api` y `/auth` y el comodín del cliente con el 503 por falta de compilación; borrar `server/config.js`, `services/`, `path/`, `response/`, `partials/`, `fakejourny.json`, `partial.json`, `sidebar-menu*.json` y `server/package*.json`; verificar que `npm start` arranca sin MongoDB y sin `MONGO_URI`, que el registro no menciona Mongo, que `GET /api/me` responde 404 JSON y que `grep -rn "mongoose\|jwt-simple\|bcryptjs\|satellizer" -i server` no devuelve nada
- [x] 5.2 Actualizar las pruebas del servidor: quitar `MONGO_URI` de `server/test/helpers.js`, sustituir las pruebas de `/api/me`, `/api/account`, `/auth/unlink` y `/auth/login` por pruebas del 404 JSON de `/api/*` y `/auth/*` (con `Accept: text/html` también) y de que el servidor arranca sin Mongo, y ajustar la prueba de rutas propias del proxy; verificar con `npm run test:server`

## 6. Configuración y documentación

- [x] 6.1 Limpiar el `package.json` de la raíz (nombre `ruteando-web`, descripción, quitar `prestart`, `pretest`, `test`, `test-single-run`, `update-webdriver`, `protractor` y las dependencias que el servidor ya no use, dejando las que `server.js` y `gateway-proxy.js` importan) con `npm uninstall` y regenerar `package-lock.json`; verificar con `grep -n "require(" server/*.js` contra `npm ls --depth=0`, y que `npm run build:web`, `npm run test:server` y `npm start` funcionan tras `rm -rf node_modules && npm ci`
- [x] 6.2 Limpiar `.gitignore` (quitar `master/node_modules`, `master/bower_components`, `app`, `!ng-ruteando/src/app/` y `vendor`); verificar con `git check-ignore -v ng-ruteando/src/app/app.config.ts` (sin salida), `git status --short` sin ficheros que antes se ignoraban y con `grep -n "app\|vendor\|master" .gitignore` vacío
- [x] 6.3 Reescribir `README.md` (qué es, requisitos, `npm ci`, `.env`, `npm run build:web`, `npm start`, pruebas) y borrar `README.txt`; verificar que cada comando del README se ejecuta tal cual
- [x] 6.4 Reescribir `CLAUDE.md` y `.claude/skills/angular-ruteando/` sin los apartados del legacy ni la mención de que el refresco de sesión no existe, borrar `references/migracion-angularjs.md`, y en `gateway-api.md` dejar el «Mapeo legacy → gateway» como registro histórico con el hash del último commit que contiene `master/`; verificar con `grep -rIn "master/\|Satellizer\|externModules\|MONGO_URI\|bower\|gulp" CLAUDE.md .claude` que solo queda la nota histórica y que las rutas y comandos citados existen
- [x] 6.5 Actualizar el `Purpose` de `openspec/specs/frontend-serving/spec.md` directamente (el delta no lo cambia: quitar «y que las rutas de API del propio servidor sigan accesibles»); verificar con `openspec validate --specs --strict`
- [ ] 6.6 Comprobación integral: `npm run test:ci` en `ng-ruteando/`, `npm run test:server`, `npm run build:web`, `npm start` con `curl` a `/`, `/acceso`, `/api/me` (404 JSON) y `/gateway/places` (según haya o no `.env`), y una búsqueda de claves o secretos incrustados (`grep -rIn "AIza\|SECRET" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=openspec --exclude-dir=dist .` sin resultados reales); anotar el resultado en el mensaje del último commit

## Workflow follow-up

- Archivar el change con `/opsx:archive` tras la revisión.
