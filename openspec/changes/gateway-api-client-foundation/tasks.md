# Tasks

## 1. Preparación y entorno

- [x] 1.1 Confirmar que `upgrade-angular-21-ng-ruteando` y `consolidate-ng-ruteando` están archivados (`openspec list --specs` incluye `frontend-platform`, `frontend-serving`, `frontend-environments` y `auth-token-storage`) y crear la rama `feat/gateway-api-client-foundation`
- [x] 1.2 Elegir la librería de proxy HTTP para Express: comprobar con `npm view <paquete> version peerDependencies engines` que está mantenida y es compatible con Node 22 y Express 4, instalarla en la raíz y verificar con `npm ls <paquete>` (elegida `http-proxy-middleware@3.0.7`, devDependency de la raíz con versión exacta: línea 3 mantenida, Node >=18, Express 4, `npm audit` sin vulnerabilidades; la 4.2 exige Node >=22.15 y dejaría fuera a Node 20.19)
- [x] 1.3 Crear `.env.example` con `GATEWAY_URL` (valor de ejemplo `https://gateway.example.invalid`) y `GATEWAY_API_KEY` (valor de ejemplo `change-me`), añadir `.env` a `.gitignore` y verificar con `git check-ignore -v .env` y que `git status` no muestra un `.env` de prueba
- [x] 1.4 Crear en `.env` local, sin confirmarlo, los valores reales de un entorno de pruebas del gateway, y verificar con `git status --short` que no aparece

## 2. Proxy del servidor (gateway-proxy)

- [x] 2.1 Crear `server/gateway-proxy.js` que cargue `.env` si existe (`process.loadEnvFile`), reescriba `/gateway` a `/api/v1`, use `changeOrigin`, inyecte `X-Api-Key` desde `GATEWAY_API_KEY`, descarte la `X-Api-Key` y `Host` del cliente, reenvíe `Authorization` y no registre cabeceras sensibles; verificar con un `curl` contra un gateway falso que el destino recibe la ruta y la clave correctas
- [x] 2.2 Añadir tiempos de espera y manejo de errores: 502 JSON genérico si el destino no acepta la conexión, 504 JSON si no responde a tiempo, y 503 con mensaje claro si falta `GATEWAY_API_KEY` (con aviso en el registro al arrancar); verificar cada caso con `curl` y comprobar que los cuerpos no incluyen dirección ni clave
- [x] 2.3 Registrar el proxy en `server/server.js` antes de `bodyParser`, del estático y del comodín del SPA, sin tocar `/api/*` ni `/auth/*`; verificar que `GET /gateway/recurso-inexistente` devuelve el 404 del destino (no HTML) y que `GET /api/me` sigue devolviendo 401 JSON
- [x] 2.4 Escribir `server/test/gateway-proxy.test.js` con `node:test` y un gateway falso local que cubra: reescritura de ruta y consulta, JSON, 204/202, inyección y sustitución de `X-Api-Key`, reenvío de `Authorization`, multipart con `boundary` intacto, 502, 504, 503 sin clave y precedencia frente al comodín; verificar `npm run test:server` en verde
- [x] 2.5 Comprobar con `grep -rn "<valor de la clave de prueba>" ng-ruteando/dist server/` que la clave no aparece en el build ni en el código, y documentar en `CLAUDE.md` las variables, el proxy y el comando para arrancar con `.env`; verificar que el procedimiento descrito funciona

## 3. Proxy de desarrollo y entorno (gateway-proxy, frontend-environments)

- [x] 3.1 Sustituir `ng-ruteando/proxy.conf.json` por `proxy.conf.js` con la misma lógica que el servidor (reescritura, `X-Api-Key` desde `process.env`, aviso si falta la variable) y enlazarlo en `angular.json`; verificar con `ng serve` y una petición a `/gateway/...` contra el gateway falso
- [x] 3.2 Poner `apiUrl: '/gateway'` en los dos ficheros de entorno y verificar con `ng build` y `ng build --configuration development` que el valor aparece en cada salida y que `grep -rn "https\?://" ng-ruteando/dist` no muestra el dominio del gateway
- [x] 3.3 Documentar en `ng-ruteando/README.md` cómo arrancar con las variables y cómo cambiar `GATEWAY_URL`, y verificar el procedimiento cambiando el destino y reiniciando

## 4. Capa HTTP común (api-client-core)

- [x] 4.1 Crear `core/api/api-config.ts` con el token de inyección `API_BASE_URL` leído del entorno, `ApiError`, `Page<T>`, `PageParams` y los tipos de modelos de lista; verificar que `ng build` compila y que no hay dominios del gateway en `src/` con `grep`
- [x] 4.2 Implementar los mensajes de error: mapa genérico por estado (400, 401, 403, 404, 5xx, 0) en español, `provideApiErrorMessages()` para registros por código o estado, y `HttpContextToken` con `withErrorMessage()` para mensajes por petición, con la prioridad petición, código, genérico; verificar con pruebas unitarias de cada escenario de prioridad
- [x] 4.3 Implementar `errorInterceptor` que normaliza a `ApiError` leyendo `code`, `error`, `message` y `detail` de forma tolerante, conserva el cuerpo en `details`/`raw`, no usa el texto del servidor como mensaje visible y no usa `alert`; verificar con pruebas para cuerpos JSON, vacíos, no JSON y estado 0
- [x] 4.4 Verificar con una prueba que 202 con `[]` y 204 sin cuerpo se tratan como éxito, y que `Page<T>` y `page=1&size=20` se construyen y leen como indica la spec

## 5. Autenticación de peticiones y refresco (api-client-core)

- [x] 5.1 Ampliar `TokenStorageService` con la caducidad consultable (`expiresAt`, nula sin sesión o tras reiniciar) y con el reemplazo completo en el refresco con rotación; añadir sus pruebas (3599 s a las 10:00:00 da 10:59:59, nula sin sesión, refresco que cambia el token) y verificar `npm run test:ci` en verde
- [x] 5.2 Implementar `authInterceptor` con la lista de rutas públicas (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/resend-verification`, `/invitations/accept/*`), solo para `API_BASE_URL`, sin `Bearer ` vacío; verificar con pruebas de petición autenticada, pública, sin token y a otro origen
- [x] 5.3 Implementar `refreshInterceptor`: refresco compartido para 401 concurrentes, un solo reintento, sin refrescar en `/auth/login` ni `/auth/refresh`, refresco anticipado cuando faltan menos de 30 s, y en fallo limpiar sesión y redirigir a `/acceso?returnUrl=`; verificar con pruebas de refresco correcto, tres 401 simultáneos con una sola llamada, refresco fallido, segundo 401 y refresco anticipado con reloj simulado
- [x] 5.4 Registrar los interceptores en `app.config.ts` en el orden auth, refresh, error con `provideHttpClient(withFetch(), withInterceptors([...]))`; verificar con una prueba de integración con `HttpTestingController` que el orden produce las cabeceras y errores esperados

## 6. Geografía (geo-data-conventions)

- [x] 6.1 Crear `core/geo` con `LatLng`, `fromGeoJsonPoint`, `toGeoJsonPoint`, `toOlCoordinate` y validación de rango (latitud entre -90 y 90, longitud entre -180 y 180, valores no numéricos o incompletos devuelven ausencia); verificar con pruebas de los escenarios de la spec
- [x] 6.2 Implementar `decodePolyline5` (orden lat, lng, sin el reemplazo de barras del legacy, tolerante a cadenas truncadas, vacías o nulas); verificar con una prueba que usa la polilínea real de una ruta de Bogotá (primer punto cerca de 4.61, -74.08) y otra con cadena truncada

## 7. Sesión y acceso (auth-session)

- [x] 7.1 Crear `AuthService` con `login` (mapea `accessToken`, `refreshToken` y `expiresIn` del gateway al formato del `TokenStorageService`), `refresh`, `logout` (llama a `POST /auth/logout` y limpia siempre) y `loadProfile` con `GET /auth/me`; verificar con pruebas de credenciales correctas, incorrectas y de fallo del logout
- [x] 7.2 Crear `CurrentUser` como signal con `id`, `email`, `role` y `tenantId`, y verificar con una prueba que la contraseña no se guarda en almacenamiento ni en estado
- [x] 7.3 Restaurar la sesión al arrancar con un inicializador de aplicación (refresco más perfil) que deja usuario anónimo sin error si no hay token o el refresco falla, y que no actúa en el render de servidor; verificar con pruebas de los tres casos y con `curl` al servidor SSR sin excepciones
- [x] 7.4 Implementar `authGuard` y `roleGuard(roles)` con redirección a `/acceso?returnUrl=`, a `/sin-permiso` y desde `/acceso` a inicio si ya hay sesión; verificar con pruebas de anónimo, con sesión, rol permitido, rol no permitido y cambio de sesión con otro rol
- [x] 7.5 Añadir las rutas mínimas `acceso` y `sin-permiso` con componentes provisionales (solo un título; las pantallas reales son de la fase de acceso) y el mensaje "Tu sesión ha caducado" mediante `MatSnackBar`; verificar con `ng serve` que los redireccionamientos llegan a esas rutas sin bucles (resultado: aún no hay ninguna ruta protegida en la app, así que las redirecciones de los guards se verificaron con el `Router` real en `auth.guards.spec.ts`, incluida la ausencia de bucles; `/acceso` y `/sin-permiso` se comprobaron en SSR y en Chrome sin interfaz, sin errores de consola)
- [x] 7.6 Implementar la inyección del `tenantId` del usuario actual para las peticiones que lo exigen, con error genérico de sesión no válida si no hay usuario; verificar con una prueba de `zones` con y sin usuario (`TenantContext` y su prueba genérica están hechos; la prueba con `zones` se añade en 8.4 y entonces se marca esta tarea)

## 8. Modelos y servicios de datos

- [x] 8.1 Crear `scripts/extract-gateway-fixtures.mjs <ruta-colección>` que escriba en `ng-ruteando/src/testing/fixtures/gateway/` el primer ejemplo de éxito de cada petición, sin tokens, sin claves ni credenciales; verificar con la búsqueda de cadenas de la spec (`accessToken` y `refreshToken` con valor, `X-Api-Key`, `gateway_api_key`, contraseña de la cuenta de pruebas) que no hay secretos
- [x] 8.2 Ejecutar el script con el fichero de la colección (que permanece fuera del repositorio), revisar los fixtures generados a mano antes de confirmar y verificar que ninguno contiene secretos
- [x] 8.3 Escribir los modelos de `core/api/models/` (`Place`, `Zone`, `ResourceType`, `Resource`, `Settings`, `Package`, `MasterDomain`, `Journey` con `Route` y `Waypoint`, `AssignedService`, `User`) con los campos opcionales como `T | null`; verificar que compilan en modo estricto y que los fixtures se ajustan al tipo con una comprobación en las pruebas
- [x] 8.4 Crear los servicios `*.api.ts` de `places`, `zones`, `resource-types`, `resources`, `settings`, `packages` (sin subida de CSV), `master-domains`, `journeys`, `assigned-services` y `users` (incluido `drivers`), con métodos CRUD tipados; verificar con un spec por servicio (`HttpTestingController` y su fixture) que comprueba método, URL, cuerpo y forma de la respuesta
- [x] 8.5 Convertir en el servicio de jornadas la respuesta del gateway al modelo de dominio de ruta (geometría decodificada como `geometry`, coordenadas como `LatLng`); verificar con una prueba que usa el fixture de `POST /journeys/plan`
- [x] 8.6 Crear el servicio de dominios maestros con caché en memoria y valores por defecto locales para `RouteTopology`, `OsrmProfile` y estados de paquete; verificar con pruebas de primera carga, uso de la caché y arranque sin red

## 9. Verificación integral

- [ ] 9.1 Con `.env` apuntando al gateway de pruebas y una cuenta de pruebas (nunca la de administración de producción), arrancar `npm run build:web` y `npm start`, iniciar sesión por la API del servicio, listar `places` y planificar una jornada de prueba; verificar que las respuestas llegan, que la clave no aparece en el navegador (pestaña de red y bundle) y que un 401 forzado se recupera con un solo refresco
- [ ] 9.2 Forzar un 400, un 401 tras refresco fallido, un 403 con rol `driver` y un 404, y verificar que se muestran los mensajes genéricos y que uno personalizado por petición y otro por código sustituyen al genérico
- [x] 9.3 Ejecutar `npm run test:ci` en `ng-ruteando/`, `npm run test:server` en la raíz y `npx ng build`, y verificar código 0, sin avisos de presupuesto y sin errores de SSR en `curl /`
- [x] 9.4 Actualizar `CLAUDE.md` y `.claude/skills/angular-ruteando/` (arquitectura `core/api`, `core/auth`, `core/geo`, proxy del gateway, variables, convenciones de coordenadas y de errores) y verificar con `grep -rn "hanoit:9000\|oauth/token" CLAUDE.md .claude/skills` que no quedan indicaciones del backend anterior como vigentes
- [x] 9.5 Ejecutar `openspec validate gateway-api-client-foundation` y verificar que no reporta errores

## Workflow follow-up

- Revisar el diff completo y fusionar tras la revisión del equipo.
- Rotar la clave del gateway si el fichero de la colección circuló fuera del equipo.
- Archivar el change tras fusionar y verificar que existen `openspec/specs/gateway-proxy`, `api-client-core`, `auth-session` y `geo-data-conventions`.
