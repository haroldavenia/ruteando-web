## MODIFIED Requirements

### Requirement: Versión de Angular con soporte vigente
El proyecto `ng-ruteando` SHALL usar Angular 22.x y todos sus paquetes `@angular/*` SHALL compartir la misma versión mayor.

#### Scenario: Versiones del framework coherentes
- **WHEN** se ejecuta `pnpm ls @angular/core @angular/common @angular/router @angular/platform-browser @angular/ssr @angular/cdk @angular/material` en `ng-ruteando/`
- **THEN** todos los paquetes resuelven a la versión mayor 22 sin avisos de dependencias no satisfechas (`ERESOLVE`, `invalid`, `missing`)

#### Scenario: Sin paquetes duplicados del framework
- **WHEN** se inspecciona el árbol de dependencias de `@angular/core`
- **THEN** existe una única versión instalada

## ADDED Requirements

### Requirement: Versión de TypeScript compatible con Angular
El proyecto SHALL usar una versión de TypeScript dentro del rango que exige el compilador de la versión de Angular instalada (para Angular 22, `>=6.0 <6.1`), y SHALL declarar en `engines` de ambos `package.json` las versiones de Node que esa versión de Angular admite.

#### Scenario: TypeScript dentro del rango
- **WHEN** se ejecuta `pnpm ls typescript` en `ng-ruteando/`
- **THEN** resuelve a una versión 6.0.x y `pnpm install` no avisa de un peer `typescript` sin cumplir

#### Scenario: Node declarado
- **WHEN** se lee el campo `engines.node` de `package.json` y de `ng-ruteando/package.json`
- **THEN** ambos coinciden con el de `@angular/cli` instalado (`^22.22.3 || ^24.15.0 || >=26.0.0`)
