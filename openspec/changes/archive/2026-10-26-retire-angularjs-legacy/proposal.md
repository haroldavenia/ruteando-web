# Proposal

## Why

Con el seguimiento de visitas, `ng-ruteando` cubre todo el flujo operativo de negocio del AngularJS; lo que queda en el legacy es el login de demostración, gráficos de datos de ejemplo y pantallas sin contrato en el gateway. Mantener `master/` (4,6 MB), `externModules/` (24 MB), `json/`, el `index.html` de la raíz (con una clave de Google Maps incrustada) y el backend de ejemplo de Satellizer (OAuth y MongoDB con secretos por defecto en `server/config.js`) confunde, amplía la superficie de seguridad y obliga a documentar dos mundos. La home sigue siendo un texto de relleno. Ahora toca cerrar la migración.

## What Changes

- **Verificación contra el gateway real** antes de borrar nada: login, abrir una ruta con visitas, cambiar un estado y confirmar que las paradas traen `packageId` (el riesgo abierto del change anterior). Se anota el resultado en `gateway-api.md`.
- **Home útil** en `/`: accesos a las áreas que el rol puede abrir y, para administradores y agentes, las últimas jornadas. La definición del menú se comparte entre el shell y la home.
- **BREAKING** Se retira la aplicación AngularJS: `master/`, `index.html` de la raíz, `externModules/`, `json/` y `build/config.gypi`.
- **BREAKING** El servidor deja de ofrecer el backend de ejemplo: se eliminan `/api/*` (cuenta, perfil), `/auth/*` (login, registro y OAuth), el modelo de Mongoose, `server/config.js`, `services/`, los datos de ejemplo (`path/`, `response/`, `partials/`, `fakejourny.json`, `partial.json`, `sidebar-menu*.json`) y `server/package*.json`. Queda: `/gateway`, el estático de `ng-ruteando` y el comodín del cliente, y las rutas `/api/*` y `/auth/*` responden 404 JSON.
- Se limpia el `package.json` de la raíz (nombre, scripts de karma y protractor, dependencias que ya nadie usa, `MONGO_URI`), el `.gitignore` (reglas de `master/`, `app` y `vendor`, y la excepción `!ng-ruteando/src/app/`) y los README.
- Se reescriben `CLAUDE.md` y la skill `angular-ruteando` sin los apartados del legacy, y se corrigen sus afirmaciones desactualizadas (el refresco de sesión ya existe).
- Fuera de alcance: servicios asignados, exportar a PDF, gráficos y geocodificación (sin contrato o sin datos reales); el historial de git conserva todo lo borrado.

## Capabilities

### New Capabilities
- `home-dashboard`: la página de inicio muestra los accesos del rol y las últimas jornadas.

### Modified Capabilities
- `frontend-serving`: desaparecen las rutas propias de API y autenticación del servidor, y el repositorio ya no contiene la aplicación anterior.
- `gateway-proxy`: `/gateway/**` es la única ruta de API que atiende el servidor.
- `frontend-app-shell`: el `.gitignore` ya no necesita ignorar `app/` ni excepciones para `ng-ruteando/src/app/`.

## Impact

- Borrado: `master/`, `externModules/`, `json/`, `index.html`, `build/`, `README.txt` y casi todo `server/` salvo `server.js` (reducido), `gateway-proxy.js` y `test/`.
- `ng-ruteando/src/app/home/`, `layout/shell.component.ts` (el menú pasa a `layout/nav-items.ts`).
- Pruebas del servidor (`server/test/*.test.js`) que cubren `/api/me`, `/auth/*` y `/api/account`: se sustituyen por pruebas del 404.
- `package.json` y `package-lock.json` de la raíz; desinstalar dependencias retira `mongoose`, `jwt-simple`, `bcryptjs`, `request`, `multer`, `faker`, `karma*`, etc.
- Documentación: `CLAUDE.md`, `README.md`, `.claude/skills/angular-ruteando/` (incluida la referencia de migración AngularJS, que pasa a histórica o se borra).
- Quien ejecute `npm start` ya no necesita MongoDB.
