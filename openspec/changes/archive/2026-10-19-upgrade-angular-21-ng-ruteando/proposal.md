# Proposal

## Why

`ng-ruteando` está en Angular 17.3, que ya no recibe parches (la política oficial es 6 meses de soporte activo más 12 de LTS, y las versiones hasta la 19 están fuera de soporte). Toda la migración de negocio desde AngularJS (rutas, jornadas, mapas, exportaciones) está por construir encima de este proyecto. Ahora el shell tiene solo 4 componentes y un tema, así que el coste de subir de versión y de pasar de Material M2 a M3 es mínimo; hacerlo después obligaría a reescribir toda la UI. Se elige la versión 21 porque conserva LTS hasta 2027 y evita otro salto forzado a corto plazo.

## What Changes

- Archivar el change `adopt-angular-material-ng-ruteando` (19/19 tareas hechas) para que sus specs pasen a `openspec/specs/` y este change pueda modificarlas.
- Subir `ng-ruteando` de 17.3 a 21 de una versión mayor en una (17→18→19→20→21) con `ng update`, un commit por salto y build verde en cada uno.
- Alinear `@angular/material` y `@angular/cdk` con la versión de `@angular/core`.
- **BREAKING**: sustituir el tema Material M2 (`define-light-theme`, paletas) por el tema M3 en `styles.scss`, definido una sola vez.
- Fijar las versiones soportadas de Node y TypeScript en `ng-ruteando` (campo `engines` y `.nvmrc`), ya que el Node local (24.x) aparece como no soportado por el CLI 17.
- Adaptar el SSR (`server.ts`, `app.config.server.ts`, `angular.json`) a la forma que exige Angular 21, conservando el comportamiento actual: `/` se renderiza en servidor y se hidrata.
- Ejecutar las migraciones automáticas de cada salto (componentes standalone por defecto, control flow, etc.) y revisar el diff.
- Decidir y documentar qué hacer con la prueba de componentes (`ng test`/Karma) y con los selectores de animaciones.
- Fuera de alcance: mover o retirar `ruteando-ng` (change `consolidate-ng-ruteando`), código de negocio, auth, mapas, i18n y la decisión de si SSR se usa en producción.

## Capabilities

### New Capabilities
- `frontend-platform`: `ng-ruteando` se ejecuta sobre una versión de Angular con soporte vigente, con dependencias del framework alineadas y con compilación, pruebas y SSR verdes sobre las versiones de Node soportadas.

### Modified Capabilities
- `ui-material-theme`: la alineación de versiones pasa de 17.3 a la versión mayor vigente, y el tema global pasa de M2 a M3 manteniendo un único punto de definición.

## Impact

- Código: `ng-ruteando/package.json` y `package-lock.json`, `angular.json`, `tsconfig*.json`, `server.ts`, `src/main*.ts`, `src/app/app.config*.ts`, `src/styles.scss`, componentes existentes (`app`, `home`, `shell`).
- Dependencias: `@angular/*`, `@angular/cdk`, `@angular/material`, `@angular/ssr`, `@angular-devkit/build-angular` (o el builder que sustituya), `typescript`, `zone.js`, `rxjs`, y herramientas de test según la decisión del design.
- Entorno: se exige una versión de Node concreta para desarrollar y construir.
- Riesgos: salto de cuatro versiones mayores, cambios de API de SSR entre 17 y 21, reescritura de SCSS del tema, y que `ol`, `jspdf` y `@faker-js/faker` (declarados pero sin uso todavía) no se hayan probado con la nueva versión.
- Sin impacto en `server/`, `master/` ni `ruteando-ng/`.
