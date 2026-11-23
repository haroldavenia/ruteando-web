# Trampas conocidas del repo (verificadas)

1. **SSR y `BreakpointObserver`**: en servidor no hay `matchMedia` y siempre devuelve "no coincide". Observa breakpoints en `afterNextRender` y arranca el signal con el valor de escritorio para evitar desajustes de hidratación (ver `layout/shell.component.ts`).
2. **SSR y `allowedHosts`**: desde Angular 19.2 `CommonEngine` necesita `allowedHosts`; sin él cae a render de cliente. `server.ts` lo toma de `NG_ALLOWED_HOSTS` (por defecto `localhost`).
3. **Puertos**: backend Express 3000; SSR de `ng-ruteando` 4000; `ng serve` 4200. El servidor sirve `ng-ruteando/dist/ng-ruteando/browser` (requiere `pnpm run build:web` previo; `WEB_DIST` lo cambia). Las pruebas del servidor son `pnpm run test:server` (`node:test`).
4. **Budgets** de `ng-ruteando`: `anyComponentStyle` 2kb/4kb y initial 500kb/1mb; `ol` (y `jspdf` cuando vuelva) pueden romperlos: cargar bajo demanda (`@defer`, `import()`) y mantener el tema solo en `styles.scss`.
5. **pnpm** (desde `chore/pnpm`): un solo `pnpm-lock.yaml`; los scripts de instalación de las dependencias no se ejecutan (`ignoredBuiltDependencies` en `pnpm-workspace.yaml`); un import sin declarar en el `package.json` no se resuelve (sin dependencias fantasma). El fallo de npm 10.9 con `edgesOut` ya no aplica.
6. **macOS**: no existe el comando `timeout`; `ng serve` y el servidor SSR se lanzan en segundo plano con `&` y se detienen con `pkill -f`.
7. **Express 4 y rutas**: un `app.get('*')` registrado antes que las rutas de API las tapa; el estático y el comodín van siempre al final de `server.js`, después de `/gateway` y del 404 de `/api` y `/auth`.
