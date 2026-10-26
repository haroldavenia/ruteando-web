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
  features/fleet/      flota (solo tenant_admin y super_admin): tipos de vehículo, vehículos y conductores
  features/places/     lugares (mismos roles): listado, alta, edición y borrado con ubicación en el mapa
  features/packages/   paquetes (administradores y agentes): CRUD, cambio de estado y exportación a CSV
  features/settings/   configuraciones de planificación (administradores): CRUD con secciones según la restricción
  features/journeys/   jornadas (administradores y agentes): planificar, listar y detalle con rutas y paradas
  layout/              shell: barra superior, menú de usuario y menú lateral (solo con sesión)
  shared/              piezas reutilizables: confirmación, formularios (shared/form), listados/borrado/guardado (shared/data) y mapa (shared/map)
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

## Flota

| Ruta | Pantalla |
|---|---|
| `/flota` | Lleva a `/flota/vehiculos` |
| `/flota/vehiculos`, `/nuevo`, `/:id` | Vehículos: listado, alta, edición, borrado y asignación de conductor |
| `/flota/tipos`, `/nuevo`, `/:id` | Tipos de vehículo |
| `/flota/conductores`, `/nuevo`, `/:id` | Conductores (usuarios con rol `driver`) y envío del enlace de restablecimiento |

Solo `tenant_admin` y `super_admin` (`roleGuard(ADMIN_ROLES)`); el menú lateral oculta la sección al resto. Cada pantalla es una ruta diferida y los formularios avisan antes de salir con cambios sin guardar (`unsavedChangesGuard`). El patrón de listado (`ListState`, `DataTableComponent`, `PageHeaderComponent`), borrado (`DeleteFlow`) y envío (`SubmitState`) vive en `shared/data/` y es el que reutilizarán las fases siguientes.

## Lugares y mapa

| Ruta | Pantalla |
|---|---|
| `/lugares` | Listado de lugares |
| `/lugares/nuevo`, `/lugares/:id` | Alta y edición (ubicación en el mapa o con latitud y longitud) |

El mapa (`shared/map`) usa OpenLayers, que se carga solo en el navegador y bajo demanda. Las teselas y su atribución se configuran en `src/environments/environment*.ts` (`map`); por defecto son las de OpenStreetMap (sin clave, uso ligero, atribución obligatoria): para producción real cambia `tilesUrl` y `attribution`. Los campos de latitud y longitud son la alternativa accesible al mapa y siempre están presentes. No hay geocodificación: la dirección se guarda como texto.

## Paquetes

| Ruta | Pantalla |
|---|---|
| `/paquetes` | Listado, cambio de estado, borrado y «Exportar CSV» |
| `/paquetes/nuevo`, `/paquetes/:id` | Alta y edición (ubicación en el mapa o con coordenadas) |
| `/paquetes/importar` | Importar paquetes desde un CSV: plantilla, vista previa con errores por fila, importación con progreso y cancelación, resumen, reintento de fallidas e informe de errores |

Acceso para `tenant_admin`, `super_admin` y `agent` (`OPERATIONS_ROLES`). La guía es única por empresa. El CSV usa `;`, UTF-8 con BOM y las columnas del legacy; los textos que empiezan por `=`, `+`, `-` o `@` llevan un apóstrofo para que la hoja de cálculo no los ejecute. La importación (`/paquetes/importar`) lee el CSV en el navegador (máximo 2 MB y 2000 filas) y crea los paquetes de 4 en 4; como la aplicación no geocodifica, el archivo debe traer `LONGITUD` y `LATITUD`. Descarga la plantilla desde la propia pantalla.

## Configuraciones

| Ruta | Pantalla |
|---|---|
| `/configuraciones` | Listado y borrado |
| `/configuraciones/nuevo`, `/configuraciones/:id` | Alta y edición |

Solo `tenant_admin` y `super_admin`. Una configuración elige topología de la ruta, tipo de restricción, lugares de salida y llegada, vehículos y reglas de evaluación; con «Rutas fijas» se pide el número de rutas y con los demás tipos, el turno. Es lo que luego recibe la planificación de jornadas.

## Jornadas

| Ruta | Pantalla |
|---|---|
| `/jornadas` | Listado y borrado |
| `/jornadas/nueva` | Planificar: nombre, configuración y paquetes (selección que se conserva entre páginas) |
| `/jornadas/:id` | Detalle: resumen, rutas, paradas y paquetes no planificables |

Acceso para `tenant_admin`, `super_admin` y `agent`. La optimización la hace el gateway: la aplicación envía el nombre, la configuración y los ids de los paquetes. Si la planificación tarda más que `GATEWAY_TIMEOUT_MS` (30 s por defecto) el proxy responde 504; súbelo en `.env`. Conocido: el gateway real rechaza ids de paquete hexadecimales en `journeys/plan` (400 `For input string`). El detalle muestra las rutas en un mapa (una línea de color por ruta, paradas numeradas y depósitos con «D») con una leyenda y una ficha de parada operables con teclado; elegir una ruta o una parada en las tablas («Ver en el mapa») la enfoca en el mapa.

El tema de Angular Material se define una sola vez en `src/styles.scss`.
