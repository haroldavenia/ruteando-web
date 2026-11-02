# Proposal

## Why

Levantar el proyecto hoy exige Node 22 con `nvm`, `npm ci` en dos sitios, copiar `.env`, tener (o no) el gateway real —que está caído— y, para las pruebas, Chrome instalado. Un contenedor de desarrollo reduce eso a `docker compose up`, con el gateway simulado incluido, igual en Windows, Mac y Linux.

## What Changes

- `Dockerfile.dev` (Node 22, un solo fichero con dos destinos: `dev` y `test` con Chromium).
- `compose.yaml` con servicios: `mock-gateway` (:4010), `web` (`ng serve`, :4200, con recarga) y, bajo perfiles, `app` (compilación + servidor Express :3000, como en producción) y `test` (Karma sin interfaz).
- `.dockerignore`, atajos npm y una sección en `README.md`.
- Sin cambios en el código de la aplicación.

## Fuera de alcance

Imagen de **producción** (multi-stage, para Coolify): es otro change; aquí solo desarrollo. Base de datos: no hay.
