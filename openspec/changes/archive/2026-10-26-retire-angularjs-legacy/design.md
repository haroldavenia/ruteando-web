# Design

## Context

Ver proposal.md (Why). Estado observado:

- `ng-ruteando` ya no depende de nada del legacy: ni `angular.json`, ni `package.json`, ni `proxy.conf.js`, ni `server.ts` mencionan `master/`, `externModules/` o `json/`, y ningún `.ts` llama a `/api/*` o `/auth/*` del servidor propio (las llamadas a `/auth/...` van por `/gateway`).
- `server/server.js` (850 líneas) es el ejemplo de Satellizer con Mongoose, JWT propio y diez flujos OAuth; el proxy (`gateway-proxy.js`, 81 líneas), el estático y el comodín del cliente ocupan unas 40 líneas al final. `server/config.js` trae secretos por defecto.
- `server/test/` tiene dos ficheros: `gateway-proxy.test.js` y `serving.test.js`; ambos arrancan `server.js` de verdad y varias pruebas dependen de `/api/me`, `/api/account` y `/auth/*`. `helpers.js` fija `MONGO_URI` para el hijo.
- `app/` no existe en el árbol de trabajo (siempre fue salida de gulp, ignorada); `index.html` de la raíz es el del AngularJS y lleva una clave de Google Maps. `build/config.gypi` está versionado por error.
- `package.json` de la raíz es el de `angular-seed` y tiene como `devDependencies` todo el backend de ejemplo más karma, jasmine y herramientas del seed.
- El menú del shell vive en una constante privada (`NAV_ITEMS` en `layout/shell.component.ts`) filtrada por rol; la home es un `<h1>` y un párrafo.
- `JourneysApi.list` solo admite `page` y `size`; el orden por defecto del gateway no está documentado.

## Goals / Non-Goals

**Goals:**
- Dejar un repositorio con un solo frontend y un servidor mínimo (proxy, estático, comodín del cliente) sin MongoDB ni secretos por defecto.
- Una home que oriente sin duplicar la lista del menú.
- Retirar el legacy en pasos pequeños y reversibles, solo después de comprobar contra el gateway real.

**Non-Goals:**
- No se migra el login de demostración, los gráficos de `json/bar.json` ni las pantallas sin contrato (servicios asignados, geocodificación).
- No se cambia el proxy del gateway, la sesión ni las pantallas de negocio.
- No se reescribe el historial de git: lo borrado sigue en commits anteriores.

## Decisions

1. **Comprobar primero, borrar después.** El grupo 1 verifica el gateway real (login, ruta con visitas, cambio de estado, `packageId` de las paradas, orden de `journeys`). Los grupos de borrado no empiezan hasta que se anote el resultado; si las visitas salen vacías, se abre otro change antes de retirar `master/`, que es la referencia funcional. Alternativa: borrar ya y apoyarse en git; descartada porque el borrado deja de ser trivial de revisar con 600 ficheros.
2. **El servidor se reduce reescribiendo `server.js`, no podándolo.** El resultado es un fichero corto: carga `.env`, registra `morgan`, el proxy, el estático con `redirect: false`, el 404 JSON para `['/api', '/auth']` y el comodín del cliente. `cors`, `body-parser` y la redirección HTTPS de Heroku se quitan: el navegador y el servidor comparten origen y no hay cuerpos que analizar (el proxy reenvía en streaming). Se conserva `colors` o se sustituye por texto plano, según lo que ya usa `gateway-proxy.js` (`require('colors')`), para no tocar el proxy; se decide al implementar y se anota. Alternativa: dejar los manejadores devolviendo 410; descartada, `/api` y `/auth` no deben existir.
3. **`/api/*` y `/auth/*` siguen respondiendo 404 JSON.** Evita que una URL de API mal escrita devuelva el HTML de la aplicación (comportamiento que ya existe y que las pruebas cubren) y deja explícito que no son rutas del cliente.
4. **Se borra todo el legacy de una vez por directorio, en commits separados:** `master/` + `index.html` + `build/`; `externModules/` + `json/`; backend de ejemplo y `server/` auxiliar; configuración (`package.json`, lockfile, `.gitignore`, README). Así cada commit se puede revertir sin arrastrar los demás. `npm uninstall` regenera `package-lock.json` en el commit de configuración.
5. **La home reutiliza el menú.** `NAV_ITEMS` pasa a `layout/nav-items.ts` junto con una función pura `navItemsFor(role)`; el shell y la home la usan. Los accesos de la home son las entradas del menú sin «Inicio», con los hijos de Flota aplanados (Vehículos, Tipos de vehículo, Conductores). Alternativa: duplicar la lista; descartada, derivaría.
6. **Últimas jornadas con `JourneysApi.list({ page: 0, size: 5 })`.** El orden depende del gateway: si el grupo 1 confirma que acepta `sort=createdAt,desc` o que ya devuelve lo más reciente primero, se pide así; si no, se pide `size: 20` y se ordena en el cliente por `createdAt` descendente mostrando cinco, con el título «Jornadas recientes» y la limitación anotada en `gateway-api.md`. La petición solo se hace si el rol puede abrir `/jornadas` (`OPERATIONS_ROLES`) y solo en el navegador, nunca en el render del servidor.
7. **Estados de la lista con el patrón existente** (`RecordLoader`/`ListState` según encaje: se usa el más sencillo que dé cargando, error con reintento y vacío); los accesos se pintan sin esperar a la lista.
8. **Documentación:** `CLAUDE.md` se reescribe corto (comandos, proxy, arquitectura del frontend, cómo está montado el servidor). De la skill `angular-ruteando` se retiran `references/migracion-angularjs.md` y las menciones al legacy como referencia funcional; `gateway-api.md` conserva la tabla «Mapeo legacy → gateway» como registro histórico, con una nota de que el código original está en el historial (commit anterior al borrado).

## Risks / Trade-offs

- [Las visitas salen vacías en el gateway real] → el grupo 1 lo detecta antes de borrar; se abre un change para ajustar de dónde sale la visita y no se retira `master/` hasta entonces.
- [Se pierde la referencia funcional del legacy] → el historial de git lo conserva; se anota en `gateway-api.md` el hash del último commit que lo contiene.
- [Alguien depende del login o de `/api/*` del servidor] → no hay referencias en el repositorio; se anuncia como **BREAKING** y las rutas responden 404 JSON.
- [Pruebas del servidor que cubrían `/api/me` pasan a no tener sentido] → se sustituyen por pruebas del 404 de `/api/*` y `/auth/*` y de que el servidor arranca sin Mongo.
- [`npm uninstall` altera `package-lock.json` más de lo esperado] → se revisa que el árbol del frontend y `gateway-proxy` siguen resolviendo y se ejecutan `test:server`, `test:ci` y `build:web` después.
- [El orden de `journeys` no es el esperado] → decisión 6, con alternativa documentada.

## Migration Plan

Commits independientes por grupo (comprobación y home, `master/`, `externModules/` y `json/`, servidor, configuración y documentación). Reversión: `git revert` del commit del grupo; no hay migración de datos porque el backend de ejemplo no se usaba con datos reales (su MongoDB era de demostración).
