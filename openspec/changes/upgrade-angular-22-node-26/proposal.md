# Proposal

## Why

El repositorio está en Angular 21.2, TypeScript 5.9 y Node 22 (mínimo). Medido el 2026-11-18 contra el registro de npm:

- **Angular 22.3.0** salió hoy (22.0.0 es del 2026-06-03). Requiere **TypeScript `>=6.0 <6.1`** y **Node `^22.22.3 || ^24.15.0 || >=26`**; Angular Material y CDK 22.3.0 van fijados a la misma versión.
- **Node 26 «Lithium»** (26.13.1) es LTS; 24 «Krypton» (24.22.3) y 22 «Jod» (22.23.5) siguen publicados. La máquina de desarrollo tiene 24.16.0 (cumple el mínimo de Angular 22, pero no es la última 24) y `.nvmrc`/Docker fijan «22» sin parche, cuando Angular 22 exige 22.22.3 como mínimo.
- Dependabot no puede hacer esta subida por sí solo (los mayores de Angular están ignorados a propósito: deben subir todos a la vez con `ng update`), así que los PR 55–58 de la ronda 2 se cerraron y la subida queda pendiente a mano.

El objetivo es dejar **todo en las últimas versiones estables que sean compatibles entre sí**, con las mismas cifras de pruebas, compilación, lint y rendimiento que la línea base.

## What Changes

- **Node**: `.nvmrc` y `Dockerfile.dev` a **26** (LTS); `engines` de la raíz a `^22.22.3 || ^24.15.0 || >=26` (el mínimo que exige Angular 22; el servidor ya pedía `^22.13 || >=24` por `node:sqlite`).
- **Angular** 21.2 → **22.3.0** en todos los paquetes a la vez (`@angular/*`, `@angular/cdk`, `@angular/material`, `@angular/ssr`, `@angular/cli`, `@angular-devkit/build-angular`), con `ng update` y sus migraciones.
- **TypeScript** 5.9.3 → **6.0.3** (la última 6.0; Angular 22 y `typescript-eslint` 8.73 aceptan `<6.1`).
- **Herramientas de lint**: `angular-eslint` 21.4 → **22.8.0**, `typescript-eslint` 8.72.2 → 8.73.0 (`prettier` 3.10.1 ya está en `main`).
- **Parches y menores**: `nodemailer` 10.4.0 → 10.6.0, `http-proxy-middleware` 4.2.1 → 4.2.2, `@types/node` `^18` → `^22` (los tipos siguen al mínimo de Node que se soporta).
- Cambios de código que exige Angular 22 (ver `design.md`): quitar `withFetch()` (deprecado), revisar `paramsInheritanceStrategy` (ahora `'always'`), los diagnósticos nuevos de plantillas (`nullishCoalescingNotNullable`, `optionalChainNotNullable`) y los cambios de Material 22 (sidenav inerte, menú, lista, ordenación, select).
- `dependabot.yml`: ignorar lo que no se puede subir todavía (TypeScript ≥ 6.1, ESLint 10, etc.) para que no vuelva a abrir PR que fallan.
- Documentación: `CLAUDE.md`, `README.md`, `ng-ruteando/README.md`, habilidades de `.claude/` y specs vigentes que citan «Angular 21.2», «Node 22» o «TypeScript 5.9».
- **Sin cambios de comportamiento** de la aplicación: por eso `skip_specs: true`.

## Fuera de alcance (cada uno es otro change, con su motivo en `design.md`)

TypeScript 7 (compilador nativo; Angular 22 y `typescript-eslint` no lo admiten), ESLint 10, Express 5, pnpm 12, Jasmine 7 / paso de Karma a Vitest, modo sin zone.js, migración a `@angular/build`, CLI de OpenSpec 2.x.
