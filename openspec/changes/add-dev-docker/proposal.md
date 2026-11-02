# Proposal

## Why

Levantar el proyecto hoy exige Node 22 con `nvm`, `npm ci` en dos sitios, copiar `.env`, tener (o no) el gateway real —que está caído— y, para las pruebas, Chrome instalado. Un contenedor de desarrollo reduce eso a `docker compose up`, con el gateway simulado incluido, igual en Windows, Mac y Linux.

## Hallazgo previo: ¿se usaba MongoDB en la app vieja?

**Sí, pero solo para los usuarios del ejemplo de autenticación, y esa parte ya no existe.** Evidencia (último commit con la app AngularJS, `19b1cb4`):

- `server/server.js` era el backend de ejemplo de **Satellizer** (Sahat Yalkabov, 2015). Con `mongoose` definía un único modelo `User` (`email`, `password` con bcrypt, `displayName`, `picture` y un campo por proveedor: `google`, `github`, `facebook`, `twitter`, `linkedin`, `live`, `yahoo`, `foursquare`) y lo usaba solo en `/api/me`, `/auth/login`, `/auth/signup`, `/auth/<proveedor>` y `/auth/unlink/:provider`. `server/config.js` apuntaba a `mongodb://hanoit:27017/hanoit` (`MONGO_URI`).
- **Ningún dato de negocio** (rutas, paquetes, flota, jornadas, lugares) estaba en Mongo: lo servía el backend **HanoitApi** (`API_HOST 'hanoit'`, puerto 9000, `/hanoit/api`). El `README.txt` viejo decía «levanta HanoitApi pues usará la base de datos de mongo»; la base de ese backend es ajena a este repo.
- `/api/account` devolvía `{status:'ok'}` sin tocar nada, y las pruebas actuales (`server/test/serving.test.js`) ya comprueban que el log no menciona Mongo.
- Hoy el servidor es Express sin base de datos: la sesión es del HanoIT Gateway (`/gateway/auth/*`). `mongoose` ya no está en el `package.json`.

**Conclusión: no hace falta Mongo (ni ninguna base de datos) en el entorno Docker.**

## What Changes

- `Dockerfile.dev` (Node 22, un solo fichero con dos destinos: `dev` y `test` con Chromium).
- `compose.yaml` con servicios: `mock-gateway` (:4010), `web` (`ng serve`, :4200, con recarga) y, bajo perfiles, `app` (compilación + servidor Express :3000, como en producción) y `test` (Karma sin interfaz).
- `.dockerignore`, atajos npm y una sección en `README.md`.
- Sin cambios en el código de la aplicación.

## Fuera de alcance

Imagen de **producción** (multi-stage, para Coolify): es otro change; aquí solo desarrollo. Base de datos: no hay.
