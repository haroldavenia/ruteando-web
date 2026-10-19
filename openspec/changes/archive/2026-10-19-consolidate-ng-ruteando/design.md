# Design

## Context

`server/server.js` (Express + Mongoose, basado en el ejemplo Satellizer) registra, en este orden: `cors`, `morgan`, parsers, redirección HTTPS en producción, `express.static('ruteando-ng/dist/ruteando-ng')`, un `app.get('*')` que devuelve `index.html`, y **después** las rutas `/api/*` y `/auth/*`. Como el comodín va antes, los `GET` de API (`/api/me`, `/auth/unlink/:provider`) nunca llegan a su manejador. Los `POST` sí, porque el comodín solo es `GET`.

`ng-ruteando` (Angular 21 tras `upgrade-angular-21-ng-ruteando`) compila a `dist/ng-ruteando/browser` y `dist/ng-ruteando/server`, con `prerender` de `/` y un servidor SSR propio (`server.ts`). `ruteando-ng` es NgModule 17.0 con `TokenStorageService` (token de acceso en memoria, refresco en `localStorage`, caducidad mal calculada con `setSeconds`, refresco como `TODO`). El legacy AngularJS guarda las mismas claves (`hanoitToken`, `hanoitTokenExpiresDate`) y habla con HanoitApi (`hanoit:9000/hanoit/api/v1`, OAuth2 `/oauth/token`), no con el Express de `server/`. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**
- Un único frontend Angular publicado por el servidor del repositorio.
- URL de API por entorno, proxy de desarrollo y servicio de tokens listo para que la fase de auth se apoye en él.

**Non-Goals:**
- Que SSR se use en producción. Se compila y funciona (`serve:ssr`), pero el servidor del repositorio publica la versión de navegador.
- Contrato de auth, interceptores, guards, pantallas de login, refresco automático (fase `core-http-auth`).
- Cambiar la lógica de auth Satellizer, Mongo o secretos de `server/config.js`.
- Migrar o borrar `master/`, `app/` y `index.html` de la raíz (fase final de la migración).

## Decisions

1. **El servidor publica `ng-ruteando/dist/ng-ruteando/browser` en modo SPA.** `server.js` usa una constante de ruta al directorio de compilación (configurable con la variable `WEB_DIST`, por defecto el directorio anterior) y sirve el fichero de entrada de cliente que genere el build (se comprueba en el primer paso de `tasks.md` si es `index.csr.html` o `index.html`: con SSR/prerender activos, `index.html` puede ser la página prerenderizada de `/`). Alternativa descartada: delegar en el servidor SSR de `ng-ruteando`, porque obligaría a ejecutar dos procesos Node o a unificar Express con `server.ts` y el panel autenticado con mapas gana poco con SSR; se puede revisar más adelante sin tocar las specs de esta fase.
2. **Orden de middleware.** Las rutas `/api/*` y `/auth/*` se registran antes del estático y del comodín, y el comodín solo atiende `GET` con `Accept: text/html` que no tengan extensión de fichero; el resto cae al 404. Con ello se corrige el bug existente de los `GET` de API ocultos. Alternativa: dejar el orden y excluir prefijos en el comodín (más frágil si se añaden prefijos).
3. **Compilación ausente.** Al arrancar, `server.js` comprueba que existe el directorio y el fichero de entrada. Si no existen, escribe en el log el comando (`npm run build:web`) y responde 503 con un mensaje en las rutas del cliente; no impide arrancar, igual que hoy con Mongo.
4. **Script `build:web` en la raíz** (`npm --prefix ng-ruteando run build`). No se enlaza a `prestart` para no ralentizar cada arranque; se documenta en `CLAUDE.md`.
5. **Entornos con `ng generate environments`.** Ficheros `environment.ts` (producción) y `environment.development.ts` con `apiUrl` (y la base de OAuth si difiere) y sustitución de ficheros en la configuración de desarrollo del builder. El valor de desarrollo es la ruta del proxy (`/hanoit/api/v1`); el de producción es el valor que fije el despliegue. Alternativa: `window.__env` cargado en runtime (más flexible, más piezas; se difiere hasta que haya despliegue real).
6. **Proxy de desarrollo.** `proxy.conf.json` reenvía `/hanoit` al destino por defecto del legacy (`http://hanoit:9000`), con `changeOrigin` y `secure: false`, y se enlaza desde el target `serve`. El destino se cambia editando solo ese fichero.
7. **`TokenStorageService` portado a `src/app/core/auth/token-storage.service.ts`.**
   - Se usa `inject(PLATFORM_ID)` e `isPlatformBrowser`; en servidor `get`, `getRefreshToken` y el estado devuelven vacío o `null` y `set` no persiste.
   - La caducidad se calcula como `Date.now() + expires_in * 1000` y se guarda en ISO. La lectura usa `new Date(valor)` tolerando el formato de fecha que escribía AngularJS (cadena de `Date.toString()`); si no se puede interpretar, el token se considera caducado.
   - Se conservan los nombres de clave `hanoitToken` y `hanoitTokenExpiresDate`, de modo que una sesión abierta en la app anterior se pueda leer durante la transición.
   - Se elimina `scheduleExpiration` con su `setTimeout` y su `TODO`; el refresco programado es de la fase de auth. Se expone la caducidad (`expiresAt`) para que esa fase lo use.
   - Pruebas con `localStorage` real del navegador de pruebas y con `PLATFORM_ID` de servidor.
8. **Eliminar `ruteando-ng/`** con `git rm -r`, quitar `!ruteando-ng/src/app/` de `.gitignore` y limpiar referencias en `CLAUDE.md` y en el skill (`SKILL.md`, `references/*`, incluido borrar `angular-17-ngmodule.md`). La historia de git conserva su contenido.
9. **Documentación.** `CLAUDE.md` pasa a describir un solo proyecto Angular, el flujo `npm run build:web` + `npm start`, la variable `WEB_DIST` y el proxy.

## Risks / Trade-offs

- [El despliegue actual apunta a `ruteando-ng/dist`] → `WEB_DIST` permite mantener la ruta antigua mientras se actualiza el despliegue; se avisa en la nota de **BREAKING** del proposal.
- [El prerender deja un `index.html` que ya contiene el HTML de `/`] → servir el fichero de entrada de cliente correcto (punto 1) y comprobarlo con una ruta profunda.
- [Reordenar el middleware cambia el comportamiento de los `GET` de API] → es la corrección deseada; se cubre con pruebas de integración mínimas contra el servidor (`/api/me` devuelve 401, no HTML).
- [`server.js` carga Mongoose al arrancar y puede tardar o fallar sin Mongo] → comportamiento existente (imprime error y sigue); las pruebas del servidor no dependen de Mongo.
- [Fechas de AngularJS en `localStorage` en formato dependiente del navegador/idioma] → si la lectura falla se trata como caducado y se pide login; nunca se lanza excepción.
- [Borrar `ruteando-ng`] → antes se confirma que no contiene nada sin portar (`home.component` trivial, `token-storage.service` portado, `environments` sin valores útiles).
- [El script de la raíz depende de `npm --prefix`] → alternativa documentada: `cd ng-ruteando && npm run build`.

## Migration Plan

1. Requisitos previos: `upgrade-angular-21-ng-ruteando` terminado, con `adopt-angular-material-ng-ruteando` ya archivado en ese change.
2. Rama `chore/consolidate-ng-ruteando`; ejecutar `tasks.md` en orden, con pruebas verdes tras cada grupo.
3. Verificación final: compilar el frontend, arrancar `server.js` con y sin build, y comprobar `/`, una ruta profunda, `/api/me`, `/inexistente.js` y la ausencia de `ruteando-ng/`.
4. Rollback: revertir la rama; `WEB_DIST` permite volver temporalmente al directorio anterior si el despliegue aún no se actualizó.

## Open Questions

- ¿Dónde estará la API en producción (mismo origen detrás de un proxy inverso, o un host distinto)? Solo cambia el valor de `apiUrl` de producción y, si es otro origen, la configuración CORS del backend; no afecta a las specs ni a las tareas.
- ¿Se usará SSR en producción más adelante? Se decide con datos reales de la fase de auth y mapas; no afecta a esta fase.
