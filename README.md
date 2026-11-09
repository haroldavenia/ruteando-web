# ruteando-web

Aplicación web de planificación de rutas. El frontend es Angular (`ng-ruteando/`) y se apoya en el HanoIT Gateway; un pequeño servidor Express publica la compilación y reenvía las peticiones al gateway sin exponer su clave.

## Requisitos

- Node `^20.19 || ^22.12 || >=24` (en `ng-ruteando/.nvmrc` está la 22: `nvm use`).
- pnpm 10 (la versión exacta está en `packageManager` de `package.json`): `corepack enable` (viene con Node 20 a 24) o `npm install -g pnpm`; con pnpm 10 instalado, descarga solo la versión que pide el proyecto.
- Dirección y clave de API del HanoIT Gateway.

## Puesta en marcha

```
pnpm install --frozen-lockfile          # servidor (raíz) y frontend (un solo pnpm-lock.yaml)
cp .env.example .env                    # y rellena GATEWAY_URL y GATEWAY_API_KEY
pnpm run build:web                       # compila ng-ruteando
pnpm start                               # http://localhost:3000
```

Sin `.env` el servidor arranca y avisa, pero `/gateway/**` responde 503. `PORT` cambia el puerto y `WEB_DIST` el directorio que se publica.

El servidor añade cabeceras de seguridad a todas las respuestas (`server/security-headers.js`). La política de contenido (CSP) va por defecto en modo solo informe (`CSP_MODE=report-only`: el navegador anota las violaciones en la consola y no bloquea nada); `CSP_MODE=enforce` la aplica y `off` la quita. Si cambias el proveedor de teselas del mapa, añade su origen a `CSP_IMG_SRC` (varios, separados por espacios). La compilación de producción no lleva manejadores en línea (`optimization.styles.inlineCritical = false` en `angular.json`), así que `enforce` no rompe nada hoy; tras añadir recursos externos o scripts en línea, recorre la aplicación con `report-only` y sin violaciones antes de usarlo.

## Probar sin el gateway real

`scripts/mock-gateway.mjs` es un gateway falso con datos en memoria (lugares, flota, paquetes, jornadas ya planificadas con rutas y paradas, zonas), para iniciar sesión y recorrer la aplicación sin el gateway real. No es el contrato oficial y los datos se pierden al pararlo.

```
pnpm run mock:gateway                                              # puerto 4010 (MOCK_GATEWAY_PORT)
GATEWAY_URL=http://localhost:4010 GATEWAY_API_KEY=mock pnpm start  # la app contra el mock, en otra terminal
```

Usuarios (contraseña `demo1234`): `admin@example.invalid` (administración), `agente@example.invalid` (agente) y `conductor@example.invalid` (conductor, sin áreas). Las variables del entorno tienen prioridad sobre `.env`.

## Con Docker (desarrollo)

Sin instalar Node ni copiar `.env`: `docker compose up` (o `pnpm run docker:dev`) levanta el gateway simulado y `ng serve` en http://localhost:4200 (usuarios y contraseña como en la sección anterior). La primera vez instala las dependencias en volúmenes de Docker y tarda unos minutos; después solo reinstala si cambia el `pnpm-lock.yaml`. Tras la migración a pnpm (que cambia `Dockerfile.dev`), reconstruye las imágenes una vez: `docker compose --profile prod-like --profile test build` (o `docker compose up --build`); si una imagen vieja se queda con `pnpm: not found`, es eso. Los volúmenes con `node_modules` de npm se reinstalan solos (el hash del lock cambió); si algo queda raro, `docker compose down -v`. El código se monta desde el equipo y recarga al guardar.

```
docker compose up                              # app en :4200 + gateway simulado en :4010
docker compose --profile prod-like up app      # compilación + servidor Express en :3000, como en producción
docker compose --profile test run --rm test    # pruebas del frontend (pnpm run docker:test)
docker compose down                            # parar (pnpm run docker:down); `down -v` borra también las dependencias
```

Para usar otro gateway define `DOCKER_GATEWAY_URL` y `DOCKER_GATEWAY_API_KEY` (en `.env` o en el entorno); `GATEWAY_URL` y `GATEWAY_API_KEY` no se usan aquí a propósito, para no apuntar al gateway real por accidente. No hay base de datos. Es una imagen de desarrollo (`Dockerfile.dev`), no la de producción.

## Desarrollo

Desde `ng-ruteando/`: `pnpm start` (puerto 4200, con el mismo proxy `/gateway` y las mismas variables), `pnpm run test:ci` (Karma con Chrome sin interfaz) y `pnpm run build`.

## Instalar como aplicación (PWA)

La compilación de producción es una PWA: en Chrome o Edge aparece «Instalar aplicación» en el menú de usuario (y en la barra de direcciones); en iPhone/iPad, «Compartir → Añadir a pantalla de inicio». Carga desde caché y avisa cuando hay una versión nueva; los datos siempre vienen del gateway (sin conexión se ve la carcasa, no los datos). Se prueba con `pnpm run build:web && pnpm start` (en `ng serve` no hay service worker). Requiere HTTPS salvo en `localhost`.

## Integración continua

`.github/workflows/ci.yml` verifica cada pull request (a cualquier rama base) y cada push a `main` con cinco trabajos: `Frontend` (pruebas con Chrome sin interfaz y compilación de producción), `Servidor` (pruebas), `Specs` (`openspec validate --specs --strict`), `Auditoría` (`pnpm audit` de las dependencias de producción, nivel alto) y `ci`, que resume los anteriores. **La comprobación obligatoria de `main` es `ci`.** Usa el Node de `ng-ruteando/.nvmrc`, pnpm (versión de `packageManager`) y `pnpm install --frozen-lockfile`, y no necesita secretos ni el gateway real.

Lo mismo en local:

```
pnpm install --frozen-lockfile && pnpm --filter ng-ruteando run test:ci && pnpm --filter ng-ruteando run build
pnpm run test:server
npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict
pnpm audit --prod --audit-level=high
```

Dependabot propone cada semana las actualizaciones de las dependencias (raíz y frontend, ecosistema `npm` de Dependabot, que lee `pnpm-lock.yaml`) y de las acciones, que pasan por el mismo CI. La versión del CLI de OpenSpec (`OPENSPEC_VERSION` en el flujo) y los SHA de las acciones se actualizan a mano o con esos pull requests.

## Pruebas del servidor

```
pnpm run test:server
```

## Más información

`CLAUDE.md` describe la arquitectura, y las decisiones y requisitos están en `openspec/`. El código de la aplicación AngularJS anterior sigue en el historial de git (último commit que lo contiene: `19b1cb4`).
