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

La URL base de la API sale del entorno y se provee con el token `API_BASE_URL` (`src/app/core/config/api-base-url.ts`); el código de `src/app/` no contiene URLs de la API.

| Fichero | Se usa en | `apiUrl` |
|---|---|---|
| `src/environments/environment.ts` | `ng build` (producción) | `/hanoit/api/v1` (mismo origen; el despliegue decide el destino) |
| `src/environments/environment.development.ts` | `ng serve` y `ng build --configuration development` | `/hanoit/api/v1` |

`ng serve` reenvía `/hanoit` al destino de `proxy.conf.json` (por defecto `http://hanoit:9000`), de modo que el navegador no hace peticiones de otro origen. Para cambiar el destino, edita `target` en `proxy.conf.json` y reinicia `ng serve`; no hace falta tocar el código. Ejemplo:

```
"target": "http://localhost:9099"
```

En el entorno no se guardan secretos ni credenciales.

## Estructura

```
src/app/
  app.component.ts     componente raíz (renderiza el layout)
  app.config.ts        proveedores (router, hidratación, HTTP, animaciones)
  app.config.server.ts configuración añadida para SSR
  app.routes.ts        rutas (carga diferida)
  layout/              shell: barra superior y menú lateral
  home/                página de inicio
```

El tema de Angular Material se define una sola vez en `src/styles.scss`.
