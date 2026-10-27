# ng-ruteando: Angular 21 standalone + SSR

## Estado actual (verificado tras `upgrade-angular-21-ng-ruteando`)

- `@angular/* ^21.2` (core 21.2.25), `@angular/ssr ^21.2.27`, CDK y Material `21.2.14`, `rxjs ~7.8`, `zone.js ~0.15.1`, `typescript ~5.9.3`, CLI/devkit `^21.2.27`.
- **Node:** `^20.19.0 || ^22.12.0 || >=24.0.0` (campo `engines`; `.nvmrc` = 22). Verificado con 20.20.2, 22.23.3 y 24.16.0. Con Node 18 `npm install` avisa con `EBADENGINE`.
- **npm:** con npm 10.9 `npm install` desde cero falló con `Cannot read properties of null (reading 'edgesOut')` (fallo interno del resolutor); el lockfile se regeneró con npm 11 y `npm ci` funciona con npm 10 y 11.
- Builder `@angular-devkit/build-angular:application` (esbuild), `browser: src/main.ts`, `server: src/main.server.ts`, `prerender: true`, `ssr.entry: server.ts`. Estilos `src/styles.scss`.
- Budgets: initial 500kb/1mb, `anyComponentStyle` 2kb/4kb. Bundle inicial tras el tema M3: ~448 kB brutos.
- Test: Karma + Jasmine con `karma.conf.js` propio (lanzador `ChromeHeadlessCI`). `npm run test:ci` = una ejecución sin interfaz (necesita Chrome o `CHROME_BIN`). 9 specs (`app`, `home`, `shell`).
- `tsconfig`: `strict`, `strictTemplates`, `moduleResolution: bundler`, target ES2022.
- Los componentes son standalone **por defecto**: no se escribe `standalone: true` (el schematic de v19 lo eliminó de `app` y `shell`; `home` aún lo conserva, es redundante y se puede quitar).
- Convención de nombres de fichero: se mantiene `*.component.ts` (la migración a 20 conservó el estilo anterior en `angular.json`).

## Zone.js y detección de cambios

Angular 21 es zoneless por defecto en proyectos nuevos; este proyecto **conserva zone.js** con `provideZoneChangeDetection()` en `app.config.ts` (compartido por navegador y servidor). Pasar a zoneless es una decisión futura, no parte de la subida de versión.

## SSR

- Se mantiene `CommonEngine` de `@angular/ssr/node` en `server.ts`; no está marcado como obsoleto en 20.3/21.2.
- **`allowedHosts` es obligatorio desde 19.2.** Sin él, `CommonEngine` registra un error y devuelve la versión de cliente (sin SSR). `server.ts` lo lee de `NG_ALLOWED_HOSTS` (lista separada por comas, por defecto `localhost`). En despliegue hay que añadir el host público, o las peticiones recibirán render de cliente.
- `provideServerRendering` se importa de `@angular/ssr`.
- Salida: `dist/ng-ruteando/browser` (con `index.html` prerenderizado de `/` e `index.csr.html`) y `dist/ng-ruteando/server`.
- Prueba rápida: `npm run build && npm run serve:ssr:ng-ruteando` y `curl -s http://localhost:4000/ | grep "Planificación de rutas"`.
- Comprobación de consola sin interfaz: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --enable-logging=stderr --virtual-time-budget=8000 --dump-dom <url>` (no hay `timeout` en macOS).

## app.config

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
  ],
};
```

`@angular/animations` y `@angular/platform-browser-dynamic` aparecen como obsoletos al instalar (`npm warn deprecated`); no se migran todavía: `provideAnimationsAsync()` sigue siendo lo que usa Material.

## Convenciones

- Plantillas con control flow `@if/@for/@switch` (`track` obligatorio en `@for`).
- `inject()` en ficheros nuevos; `OnPush` en componentes; textos de UI en español.
- Signals para el estado local (`signal`, `computed`) y `toSignal` para observables; `input()`/`output()` están estables.
- `prerender: true` pre-renderiza rutas estáticas: las rutas con auth no deben prerenderizarse.
- Guarda APIs del navegador (`window`, `localStorage`) con `PLATFORM_ID` o `afterNextRender`.
- No añadir Bootstrap ni ng-bootstrap; la UI es `@angular/material` y `@angular/cdk` 21.2 con tema M3.

## Migrar versiones en este repo (lecciones)

- `ng update` exige árbol de git limpio; se usó un commit por salto.
- Una migración puede reformatear código (p. ej. sangría del decorador) o duplicar mixins en `styles.scss` (v19 sustituyó `core()` y `core-theme()` por los mismos dos `@include`): revisar siempre el diff.
- Si `ng update` falla en la instalación, completar con `npm` 11 y ejecutar las migraciones con `npx @angular/cli@<N> update <paquete> --migrate-only --from=<x> --to=<y>`.
