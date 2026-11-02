# Design

## Servicios

| Servicio | Perfil | Qué hace | Puerto |
|---|---|---|---|
| `mock-gateway` | (siempre) | `node scripts/mock-gateway.mjs`, datos ficticios en memoria | 4010 |
| `web` | (siempre) | `npm --prefix ng-ruteando start -- --host 0.0.0.0 --poll 2000`; `proxy.conf.js` reenvía `/gateway` | 4200 |
| `app` | `prod-like` | `npm run build:web` y `npm start` (Express + estático + cabeceras + CSP) | 3000 |
| `test` | `test` | `npm --prefix ng-ruteando run test:ci` con `CHROME_BIN` de Chromium | — |

Por defecto el contenedor recibe `GATEWAY_URL=http://mock-gateway:4010` y `GATEWAY_API_KEY=mock`; quien quiera otro gateway define `DOCKER_GATEWAY_URL` y `DOCKER_GATEWAY_API_KEY` (en `.env` o en el entorno). Se usan variables aparte porque compose lee el `.env` para interpolar y, con `GATEWAY_*`, un `.env` con el gateway real se aplicaría por accidente.

## Decisiones

- **Un `Dockerfile.dev`, no uno por servicio**: misma base (`node:22-bookworm-slim`); la diferencia es el comando. El destino `test` añade `chromium` y Karma debe lanzarlo con `--no-sandbox` (como root en contenedor Chrome lo exige).
- **Código por bind mount, `node_modules` por volumen con nombre** (raíz y `ng-ruteando`): evita que el `node_modules` de Windows (binarios nativos distintos) pise al del contenedor y es mucho más rápido. `npm ci` se ejecuta al arrancar solo si el lock cambió (hash guardado en el volumen).
- **`--poll 2000`**: los eventos de ficheros de un bind mount de Windows no siempre llegan; el sondeo cuesta algo de CPU pero hace fiable la recarga. Si el repo vive en el sistema de ficheros de WSL2 no hace falta.
- **`--host 0.0.0.0`** y, si se accede por un nombre distinto de `localhost`, `allowedHosts` en Angular.
- `.env` entra por el bind mount de la raíz y sigue ignorado por git; la clave nunca entra en la imagen (`.dockerignore` excluye `.env`, `node_modules`, `dist`, `.git`).

## Riesgos

- El perfil `prod-like` no sustituye a una prueba con el proxy real de producción (nginx/Traefik): ver las lecciones de despliegue del `CLAUDE.md` global.
- Karma en Docker mide 800 px como siempre; el diseño ancho se sigue verificando en Chrome real.
