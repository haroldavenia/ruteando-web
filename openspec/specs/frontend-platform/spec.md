# frontend-platform Specification

## Purpose
Garantiza que el frontend `ng-ruteando` se ejecute sobre una versión de Angular con soporte vigente, con el framework y sus librerías de UI alineados, y que compile, pruebe y sirva con SSR sobre las versiones de Node declaradas como soportadas.

## Requirements

### Requirement: Versión de Angular con soporte vigente
El proyecto `ng-ruteando` SHALL usar Angular 21.x y todos sus paquetes `@angular/*` SHALL compartir la misma versión mayor.

#### Scenario: Versiones del framework coherentes
- **WHEN** se ejecuta `npm ls @angular/core @angular/common @angular/router @angular/platform-browser @angular/ssr @angular/cdk @angular/material` en `ng-ruteando/`
- **THEN** todos los paquetes resuelven a la versión mayor 21 sin avisos de dependencias no satisfechas (`ERESOLVE`, `invalid`, `missing`)

#### Scenario: Sin paquetes duplicados del framework
- **WHEN** se inspecciona el árbol de dependencias de `@angular/core`
- **THEN** existe una única versión instalada

### Requirement: Versiones de Node declaradas
El proyecto SHALL declarar qué versiones de Node permite para desarrollar y construir, y SHALL rechazar las no soportadas por la versión de Angular instalada.

#### Scenario: Node soportado
- **WHEN** se ejecuta `npm install` y `npx ng build` con una versión de Node incluida en el campo `engines`
- **THEN** ambos comandos terminan con código 0 sin avisos de "Unsupported" del CLI

#### Scenario: Node no soportado
- **WHEN** se ejecuta `npm install` con una versión de Node fuera de `engines`
- **THEN** npm informa de la incompatibilidad antes de instalar

### Requirement: Compilación de producción
El proyecto SHALL compilar en modo producción sin errores ni avisos de presupuesto con `ng build`.

#### Scenario: Build de producción correcto
- **WHEN** se ejecuta `npx ng build` en `ng-ruteando/` tras `npm install`
- **THEN** el comando termina con código 0 y genera las salidas de navegador y de servidor

#### Scenario: Presupuestos respetados
- **WHEN** se ejecuta el build de producción
- **THEN** no se supera el límite de error de 1mb del bundle inicial ni de 4kb por estilo de componente

### Requirement: Pruebas ejecutables
El proyecto SHALL ejecutar su suite de pruebas desde línea de comandos, sin navegador interactivo, con el resultado reflejado en el código de salida.

#### Scenario: Suite verde
- **WHEN** se ejecuta `npm test` en modo de una sola ejecución y sin interfaz
- **THEN** el comando termina con código 0 y ejecuta al menos una prueba por cada componente del shell (`app`, `home`, `shell`)

#### Scenario: Fallo detectado
- **WHEN** una prueba falla
- **THEN** el comando termina con código distinto de 0

### Requirement: Renderizado en servidor conservado
La aplicación SHALL seguir sirviéndose con SSR sin acceder a APIs exclusivas del navegador durante el render, y SHALL hidratarse en el cliente sin errores.

#### Scenario: Respuesta SSR
- **WHEN** se ejecuta el servidor Node generado y se pide `/`
- **THEN** la respuesta HTML contiene el contenido de la página de inicio ya renderizado

#### Scenario: Hidratación sin errores
- **WHEN** el navegador carga `/` desde el servidor SSR
- **THEN** la consola no muestra errores de hidratación ni de proveedores

#### Scenario: Ruta desconocida
- **WHEN** se pide una ruta que no existe
- **THEN** la aplicación redirige a `/`
