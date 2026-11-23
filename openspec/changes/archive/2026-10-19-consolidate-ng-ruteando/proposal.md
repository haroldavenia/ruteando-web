# Proposal

## Why

Hoy conviven dos proyectos Angular y el equivocado es el que sirve producción: `server/server.js` publica `ruteando-ng/dist/ruteando-ng` (Angular 17.0 NgModule, sin CLI instalado, sin tests, sin UI), mientras que el trabajo real (Material, layout, SSR, tests, versión 21 tras `upgrade-angular-21-ng-ruteando`) está en `ng-ruteando`. Cada fase siguiente de la migración desde AngularJS (auth, catálogos, mapas, jornadas) necesita un único destino, una URL de API configurable por entorno y un servicio de tokens seguro en SSR. Dejar dos proyectos duplica la configuración y confunde a quien añada código.

## What Changes

- Hacer de `ng-ruteando` el único frontend Angular: `server/server.js` pasa a publicar su salida compilada, con redirección a la aplicación para las rutas del cliente y sin tapar las rutas de API del propio Express.
- Eliminar `ruteando-ng/` del repositorio, quitar `!ruteando-ng/src/app/` del `.gitignore` y sus referencias en `CLAUDE.md` y en el skill `angular-ruteando`.
- Portar `TokenStorageService` de `ruteando-ng` a `ng-ruteando/src/app/core/auth/`, seguro en SSR, con el cálculo de caducidad corregido y con pruebas. El refresco automático y los interceptores quedan para la fase de auth.
- Añadir configuración por entorno (`environment` de desarrollo y de producción) con la URL base de la API y un proxy de desarrollo para evitar CORS.
- Añadir un script en la raíz para compilar el frontend antes de `npm start`, y un aviso claro cuando falta la compilación.
- **BREAKING**: `ruteando-ng/` desaparece y el servidor deja de publicar `ruteando-ng/dist`; quien tenga scripts o despliegues apuntando a ese directorio debe cambiarlos a `ng-ruteando/dist/ng-ruteando/browser`.
- Fuera de alcance: decidir si SSR se usa en producción (se publica la versión de navegador; el servidor SSR sigue compilando), el contrato de auth del backend, interceptores, guards, pantallas de login, y cualquier cambio en la lógica de `server/` (auth Satellizer, secretos de `server/config.js`).

## Capabilities

### New Capabilities
- `frontend-serving`: el servidor Express publica la aplicación Angular compilada, resuelve las rutas del cliente y no interfiere con las rutas de API.
- `frontend-environments`: la aplicación obtiene la URL de la API de la configuración del entorno, con un proxy de desarrollo, y no contiene secretos ni URLs literales en el código.
- `auth-token-storage`: la aplicación guarda el token de acceso en memoria y el de refresco en el almacenamiento del navegador, con caducidad correcta y sin acceder al navegador durante el SSR.

### Modified Capabilities
- `frontend-app-shell`: el requisito "Código fuente versionado" ya no menciona `ruteando-ng`, que deja de existir.

## Impact

- Código: `server/server.js`, `package.json` raíz, `.gitignore`, `ng-ruteando/angular.json`, `ng-ruteando/src/environments/*`, `ng-ruteando/proxy.conf.json`, `ng-ruteando/src/app/core/auth/*`; se borra `ruteando-ng/`.
- Documentación: `CLAUDE.md`, `.claude/skills/angular-ruteando/`.
- Dependencias: ninguna nueva.
- Requiere: `upgrade-angular-21-ng-ruteando` completado y archivado (la forma final de la salida compilada y de las specs a modificar depende de él).
- Riesgos: el despliegue actual depende de `ruteando-ng/dist`; la caducidad de sesiones existentes del legacy (clave `hanoitToken` en `localStorage`) debe seguir leyéndose.
