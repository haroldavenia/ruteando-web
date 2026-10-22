# ng-ruteando

Frontend Angular 21 de Ruteando (standalone, SCSS, Angular Material M3, SSR). Es el destino de la migración desde la app AngularJS de `master/`.

## Requisitos

- Node `^20.19 || ^22.12 || >=24` (campo `engines`; `.nvmrc` = 22, usa `nvm use`). Con una versión fuera de rango, `npm install` avisa con `EBADENGINE`.
- Si `npm install` desde cero falla con `Cannot read properties of null (reading 'edgesOut')`, usa npm 11 (`npx npm@11 install`); `npm ci` funciona con npm 10 y 11.
- `npm ci` dentro de `ng-ruteando/` para instalar dependencias.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200/` con recarga automática |
| `npm run build` | Compilación de producción en `dist/ng-ruteando/{browser,server}`; falla si se superan los presupuestos de tamaño |
| `npm test` | Pruebas unitarias con Karma en modo interactivo (abre Chrome y vigila cambios) |
| `npm run test:ci` | Pruebas unitarias en una sola ejecución con Chrome sin interfaz; termina con código distinto de 0 si alguna falla |
| `npm run serve:ssr:ng-ruteando` | Servidor Node con renderizado en servidor en `http://localhost:4000/` (hay que compilar antes con `npm run build`); acepta peticiones del host `localhost` y los de la variable `NG_ALLOWED_HOSTS` (lista separada por comas) |

Las pruebas necesitan Chrome instalado (o la variable `CHROME_BIN` apuntando a un binario de Chrome/Chromium).

## Comprobar el SSR a mano

```
npm run build
npm run serve:ssr:ng-ruteando &
curl -s http://localhost:4000/ | grep -o "Planificación de rutas"
```

La respuesta debe contener el texto de la página de inicio ya renderizado.

## Entornos y proxy de desarrollo

La URL base de la API sale del entorno y se provee con el token `API_BASE_URL` (`src/app/core/api/api-config.ts`); el código de `src/app/` no contiene URLs ni claves de la API.

| Fichero | Se usa en | `apiUrl` |
|---|---|---|
| `src/environments/environment.ts` | `ng build` (producción) | `/gateway` |
| `src/environments/environment.development.ts` | `ng serve` y `ng build --configuration development` | `/gateway` |

`/gateway` es una ruta del propio origen: en producción la atiende el servidor Express (`server/gateway-proxy.js`) y con `ng serve` la atiende `proxy.conf.js`. Ambos reenvían a `<GATEWAY_URL>/api/v1/...` y añaden la cabecera `X-Api-Key` desde el servidor, de modo que el navegador no ve la clave ni hace peticiones de otro origen.

Para arrancar con el gateway:

```
cp ../.env.example ../.env     # en la raíz del repositorio; .env no se versiona
# edita ../.env: GATEWAY_URL (sin /api/v1) y GATEWAY_API_KEY
npm start
```

También se pueden pasar como variables de entorno (`GATEWAY_URL=... GATEWAY_API_KEY=... npm start`); lo definido en el entorno tiene prioridad sobre `.env`. Para apuntar a otro gateway cambia `GATEWAY_URL` y reinicia `ng serve`; no hace falta tocar el código. Si falta alguna variable, `ng serve` avisa con su nombre y `/gateway` responde 503.

La clave es un secreto: no la escribas en los ficheros de entorno ni en el código.

## Estructura

```
src/app/
  app.component.ts     componente raíz (solo un router-outlet)
  app.config.ts        proveedores (router, hidratación, HTTP con interceptores, animaciones, restauración de sesión)
  app.routes.ts        rutas: /acceso/** con su layout; el área privada con el shell diferido y authGuard
  core/                api (HTTP, errores, modelos, servicios de datos), auth (sesión, guards), geo
  features/access/     pantallas de acceso: login, registro, verificar correo, recuperar y restablecer
  layout/              shell: barra superior, menú de usuario y menú lateral (solo con sesión)
  shared/              piezas reutilizables (diálogo de confirmación)
  home/                página de inicio (privada)
```

## Pantallas de acceso

| Ruta | Pantalla |
|---|---|
| `/acceso` | Iniciar sesión (`?returnUrl=` solo admite rutas internas) |
| `/acceso/registro` | Crear cuenta |
| `/acceso/recuperar` | Recuperar contraseña |
| `/acceso/verificar-email?token=` | Verificar el correo (inicia sesión) |
| `/acceso/restablecer?token=` | Elegir una contraseña nueva |

Los correos del gateway deben enlazar a `/acceso/verificar-email?token=...` y a `/acceso/restablecer?token=...`. La página de inicio y el resto del área privada exigen sesión.

El tema de Angular Material se define una sola vez en `src/styles.scss`.
