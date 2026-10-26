# frontend-app-shell Specification

## Purpose
Garantiza que el frontend `ng-ruteando` compile, arranque en navegador y con renderizado en servidor, y que su código fuente quede bajo control de versiones.

## Requirements

### Requirement: El proyecto compila
El proyecto `ng-ruteando` SHALL compilar en modo producción sin errores con `ng build`.

#### Scenario: Build de producción correcto
- **WHEN** se ejecuta `npx ng build` en `ng-ruteando/` tras `npm install`
- **THEN** el comando termina con código 0 y genera `dist/ng-ruteando/browser` y `dist/ng-ruteando/server`

#### Scenario: Presupuestos respetados
- **WHEN** se ejecuta el build de producción
- **THEN** no se supera el límite de error de 1mb del bundle inicial ni de 4kb por estilo de componente

### Requirement: Arranque en navegador
La aplicación SHALL mostrar la página de inicio con el título de la aplicación en la ruta raíz a quien tenga sesión iniciada, y SHALL llevar a la pantalla de acceso a quien no la tenga.

#### Scenario: Página de inicio
- **WHEN** un usuario con sesión abre `/` con `ng serve`
- **THEN** se renderiza el layout base con la página de inicio y sin errores en consola

#### Scenario: Ruta desconocida
- **WHEN** el usuario abre una ruta que no existe
- **THEN** la aplicación redirige a `/`

#### Scenario: Visitante anónimo en la raíz
- **WHEN** un usuario sin sesión abre `/`
- **THEN** es llevado a la pantalla de acceso y no se muestra la página de inicio ni el layout con menú lateral

### Requirement: Renderizado en servidor
La aplicación SHALL poder servirse con SSR desde el servidor Node generado, sin acceder a APIs exclusivas del navegador durante el render.

#### Scenario: Respuesta SSR
- **WHEN** se ejecuta `npm run serve:ssr:ng-ruteando` tras compilar y se pide `/acceso`
- **THEN** la respuesta HTML contiene el formulario de inicio de sesión ya renderizado

#### Scenario: Raíz sin sesión en el servidor
- **WHEN** se pide `/` al servidor SSR
- **THEN** la respuesta no contiene la página de inicio: es la pantalla de acceso o una redirección a ella

### Requirement: Código fuente versionado sin reglas heredadas
El código de `ng-ruteando/src/app/` SHALL estar sujeto a control de versiones sin depender de excepciones en `.gitignore`, que no SHALL contener reglas de la aplicación anterior.

#### Scenario: Fichero nuevo visible
- **WHEN** se crea `ng-ruteando/src/app/app.config.ts`
- **THEN** `git status` lo muestra como no rastreado y `git check-ignore` no lo ignora

#### Scenario: Sin reglas heredadas
- **WHEN** se lee el `.gitignore`
- **THEN** no contiene reglas ni excepciones para una carpeta `app/` en la raíz, para `master/`, para `vendor` ni para `ruteando-ng`
