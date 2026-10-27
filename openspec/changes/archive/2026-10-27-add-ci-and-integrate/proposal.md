# Proposal

## Why

El repositorio tiene 1191 pruebas de frontend, 26 del servidor y 25 specs validadas, pero **nada las ejecuta salvo una persona a mano**: no existe `.github/`. Mientras tanto hay seis PR apilados (#4 a #9) sin fusionar, tres changes sin archivar y ninguna rama protegida: lo que llegue a `main` llegaría sin comprobar. Además `npm audit` marca 4 vulnerabilidades de producción en el frontend (3 altas y 1 crítica), una de ellas por `@faker-js/faker`, una dependencia que ningún fichero usa. Antes de seguir añadiendo funcionalidad hace falta una red de seguridad automática y un camino ordenado para llevar todo a `main`.

## What Changes

- **Integración continua con GitHub Actions** en cada PR (a cualquier rama base, porque los PR están apilados) y en cada push a `main`: pruebas y compilación del frontend, pruebas del servidor, validación estricta de las specs y auditoría de dependencias de producción; un último trabajo `ci` resume el resultado en una sola comprobación obligatoria.
- **Entorno reproducible**: Node de `ng-ruteando/.nvmrc` (22), `npm@11` (npm 10.9 puede fallar al instalar desde cero), `npm ci` con los dos `package-lock.json`, caché de npm, Chrome sin interfaz con el lanzador `ChromeHeadlessCI` que ya existe, y ningún secreto ni acceso al gateway (las pruebas usan dobles).
- **Seguridad del propio CI**: permisos mínimos (`contents: read`), acciones oficiales fijadas por SHA con su versión en un comentario, tiempos máximos por trabajo y cancelación de ejecuciones obsoletas.
- **Dependencias seguras**: retirar `@faker-js/faker` (sin uso), ejecutar `npm audit fix` en el frontend y dejar la auditoría de producción sin vulnerabilidades altas ni críticas antes de convertirla en obligatoria; **Dependabot** semanal para npm (raíz y frontend) y para las propias acciones.
- **Integración ordenada**: fusionar la cadena de PR de #4 a #9 en orden con CI en verde, archivar los tres changes abiertos (resolviendo la tarea 1.1 de `modernize-app-ui`), proteger `main` exigiendo la comprobación `ci` y activar los avisos privados de seguridad.
- Fuera de alcance: despliegue continuo, publicación de artefactos, matriz de versiones de Node o de navegadores, y pruebas contra el gateway real.

## Capabilities

### New Capabilities
- `continuous-integration`: el repositorio verifica automáticamente cada cambio antes de llegar a `main`, con un entorno reproducible, permisos mínimos, control de vulnerabilidades y una rama principal protegida.

### Modified Capabilities

Ninguna.

## Impact

- Ficheros nuevos: `.github/workflows/ci.yml` y `.github/dependabot.yml`.
- `ng-ruteando/package.json` y `package-lock.json` (retirar `@faker-js/faker`, `npm audit fix`); posible subida de `jspdf` (arrastra `dompurify`) y de `express` (arrastra `body-parser`) dentro de su rango.
- `README.md` y `CLAUDE.md` (cómo ejecutar lo mismo que CI en local y cuál es la comprobación obligatoria).
- Configuración del repositorio en GitHub (protección de `main`, avisos privados), que solo puede hacer quien lo administra.
- Sin cambios de comportamiento de la aplicación ni del servidor.
