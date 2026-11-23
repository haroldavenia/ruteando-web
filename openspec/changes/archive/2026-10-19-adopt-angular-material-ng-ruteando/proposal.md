# Proposal

## Why

`ng-ruteando/` (Angular 17.3 standalone con SSR) declara `bootstrap` y `@popperjs/core` en `package.json`, pero no los usa, y además **no compila**: `main.ts` y `main.server.ts` importan `./app/app.config` y `AppComponent`, y `src/app/` no existe. El `.gitignore` ignoraría esa carpeta si se creara. Todavía no hay UI, así que es el momento de fijar el sistema de componentes sin coste de migración. Se elige Angular Material porque es el que mejor cubre un panel de gestión (tablas, formularios, diálogos, sidenav) y va alineado con la versión de Angular.

## What Changes

- Crear el esqueleto mínimo en `ng-ruteando/src/app/` para que el proyecto compile y sirva con SSR: `app.config.ts`, `app.config.server.ts`, `app.component.ts`, `app.routes.ts` y una página de inicio.
- Añadir `!ng-ruteando/src/app/` al `.gitignore` para que el código no quede ignorado.
- Instalar `@angular/material@17.3.x` y `@angular/cdk@17.3.x` en `ng-ruteando`.
- Configurar el tema Material M2 en `styles.scss` y `provideAnimationsAsync()`; fuentes Roboto y Material Symbols en `index.html`.
- Construir un layout base con `MatToolbar` y `MatSidenav` como contenedor de las futuras features.
- **BREAKING**: eliminar `bootstrap` y `@popperjs/core` de `ng-ruteando/package.json`.
- Eliminar `@ng-bootstrap/ng-bootstrap` del `package.json` raíz (exige Angular 19 y está fuera de lugar).
- Fuera de alcance: `ruteando-ng/` (Angular 17.0), migración de features de `master/js/custom`, OpenLayers/jsPDF, autenticación y el salto a Angular 19.

## Capabilities

### New Capabilities
- `frontend-app-shell`: el proyecto `ng-ruteando` compila, arranca en navegador y con SSR, y su código fuente en `src/app/` se versiona.
- `ui-material-theme`: la interfaz usa Angular Material con tema M2 global, tipografía e iconos, y un layout base reutilizable; no hay dependencias de Bootstrap.

### Modified Capabilities

(ninguna; `openspec/specs/` está vacío)

## Impact

- Código: `ng-ruteando/src/**`, `ng-ruteando/package.json` (+ `package-lock.json`), `ng-ruteando/angular.json` solo si el tema lo requiere, `.gitignore`, `package.json` raíz.
- Dependencias: añade `@angular/material` y `@angular/cdk` 17.3.x; elimina `bootstrap`, `@popperjs/core`, `@ng-bootstrap/ng-bootstrap`.
- Riesgos: budget `anyComponentStyle` de 2kb/4kb y `initial` de 500kb/1mb; el tema global debe vivir en `styles.scss` y usar mixins por componente.
- Sin impacto en `server/` ni en `ruteando-ng/`, que sigue siendo lo que sirve `server.js`.
