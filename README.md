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

## Probar sin el gateway real

`scripts/mock-gateway.mjs` es un gateway falso con datos en memoria (lugares, flota, paquetes, jornadas ya planificadas con rutas y paradas, zonas), para iniciar sesión y recorrer la aplicación sin el gateway real. No es el contrato oficial y los datos se pierden al pararlo.

```
npm run mock:gateway                                              # puerto 4010 (MOCK_GATEWAY_PORT)
GATEWAY_URL=http://localhost:4010 GATEWAY_API_KEY=mock npm start  # la app contra el mock, en otra terminal
```

Usuarios (contraseña `demo1234`): `admin@example.invalid` (administración), `agente@example.invalid` (agente) y `conductor@example.invalid` (conductor, sin áreas). Las variables del entorno tienen prioridad sobre `.env`.

## Desarrollo

Desde `ng-ruteando/`: `npm start` (puerto 4200, con el mismo proxy `/gateway` y las mismas variables), `npm run test:ci` (Karma con Chrome sin interfaz) y `npm run build`.

## Pruebas del servidor

```
npm run test:server
```

## Más información

`CLAUDE.md` describe la arquitectura, y las decisiones y requisitos están en `openspec/`. El código de la aplicación AngularJS anterior sigue en el historial de git (último commit que lo contiene: `19b1cb4`).
