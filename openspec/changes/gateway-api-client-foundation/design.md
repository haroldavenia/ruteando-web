# Design

## Context

Fuente: colección Postman "HanoIT Gateway — Public API" (133 peticiones ejecutables, 116 con capturas reales de éxito). Base `https://wk-hanoit.riomify.com`, rutas `/api/v1/...`. Ver `proposal.md` para la motivación.

**Contrato observado**

| Aspecto | Observado en la colección |
|---|---|
| Clave de API | Cabecera `X-Api-Key` en las 133 peticiones, además de `Authorization: Bearer` en las autenticadas (17 son públicas, sin auth) |
| Sesión | `POST /auth/login` y `/auth/refresh` devuelven `{accessToken, refreshToken, expiresIn (s), user{id,email,role,tenantId,...}}`; el refresco devuelve un `refreshToken` nuevo |
| Roles | `super_admin`, `tenant_admin`, `driver`; endpoints marcados "Required access: DRIVER" o "TENANT_ADMIN or SUPER_ADMIN" |
| Multi-tenant | Cada entidad lleva `tenantId`; `zones` exige `?tenantId=` |
| Paginación | `{content, page, size, totalElements, totalPages}` con `page` desde 0 (`places`, `journeys`, `users`...); otras listas devuelven arrays (`master-domains`, `users/drivers`, `driver/routes`, `navigations`, `assigned-services/summary`) |
| Coordenadas | GeoJSON `[lon, lat]` en `location` y `waypoints[].coordinates` |
| Geometría de ruta | `routes[].geoJson` es una **polilínea codificada de precisión 5** en orden lat,lng (verificado: decodifica a 4.61, -74.08, Bogotá; con precisión 6 queda fuera de rango). Llega ya des-escapada por JSON; el truco de `replace(/\\\\/g, '\\')` del legacy no hace falta |
| Planificación | `POST /journeys/plan {settingsId, packageIds, name}` → jornada con `routes[]` (`routeIndex`, `resource`, `distanceTraveled`, `duration`, `waypoints[]` con `stopType` depot/service) |
| Errores | La colección solo contiene respuestas 2xx (200, 201, 202, 204); el formato de error no está documentado |

**Defectos y vacíos del contrato (condicionan el diseño)**

| Endpoint / aspecto | Situación | Consecuencia |
|---|---|---|
| `POST /packages/upload` (CSV) | Captura real devuelve 400; no hay cuerpo válido de ejemplo | Bloquea el alta de jornadas por CSV; hace falta el contrato o un plan B |
| `POST /geocoding`, `/reverse-geocoding` | Sin cuerpo ni respuesta capturados (requieren proveedor local) | La fase de direcciones no puede modelarse aún |
| `POST /routing/nearest`, `/routing/messenger` | HTTP 500 en peticiones válidas ("defecto heredado") | No se consumen |
| `POST /routing/optimizations/collection` | HTTP 200 con estado de negocio 207 | No se consume; si se necesitara, hay que leer el estado del cuerpo |
| `GET /driver/assignments` | 503 en la captura | Fuera de alcance |
| `GET /positions`, `/assigned-services/summary` | 202 con `[]` | Se acepta 202 como éxito con cuerpo posiblemente vacío |
| `GET /journeys/{id}/navigations` | `id`, `tenantId` y `journeyId` serializados como `{date, timestamp}`; `instructionsLegacy` formato OSRM v4 | Se tratan como opacos; se identifica por `routeIndex` |
| `admin/migrate*`, STOMP `/vpget`..., `/send-mail` | "Decisión de migración pendiente" | Fuera de alcance |
| Stripe (`billing/*`, `webhooks/stripe`) | Marcado "Not implemented" | Fuera de alcance |

**Seguridad de la colección.** El fichero recibido contiene en sus variables una clave de gateway literal y credenciales de prueba. Ninguno de esos valores se copia a este repositorio ni a los artefactos. Si el fichero circuló fuera del equipo, conviene rotar la clave.

**Estado de partida del frontend** (tras `upgrade-angular-21-ng-ruteando` y `consolidate-ng-ruteando`): `ng-ruteando` con Angular 21, Material M3, `TokenStorageService` seguro en SSR, `apiUrl` por entorno y proxy de desarrollo `proxy.conf.json`; `server/server.js` publica el build y reserva `/api/*` y `/auth/*` para sus rutas Satellizer.

## Goals / Non-Goals

**Goals:**
- Que ninguna feature futura tenga que saber de `X-Api-Key`, tokens, refresco, errores HTTP, paginación ni orden de coordenadas.
- Un contrato tipado y verificado con fixtures reales, con un único punto de cambio si el gateway publica su OpenAPI.
- Un mapeo explícito legacy → gateway que ordene las fases de negocio.

**Non-Goals:**
- Pantallas y componentes de feature, el generador de listas de F2 o el mapa.
- Facturación, notificaciones, invitaciones, tenants, auditoría, STOMP y vistas de conductor.
- Cambiar el backend ni resolver sus defectos.

## Decisions

### 1. Arquitectura

```
 Navegador (Angular 21)                 server/server.js (Express)             Gateway
 +------------------------+  /gateway/*  +--------------------------+  /api/v1/*  +-----------------+
 | feature pages          |------------->| gateway-proxy            |------------>| wk-hanoit...    |
 |   |                    |  Bearer      |  - quita X-Api-Key cliente| + X-Api-Key |  /api/v1        |
 | data-access (*.api.ts) |              |  - inyecta X-Api-Key(env) |  + Bearer   +-----------------+
 |   |                    |              |  - streaming multipart    |
 | core/api (HttpClient   |              +--------------------------+
 |  + interceptores)      |              | static ng-ruteando/browser|  (rutas /api/* y /auth/* del
 | core/auth  core/geo    |              | SPA fallback              |   Satellizer siguen siendo del
 +------------------------+              +--------------------------+   propio Express)
 ng serve: proxy.conf.js replica /gateway -> gateway con la misma clave (env)
```

```
 features/<x>/                core/api                         core/auth            core/geo
  pages, stores (signals)      API_BASE_URL (/gateway)          AuthService          LatLng, mappers
        |                      authInterceptor  -------------->  TokenStorageService   polyline5 decode
        v                      refreshInterceptor (single-flight) CurrentUser (signal)
  data-access/<x>.api.ts       errorInterceptor -> ApiError      authGuard, roleGuard
  (DTO -> domain mappers)      Page<T>, PageParams
```

### 2. Proxy del gateway en lugar de exponer la clave
La clave viaja en `X-Api-Key` en todas las peticiones; en un SPA cualquiera puede leerla del bundle o de la pestaña de red. Se monta `/gateway` en Express con una librería de proxy HTTP, reescribe `^/gateway` → `/api/v1`, `changeOrigin`, `X-Api-Key` desde `GATEWAY_API_KEY`, destino desde `GATEWAY_URL` (por defecto el host de la colección), y borra cualquier `X-Api-Key` o `Host` que mande el cliente. Se registra **antes** de `bodyParser` (para no consumir el cuerpo ni romper el multipart de `/packages/upload`), antes del estático y del comodín del SPA. Responde 502 con mensaje estable si el gateway no responde, y 500 con aviso en el log si falta la clave al arrancar (el servidor sigue arrancando, como con Mongo).
Alternativas: (a) poner la clave en `environment.ts`, descartada: se confirmó que la clave es un secreto; (b) servidor SSR de Angular como BFF, descartado porque `consolidate-ng-ruteando` publica la versión de navegador. **Decisión confirmada: la clave es un secreto y solo existe en el servidor.**

### 3. Entorno y desarrollo
`apiUrl` es `/gateway` en desarrollo y producción; `proxy.conf.json` pasa a `proxy.conf.js` para leer `GATEWAY_API_KEY` y `GATEWAY_URL` de `process.env`. `.env.example` lista los nombres; `.env` va a `.gitignore`; el servidor lo carga solo en desarrollo si existe.

### 4. Interceptores funcionales (`core/api`)
Orden: `authInterceptor` → `refreshInterceptor` → `errorInterceptor`.
- **auth:** añade `Authorization: Bearer` solo a peticiones a `API_BASE_URL`, excepto la lista de rutas públicas (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/resend-verification`, `/invitations/accept/*`). Corrige el defecto del legacy que podía mandar `Bearer ` vacío.
- **refresh:** ante un 401 en una petición autenticada, dispara **una sola** petición `POST /auth/refresh` compartida entre todas las peticiones concurrentes (`BehaviorSubject` o `shareReplay`), guarda los dos tokens nuevos y reintenta cada petición **una vez**. Si el refresco falla o no hay token de refresco, borra la sesión y navega a `/acceso` con `returnUrl`. Además, si `expiresAt` queda a menos de 30 s, refresca antes de enviar. El refresco no se aplica a las propias rutas de `/auth/*`.
- **error:** convierte `HttpErrorResponse` en `ApiError {status, code, message, details, raw}`. El formato de error del gateway no está documentado, así que el cuerpo se lee de forma tolerante (`code`, `error`, `message`, `detail`) y se conserva en `details` y `raw`, pero **el texto que ve el usuario es un mensaje genérico en español según el estado** (decisión confirmada): 400 "La solicitud no es válida", 401 "Tu sesión no es válida o ha caducado", 403 "No tienes permiso para realizar esta acción", 404 "No se encontró el recurso solicitado", 5xx "El servicio no está disponible, inténtalo más tarde", `status 0` (`network`) "No hay conexión con el servidor". Sin `alert` ni efectos de UI: la notificación la decide cada feature con `MatSnackBar`.
  **Mensajes personalizables.** El mensaje final se resuelve con esta prioridad, de mayor a menor: (1) un mensaje indicado en la propia petición mediante un `HttpContextToken` (`withErrorMessage({400: '...'})`), (2) un registro de mensajes por `code` del backend o por estado, ampliable con `provideApiErrorMessages({...})` en la configuración de la app o de una feature, (3) el genérico por estado. Así se puede ir personalizando un error concreto sin tocar el interceptor ni conocer aún el formato de error del gateway.

### 5. Modelos y cliente
Interfaces TypeScript escritas a mano en `core/api/models/` a partir de los ejemplos capturados, con todos los campos opcionales del gateway como `T | null`. Cada entidad con su `*.api.ts` (`places`, `zones`, `resource-types`, `resources`, `settings`, `packages`, `master-domains`, `journeys`, `assigned-services`, `users`) que expone `Observable` tipados y no conoce la UI. No se dispone del OpenAPI del gateway (la colección cita `OPENAPI-AUDIT.md` y `openapi-audit.json`, que no existen para este proyecto), así que los modelos se escriben a mano y los fixtures reales son su única verificación. Si algún día se publica, se generan los tipos con un generador de OpenAPI a TypeScript y se sustituyen los ficheros de modelos sin cambiar los `*.api.ts`. `packages.api.ts` **no incluye la subida de CSV** en este change (ver Risks).

### 6. Paginación
`Page<T>` y `PageParams {page, size}` (0-based). Las listas que devuelven arrays se tipan como `T[]`. El generador de listas de F2 debe soportar paginación de servidor además de la local del legacy; no se conocen parámetros de filtro ni orden (solo `page` y `size` aparecen en la colección), de modo que el filtro por texto se aplica en cliente sobre la página cargada hasta que el gateway documente otra cosa.

### 7. Geografía (`core/geo`)
`LatLng {lat, lng}` como tipo de dominio. Funciones puras: `fromGeoJsonPoint([lon,lat])`, `toGeoJsonPoint`, `toOlCoordinate`, `decodePolyline5(str): LatLng[]`. Prueba con la muestra real de Bogotá (primer punto cerca de 4.61, -74.08). El campo `geoJson` de las rutas se expone en el dominio como `geometry` para no inducir a error. Evita la mezcla `x/y`, `latitude/longitude` y `[lon,lat]` del legacy (`address.location.x/y`, `cargoInput.latitude`).

### 8. Sesión y acceso (`core/auth`)
`AuthService` (`login`, `refresh`, `logout`, `loadProfile` con `GET /auth/me`), `CurrentUser` como signal `{id, email, role, tenantId, ...} | null`, `authGuard` (redirige a `/acceso`) y `roleGuard(roles)`. `TokenStorageService` gana `expiresAt` como valor público (y el refresco anticipado lo usa). El `tenantId` del usuario actual lo inyectan los `*.api.ts` que lo requieren (`zones`). `logout` llama a `POST /auth/logout`, y el cliente limpia la sesión aunque la llamada falle. El token de refresco sigue en `localStorage` (decisión de `consolidate-ng-ruteando`); pasarlo a cookie `httpOnly` mediante el proxy queda como mejora posible y no cambia las interfaces.

### 9. Mapeo legacy → gateway para las fases de negocio

| Legacy | Gateway | Cambios de modelo relevantes |
|---|---|---|
| `access/*` | `auth/login`, `register` (crea tenant), `refresh`, `logout`, `verify-email`, `forgot-password`, `reset-password`, `change-password` | Email en lugar de usuario; registro con `tenantName`; verificación de email |
| `vehicle_types` | `resource-types` | `category`, `osrmProfile`, `capacity`, `measure`, `restriction`, `gasMileage` |
| `vehicles` | `resources` | Referencia `resourceTypeId`, `depotId`, turno (`shiftStartUtc`, `shiftDurationSec`, `breakDurationSec`), `driverId` con `PUT /resources/{id}/driver/{driverId}` |
| `drivers` | `users` con rol `driver` (`GET /users/drivers`, `POST /users`) | El conductor es un usuario con login |
| `places` | `places` | `location` GeoJSON Point, `type` (depot...), `GET /places/nearby` |
| (nuevo) | `zones` | Polígono `boundary`, `GET /zones/containing`, exige `tenantId` |
| `catalogs` | `master-domains` y `/{code}/values` (con `toggle`) | Fuente de etiquetas de enumeraciones |
| `settings` | `settings` | `routeTopology`, `restrictionType`, `fixedRoutes`, `resourceIds`, `placeStartId/EndId`; sustituye la lista de tipos de vehículo con `quantity` por recursos concretos |
| `itinerary` + CSV | `packages` + `POST /packages/upload` | El paquete es persistente (`status`, `location`, `weight`, `volume`, `durationStay`, `timeWindow`); la corrección de coordenadas pasa a `PUT /packages/{id}` |
| `journeys` + `osrmHttp` | `POST /journeys/plan`, `GET /journeys`, `GET/DELETE /journeys/{id}`, `/metrics`, `/navigations` | La optimización es de servidor; no se porta `osrmHttp` ni su payload |
| `routes` | `journey.routes[]` | `geoJson` polilínea 5, `waypoints[]` con `stopType`; `processRoute` y sus instrucciones OSRM v4 no se portan (hay `distance` y `duration` por waypoint) |
| `visits` | `waypoints` + `PUT /driver/packages/report` | El reporte es acción de conductor |
| `assigned_services` | `assigned-services` | `vehicle`, `route`, `driver`, `state`, `executionDate` |
| `address`/`geocoding` | `geocoding`, `reverse-geocoding`, `admin/geocoding-config` | Contrato pendiente |
| `maps` (posiciones) | `positions`, `positions/{driverId}` | Sondeo periódico; sin STOMP |

Los enumerados (`routeTopology`, `osrmProfile`, estados de paquete, tipos de lugar) se cargan de `master-domains` con caché en memoria y valores por defecto locales para el arranque sin red, en lugar de constantes fijas.

### 10. Pruebas
`scripts/extract-gateway-fixtures.mjs <ruta-colección>` toma el primer ejemplo de éxito de cada petición y escribe JSON saneado en `ng-ruteando/src/testing/fixtures/gateway/` (se descartan tokens, `gateway_api_key` y credenciales; se verifica con búsqueda de cadenas antes de confirmar). Cada `*.api.ts` tiene un spec con `HttpTestingController` y esos fixtures, comprobando URL, método, cuerpo y forma de la respuesta. Los interceptores se prueban con peticiones simuladas (401 concurrentes → un solo refresco; refresco fallido → logout y redirección; ruta pública sin cabecera). El proxy se prueba con un servidor de gateway falso local: inyecta la clave, borra la del cliente, deja pasar multipart y devuelve 502 si el destino cae.

### 11. Orden de ejecución respecto del roadmap
Este change va después de `consolidate-ng-ruteando` y sustituye a la parte de infraestructura de F1. F1 pasa a ser solo las pantallas de acceso (login, registro, verificación, recuperación). Las fases de catálogos, ajustes y jornadas se apoyan en el mapeo del punto 9.

## Risks / Trade-offs

- [La clave se trata como secreto y quizá es pública] → proxy por defecto; si es pública se simplifica (punto 2).
- [Formato de error no documentado] → mensajes genéricos por estado y lectura tolerante del cuerpo; la personalización por petición o por `code` queda abierta para cuando haya capturas de 4xx/5xx.
- [Subida de CSV con 400 y sin contrato, que además el usuario no tiene] → queda fuera de este change. La fase de jornadas parte del plan B: parsear el CSV en el navegador, validarlo y crear paquetes con `POST /packages` (N peticiones y validación duplicada) hasta que exista el contrato de `POST /packages/upload`.
- [Geocodificación sin cuerpo capturado] → no se modela hasta tener contrato; la edición manual de coordenadas en mapa sí es posible con `PUT /packages/{id}`.
- [Refresco con rotación] → si dos pestañas refrescan a la vez, la segunda puede recibir un token ya invalidado: se maneja como refresco fallido (logout) y se anota para revisar con el backend si hay tolerancia a reutilización.
- [Proxy en Express carga con tráfico del gateway] → streaming sin almacenar cuerpos y tiempos de espera explícitos; si crece, se mueve a un proxy inverso del despliegue sin cambiar el frontend.
- [Dos servidores en desarrollo (Angular y Express) con la misma clave] → una sola variable de entorno compartida y un `.env.example`.
- [Modelos escritos a mano divergen del backend] → fixtures reales en los tests y sustitución por tipos generados cuando exista OpenAPI.
- [Paginación solo por página y tamaño] → filtros en servidor quedan fuera hasta que se documenten.

## Migration Plan

1. Prerrequisitos: `upgrade-angular-21-ng-ruteando` y `consolidate-ng-ruteando` terminados.
2. Rama `feat/gateway-api-client-foundation`. Orden: proxy del servidor y de desarrollo → `core/api` e interceptores → `core/geo` → `core/auth` → `*.api.ts` y fixtures → verificación contra el gateway real con una cuenta de prueba (nunca con la cuenta de administrador de producción).
3. Rollback: revertir la rama; el servidor sigue sirviendo el frontend sin proxy.

## Open Questions

- ¿Cuál es el formato de error del gateway? Solo afecta a qué `code` se registran para mensajes personalizados; el mecanismo ya está previsto y los genéricos funcionan sin saberlo.
- ¿Cuál es el contrato de `POST /packages/upload`? Se decide en la fase de jornadas; este change no depende de él.
