# Spec Delta

## Purpose

Garantiza que el frontend `ng-ruteando` compile, arranque en navegador y con renderizado en servidor, y que su código fuente quede bajo control de versiones.

## ADDED Requirements

### Requirement: El proyecto compila
El proyecto `ng-ruteando` SHALL compilar en modo producción sin errores con `ng build`.

#### Scenario: Build de producción correcto
- **WHEN** se ejecuta `npx ng build` en `ng-ruteando/` tras `npm install`
- **THEN** el comando termina con código 0 y genera `dist/ng-ruteando/browser` y `dist/ng-ruteando/server`

#### Scenario: Presupuestos respetados
- **WHEN** se ejecuta el build de producción
- **THEN** no se supera el límite de error de 1mb del bundle inicial ni de 4kb por estilo de componente

### Requirement: Arranque en navegador
La aplicación SHALL mostrar una página de inicio con el título de la aplicación en la ruta raíz.

#### Scenario: Página de inicio
- **WHEN** el usuario abre `/` con `ng serve`
- **THEN** se renderiza el layout base con la página de inicio y sin errores en consola

#### Scenario: Ruta desconocida
- **WHEN** el usuario abre una ruta que no existe
- **THEN** la aplicación redirige a `/`

### Requirement: Renderizado en servidor
La aplicación SHALL poder servirse con SSR desde el servidor Node generado, sin acceder a APIs exclusivas del navegador durante el render.

#### Scenario: Respuesta SSR
- **WHEN** se ejecuta `npm run serve:ssr:ng-ruteando` tras compilar y se pide `/`
- **THEN** la respuesta HTML contiene el contenido de la página de inicio ya renderizado

### Requirement: Código fuente versionado
El código de `ng-ruteando/src/app/` SHALL estar sujeto a control de versiones y no ignorado por git.

#### Scenario: Fichero nuevo visible
- **WHEN** se crea `ng-ruteando/src/app/app.config.ts`
- **THEN** `git status` lo muestra como no rastreado y `git check-ignore` no lo ignora

#### Scenario: Regla existente intacta
- **WHEN** se evalúa `ruteando-ng/src/app/` y la carpeta `app/` de la raíz
- **THEN** `ruteando-ng/src/app/` sigue sin ignorarse y `app/` de la raíz sigue ignorada
