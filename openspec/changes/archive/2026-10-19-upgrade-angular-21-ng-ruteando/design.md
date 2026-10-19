# Design

## Context

`ng-ruteando` es Angular 17.3 standalone con builder `application`, `prerender: true`, SSR con `CommonEngine` en `server.ts`, `strictTemplates`, SCSS, Material 17.3 con tema M2 en `styles.scss` y budgets 500kb/1mb (initial) y 2kb/4kb (por componente). Tiene 3 componentes (`app`, `home`, `shell`), ningún fichero `.spec.ts`, un target `test` con Karma pero sin `karma.conf.js`, y `index.html` con Roboto y Material Icons desde Google Fonts. Declara `ol`, `jspdf` y `@faker-js/faker` sin usarlos todavía. El CLI 17.3 marca como "Unsupported" el Node local (24.16). Ver `proposal.md` para la motivación.

Las cifras concretas de Angular 18 a 21 (requisitos de Node y TypeScript, API de SSR, API de tema M3, estado de las animaciones) **no se fijan aquí**: se leen de la salida de `ng update`, de `npm view` y de la guía oficial de actualización en cada salto, y se anotan en el commit de ese salto. Este diseño fija el método y las decisiones que no dependen de esos datos.

## Goals / Non-Goals

**Goals:**
- Dejar `ng-ruteando` en Angular 21.x con build, pruebas y SSR verdes.
- Hacer el cambio de tema M2→M3 una sola vez, mientras el shell es mínimo.
- Dejar una suite de pruebas ejecutable en CI para que las fases siguientes tengan red de seguridad.

**Non-Goals:**
- Mover o retirar `ruteando-ng`, cambiar `server/server.js` (change `consolidate-ng-ruteando`).
- Decidir si SSR se usa en producción (se conserva funcional, el uso se decide en `consolidate-ng-ruteando`).
- Migrar a signals/zoneless, a otro test runner o a otro builder más allá de lo que fuerce la versión.
- Código de negocio, auth, mapas, i18n.

## Decisions

1. **Salto escalonado 17→18→19→20→21.** En cada versión: `ng update @angular/core@N @angular/cli@N`, después `ng update @angular/material@N`; aceptar las migraciones automáticas; `ng build`, `npm test` y SSR verdes; un commit por salto. Alternativa descartada: saltar directo de 17 a 21 (el CLI no lo soporta y se pierden las migraciones intermedias).
2. **Node.** Los saltos intermedios se ejecutan con una versión de Node que soporten a la vez el CLI de origen y el de destino (se comprueba con `npm view @angular/cli@N engines` antes de cada salto; Node 22 LTS es el candidato). Al terminar se verifica con la versión mínima y con la más reciente que declare `@angular/core@21`, y se fija `engines` y `.nvmrc` con el resultado. Alternativa: usar el Node 24 local en todos los saltos (el CLI 17 ya lo marca como no soportado).
3. **Tema M3.** Se sustituye la definición M2 por la API de tema M3 vigente en Material 21, con un único `@include` en `styles.scss` y la tipografía Roboto. Se parte de una paleta predefinida cercana al índigo/rosa actual para minimizar el cambio visual; los colores definitivos de marca quedan para una fase posterior. Los mixins por componente solo se conservan si la API nueva todavía los requiere. Alternativa: mantener M2 mientras siga disponible (descartada: es justo el coste que se quiere evitar pagar con más UI hecha).
4. **SSR.** Se migra `server.ts`, `app.config.server.ts` y `angular.json` a la forma que exija Angular 21 (en 19 y 20 aparecen rutas de servidor con modo de render por ruta, `outputMode` y un motor de petición distinto de `CommonEngine`; se confirma en cada salto). Comportamiento a conservar: `/` renderizado en servidor, hidratación, y el resto de rutas resueltas por la aplicación. Si la API nueva obliga a elegir un modo por ruta, `''` se prerenderiza y `**` se renderiza en servidor, igual que hoy.
5. **Pruebas: se mantiene Karma + Jasmine.** Es lo que ya declara el proyecto y el que sigue soportado; cambiar de runner no aporta a esta fase. Se añade `karma.conf.js` con un lanzador de Chrome sin interfaz, el script `test:ci` (una sola ejecución, sin watch) y un `.spec.ts` por componente del shell (`app`, `home`, `shell`: crea el componente, renderiza el título y el menú). Se escribe cada spec en el mismo salto en que se necesita para validar (a partir del primer salto), no al final.
6. **Migraciones automáticas.** Se aceptan y se revisa el diff. En particular, la eliminación de `standalone: true` redundante la hace el propio schematic; no se edita a mano.
7. **Animaciones.** `provideAnimationsAsync()` se mantiene mientras Material 21 lo necesite. Si el CLI o el compilador lo marcan como obsoleto, se anota la advertencia en `tasks.md` y no se migra aquí.
8. **Dependencias sin uso (`ol`, `jspdf`, `@faker-js/faker`).** Se dejan instaladas; el criterio es que `npm install` y `npm ls` no reporten conflictos de peer dependencies con Angular 21. Si alguna lo hace, se actualiza a una versión compatible sin importarla.
9. **Verificación visual del tema.** Se compara el shell a 1200px y 600px antes y después y se comprueba el contraste del texto con las herramientas del navegador.

## Risks / Trade-offs

- [Cuatro saltos mayores seguidos] → un commit y una verificación por salto; si uno falla, se revierte solo ese commit.
- [Cambios de API de SSR entre 17 y 21] → es la parte más probable de dar problemas; se resuelve primero en el salto en que aparece, con el criterio de conservar el comportamiento actual.
- [Reescritura del SCSS del tema] → el tema son ~20 líneas; el riesgo es visual, no estructural.
- [Budgets 2kb/4kb por componente y 500kb/1mb inicial] → medir tras cada salto; ajustar solo con justificación documentada.
- [Node local no soportado por CLIs antiguos] → usar la versión de Node del punto 2 en los saltos intermedios.
- [Las migraciones automáticas pueden tocar más de lo esperado] → revisar el diff completo antes de cada commit.
- [`ng test` sin specs ni `karma.conf` hoy] → crearlos en el primer salto para que sirvan de red de seguridad en los siguientes.
- [Material y fuentes por Google Fonts] → sin cambios; ya era una nota de privacidad del change anterior.

## Migration Plan

1. Prerrequisito: archivar `adopt-angular-material-ng-ruteando` (sus specs deben estar en `openspec/specs/` para que el delta `ui-material-theme` de este change se aplique).
2. Rama `chore/upgrade-angular-21`; ejecutar los saltos en el orden de `tasks.md`.
3. Tras cada salto: `ng build`, `npm run test:ci`, arranque SSR y `curl /`.
4. Al final: cambio de tema, comprobación visual y verificación con Node mínimo y máximo soportado.
5. Rollback: revertir el commit del salto fallido o la rama completa; no hay datos ni backend implicados.
