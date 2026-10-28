# ruteando-web

Aplicación web de planificación de rutas. El frontend es Angular (`ng-ruteando/`) y se apoya en el HanoIT Gateway; un pequeño servidor Express publica la compilación y reenvía las peticiones al gateway sin exponer su clave.

## Requisitos

- Node `^20.19 || ^22.12 || >=24` (en `ng-ruteando/.nvmrc` está la 22: `nvm use`).
- Dirección y clave de API del HanoIT Gateway.

## Puesta en marcha

```
npm ci                                  # servidor (raíz)
npm --prefix ng-ruteando ci             # frontend
cp .env.example .env                    # y rellena GATEWAY_URL y GATEWAY_API_KEY
npm run build:web                       # compila ng-ruteando
npm start                               # http://localhost:3000
```

Sin `.env` el servidor arranca y avisa, pero `/gateway/**` responde 503. `PORT` cambia el puerto y `WEB_DIST` el directorio que se publica.

El servidor añade cabeceras de seguridad a todas las respuestas (`server/security-headers.js`). La política de contenido (CSP) va por defecto en modo solo informe (`CSP_MODE=report-only`: el navegador anota las violaciones en la consola y no bloquea nada); `CSP_MODE=enforce` la aplica y `off` la quita. Si cambias el proveedor de teselas del mapa, añade su origen a `CSP_IMG_SRC` (varios, separados por espacios). Antes de usar `enforce` hay que recorrir la aplicación sin violaciones: hoy el `onload` de la hoja de estilos de la compilación se bloquearía y los estilos se verían mal.

## Probar sin el gateway real

`scripts/mock-gateway.mjs` es un gateway falso con datos en memoria (lugares, flota, paquetes, jornadas ya planificadas con rutas y paradas, zonas), para iniciar sesión y recorrer la aplicación sin el gateway real. No es el contrato oficial y los datos se pierden al pararlo.

```
npm run mock:gateway                                              # puerto 4010 (MOCK_GATEWAY_PORT)
GATEWAY_URL=http://localhost:4010 GATEWAY_API_KEY=mock npm start  # la app contra el mock, en otra terminal
```

Usuarios (contraseña `demo1234`): `admin@example.invalid` (administración), `agente@example.invalid` (agente) y `conductor@example.invalid` (conductor, sin áreas). Las variables del entorno tienen prioridad sobre `.env`.

## Desarrollo

Desde `ng-ruteando/`: `npm start` (puerto 4200, con el mismo proxy `/gateway` y las mismas variables), `npm run test:ci` (Karma con Chrome sin interfaz) y `npm run build`.

## Integración continua

`.github/workflows/ci.yml` verifica cada pull request (a cualquier rama base) y cada push a `main` con cinco trabajos: `Frontend` (pruebas con Chrome sin interfaz y compilación de producción), `Servidor` (pruebas), `Specs` (`openspec validate --specs --strict`), `Auditoría` (`npm audit` de las dependencias de producción, nivel alto) y `ci`, que resume los anteriores. **La comprobación obligatoria de `main` es `ci`.** Usa el Node de `ng-ruteando/.nvmrc`, `npm@11` y `npm ci`, y no necesita secretos ni el gateway real.

Lo mismo en local:

```
npm --prefix ng-ruteando ci && npm --prefix ng-ruteando run test:ci && npm --prefix ng-ruteando run build
npm ci && npm run test:server
npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict
npm audit --omit=dev --audit-level=high && npm --prefix ng-ruteando audit --omit=dev --audit-level=high
```

Dependabot propone cada semana las actualizaciones de npm (raíz y frontend) y de las acciones, que pasan por el mismo CI. La versión del CLI de OpenSpec (`OPENSPEC_VERSION` en el flujo) y los SHA de las acciones se actualizan a mano o con esos pull requests.

## Pruebas del servidor

```
npm run test:server
```

## Más información

`CLAUDE.md` describe la arquitectura, y las decisiones y requisitos están en `openspec/`. El código de la aplicación AngularJS anterior sigue en el historial de git (último commit que lo contiene: `19b1cb4`).
