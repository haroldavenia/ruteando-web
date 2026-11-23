# Inventario de la API Hanoit consumida por ruteando-web

Base para planificar la migración del frontend AngularJS (`master/`) a la nueva versión de la API Hanoit.

## Alcance revisado

- `master/js/**` (sin `bower_components` ni `node_modules`): servicios `*_http.js`, controladores y modelos.
- `master/server` no existe; el servidor Node está en `server/` (raíz del repo).
- `server/server.js` **no consume la API Hanoit**: es el ejemplo de Satellizer (MongoDB `mongodb://hanoit:27017/hanoit`, `/auth/*` social login, `/api/me`) y sirve estáticos.
- `server/services/route.js` contiene un mapa `/hanoit/api/v1/*` que nadie importa (código muerto).
- Recursos locales que **no** son API Hanoit: `server/partials/*.json` (formularios de settings vía `PartialLoader`), el JSON del menú lateral, `json/visits.json` y `json/routes.json` (mocks).

## Cómo se construyen las URLs

Definidas en `master/js/custom/config/constant.js`:

| Base | URL | Dónde se define |
|------|-----|-----------------|
| OAuth / cuenta | `http://hanoit:9000` | `config().path.login`, `signup`, `forgotPassword` |
| API v1 | `http://hanoit:9000/hanoit/api/v1` | `config().path.api.*` |
| Delivery v2 | `http://app.ruteando.co:9000/hanoit/v2/delivery` | **Hardcoded** en `master/js/modules/services/osrmHttp.js` |

Autenticación:

- OAuth y cuenta: `Authorization: Basic SEFOT0lULUFQUDoxMjM0NTY=` (`HANOIT-APP:123456`); parámetros en query string.
- Resto: `Authorization: Bearer <access_token>` añadido por `authRequestInterceptor.js`.
- `authResponseInterceptor.js`: si la respuesta trae `error: invalid_token`, limpia el token y redirige a `access/login`.
- La mayoría de servicios usan `$resource`: `$save` = POST, `$delete` = DELETE `/:id`, `deleteIds` = DELETE `?ids=...`.

```mermaid
flowchart LR
  ui[AngularJS master] -->|"Basic auth"| oauth["OAuth hanoit:9000"]
  ui -->|"Bearer token"| v1["API v1 /hanoit/api/v1"]
  ui -->|"Bearer token, URL fija"| v2["Delivery v2 app.ruteando.co"]
  nodeSrv["server/server.js"] --> mongo[(MongoDB)]
```

---

## 1. Autenticación y cuenta (OAuth, `http://hanoit:9000`)

Servicio: `master/js/modules/services/authHttp.js` (`oauthHttp`).

| Método | Endpoint | Parámetros | Usado en | Para qué |
|--------|----------|------------|----------|----------|
| POST | `/oauth/token` | `grant_type=password`, `username`, `password`, `client_id`, `client_secret`, `scope=read write` | `custom/access/login_controller.js` | Login. Devuelve `access_token` y `refresh_token`, guardados por `tokenStorage.js` en `localStorage`. |
| POST | `/oauth/token` | `grant_type=refresh_token`, `refresh_token`, `client_id`, `client_secret` | `modules/controllers/main.js`, `modules/services/resincTknRefresh.js` (invocado por los controladores de listas) | Renovar el token vencido. |
| POST | `/singup` (sic) | `username`, `password`, `password_repeat` | `custom/access/register_controller.js` | Registro. El front reconoce `com.hanoit.oauth.exception.UserDuplicateException`. |
| POST | `/singup/activate` | `token` | `custom/access/activate_controller.js` (ruta `/activate/:token`) | Activar la cuenta desde el enlace del correo. |
| POST | `/forgotPassword` | `email` | `custom/access/recovery_controller.js` | Solicitar correo de recuperación. |
| POST | `/forgotPassword/reset` | `token`, `password`, `password-repeat` | `custom/access/reset_controller.js` (ruta `/reset/:token`) | Guardar la nueva contraseña. |

Nota: `$authProvider` (Satellizer) configura Facebook y Google en `modules/config.js` y `custom/config/config.js`, pero ningún controlador llama a `$auth.authenticate`.

---

## 2. Datos maestros (API v1, `/hanoit/api/v1`)

### Tipos de vehículo — `/typevehicle/:id`

Servicio: `modules/services/vehicletypes_http.js` (`VehicleTypesHttp`).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| GET | `/typevehicle` | `vehicle_types_controller.js`, `vehicle_controller.js`, `settings_form_controller.js` | Listado y combos de tipo de vehículo. |
| POST | `/typevehicle` | `vehicle_type_controller.js` | Crear tipo. |
| PUT | `/typevehicle/:id` | `vehicle_type_controller.js` | Editar tipo. |
| DELETE | `/typevehicle/:id` | `vehicle_types_controller.js` | Borrar uno. |
| DELETE | `/typevehicle?ids=` | `vehicle_types_controller.js` | Borrado múltiple. |

Para qué sirve el recurso: capacidad por tipo (`weight`, `volume`) y restricciones (`restriction.minWeight`, `maxWeight`, `minVolume`, `maxVolume`), que consume el optimizador de paquetes.

### Vehículos — `/vehicles/:id`

Servicios: `vehicles_http.js` (`VehiclesHttp`) y `vehicle_service.js` (`VehicleService`, inyectado pero sin llamadas propias).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| GET | `/vehicles` | `vehicles_controller.js`, `assigned_services_form_controller.js` | Listado de flota y combo en servicios asignados. |
| POST | `/vehicles` | `vehicle_controller.js` | Crear vehículo. |
| PUT | `/vehicles/:id` | `vehicle_controller.js` | Editar vehículo. |
| DELETE | `/vehicles/:id` | `vehicles_controller.js` | Borrar uno. |
| DELETE | `/vehicles?ids=` | `vehicles_controller.js` | Borrado múltiple. |

### Conductores — `/driver/:id`

Servicio: `drivers_http.js` (`DriversHttp`).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| GET | `/driver` | `drivers_controller.js`, `assigned_services_form_controller.js` | Listado y combo de conductores. |
| POST | `/driver` | `driver_controller.js` | Crear conductor. |
| PUT | `/driver/:id` | `driver_controller.js` | Editar conductor. |
| DELETE | `/driver/:id` | `drivers_controller.js` | Borrar uno. |
| DELETE | `/driver?ids=` | `drivers_controller.js` | Borrado múltiple. |

### Servicios asignados — `/assignedservice/:id`

Servicio: `assignedservices_http.js` (`AssignedServicesHttp`).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| POST | `/assignedservice` | `assigned_services_form_controller.js` | Asignar un conductor a un vehículo. |

El listado está roto: `assigned_services_controller.js` llama a `getAssignedServices()`, que no existe en el servicio. No hay GET funcional.

### Lugares / depósitos — `/places/:id`

Servicio: `places_http.js` (`PlacesHttp`).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| GET | `/places` | `places_controller.js`, `itinerary_controller.js` | Listado y selección del punto de partida de la jornada. |
| POST | `/places` | `places_form_controller.js` | Crear lugar. |
| PUT | `/places/:id` | `places_form_controller.js` | Editar lugar. |
| DELETE | `/places/:id` | `places_controller.js` | Borrar uno. |
| DELETE | `/places?ids=` | `places_controller.js` | Borrado múltiple. |

Para qué sirve el recurso: depósitos/bodegas (nombre, dirección, coordenadas) que se envían como `depot` a los optimizadores.

### Catálogos — `/catalogs/:id`

Servicio: `catalogs_http.js` (`CatalogsHttp`).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| GET | `/catalogs` | `catalogs_controller.js`, `catalog_controller.js` | Listado de catálogos. |
| POST | `/catalogs` | `catalog_controller.js` | Crear catálogo. |
| PUT | `/catalogs/:id` | `catalog_controller.js` | Editar catálogo. |
| DELETE | `/catalogs/:id` | `catalogs_controller.js` | Borrar uno (no hay borrado múltiple). |

### Configuraciones de ruteo — `/settings/:id`

Servicio: `settings_http.js` (`SettingsHttp`).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| GET | `/settings` | `settings_controller.js`, `itinerary_controller.js` (también inyectado en `journeys_form_controller.js`) | Listado y selección de la configuración de la jornada. |
| POST | `/settings` | `settings_form_controller.js` | Crear configuración. |
| PUT | `/settings/:id` | `settings_form_controller.js` | Editar configuración. |
| DELETE | `/settings/:id` | `settings_controller.js` | Borrar una. |
| DELETE | `/settings?ids=` | `settings_controller.js` | Borrado múltiple. |

Campos relevantes: `initTime`, `finishTime`, `roadRestrictionType` (`TIME`, `RESOURCE_TIME`, `FIXED_ROUTES`), `fixedRoutes`, `backToStartPoint`, `typeLengthOfStay` (`FIXED`, `DEFINE_ITINERARY`), `lengthOfStay`, `evaluateWeight`, `evaluateVolume`, `evaluateRestrictionPackage`, `evaluateItineraryZone`, `settingResource[]` (`typeVehicle`, `quantity`).

---

## 3. Jornadas y rutas (API v1)

### Jornadas — `/journeys/:id`

Servicio: `journeyHttp.js` (`JourneyHttp`).

| Método | Endpoint | Acción | Usado en | Para qué |
|--------|----------|--------|----------|----------|
| GET | `/journeys/summary` | `getList` | `journeys_controller.js`, `routes_controller.js`, `test_controller.js` | Resumen de jornadas optimizadas. |
| GET | `/journeys/:id` | `detail` | `journeys_controller.js`, `routes_controller.js` | Jornada completa con rutas y paradas: mapa, línea de tiempo, exportación PDF/XLSX. |
| DELETE | `/journeys/:id` | `$delete` | `journeys_controller.js` | Borrar una jornada. |
| DELETE | `/journeys?ids=` | `deleteIds` | `journeys_controller.js` | Borrado múltiple. |

Llamadas rotas o sin uso:

- `getJourneys()` (`journeys_controller.js:238`), `getChartData()` (`journeys_chart_controller.js`) y `getPlaces()` (`address_model.js`) no existen en el servicio.
- Las acciones `read` y `update` (PUT) están definidas pero no se usan.

### Carga de archivo de jornada — `/journey/upload`

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| POST (multipart) | `/journey/upload?name=<nombre>` | `journeys_form_controller.js` (`FileUploader`, token Bearer) | Subir el CSV de paradas. La respuesta `routes[0].packages` se convierte en el itinerario y se navega a `app.itinerary.list`. |

### Rutas — `/routes`

Servicio: `routes_http.js` (`RoutesHttp`).

| Método | Endpoint | Usado en | Para qué |
|--------|----------|----------|----------|
| GET | `/routes` | `visits_controller.js` | Listado de rutas en la vista de visitas. |

`read` y `update` están definidas pero no se usan. `VisitsHttp` lee el mock local `json/visits.json`.

---

## 4. Geocodificación (API v1)

| Método | Endpoint | Cuerpo | Servicio | Usado en | Para qué |
|--------|----------|--------|----------|----------|----------|
| POST | `/geocoding` | modelo del formulario de dirección | `addressHttp.geoCoding` (`addressHttp.js`) | `geocoding_form_controller.js` | Dirección → coordenadas. |
| POST | `/reverse_geocoding` | `{ location: { x: lon, y: lat } }` | `GeocodingServices.reverse` (`geocoding_services.js`) | `map_gen_latlong_controller.js`, `test_controller.js` | Coordenadas → dirección al hacer clic o mover el marcador. |

---

## 5. Optimización de rutas (Delivery v2, URL fija)

Servicio: `modules/services/osrmHttp.js`. Se invoca desde `requestServiceHttp()` en `custom/itinerary/itinerary_controller.js`; la respuesta navega a `app.routes.list` con `journey: response.data`.

Cuerpo común:

- Jornada: `nameJourney`, `routeRestrictionType`, `date` (`yyyy-MM-dd`), `numberOfRoutes`, `transport`.
- `cargoInput[]`: `id`, `_desc`, `latitude`, `longitude`, `weight`, `volume`, `unloadingTime` (segundos), `city: 'BOGOTA'` (fijo).
- `configuration`: `maxiumTime` (segundos), `startTime`, `backToDepot`, `depot` (`name`, `address`, `latitude`, `longitude`), `resource[]`, `restriction[]`.

| Método | Endpoint | Cuándo se usa | Para qué |
|--------|----------|---------------|----------|
| POST | `/optimalRouteOfPointCloud` | `FIXED_ROUTES` y `fixedRoutes == 1` | Una sola ruta óptima con todos los puntos (TSP). Envía además `timeState` y `guideNumber` por parada. |
| POST | `/optimisationForMessenger` | `FIXED_ROUTES` y `fixedRoutes > 1` | Repartir paradas entre N mensajeros, sin capacidad. |
| POST | `/optimisationForPackages` | `TIME` o `RESOURCE_TIME` | Ruteo con capacidad de peso/volumen por tipo de vehículo (`resource[]`: `maxiumWeight`, `maxiumVolume`, `quantity`) y restricciones de paquete (`restriction[]`: límites superior e inferior). Con `evaluateItineraryZone`, una llamada por zona. |

Problemas a corregir en la migración:

- `optimisationForPackages` lee el peso de `itinerary[i].weigth` (mal escrito): siempre envía `undefined`.
- En las llamadas por zona no se maneja la promesa: la respuesta se pierde.
- URL hardcoded, por `http`, fuera de `config`.
- Campos con errores ortográficos (`maxiumTime`, `maxiumWeight`, `maxiumVolume`).

`path.api.optimalRouteOfPointCloud` y `path.api.optimisationForMessenger` (bajo `/v1`) existen en `constant.js` pero no se usan.

---

## 6. Resumen para la migración

| Grupo | Operaciones activas |
|-------|---------------------|
| OAuth y cuenta | 6 |
| API v1 — CRUD (`typevehicle`, `vehicles`, `driver`, `assignedservice`, `places`, `catalogs`, `settings`, `journeys`) | 34 |
| API v1 — otros (`journey/upload`, `routes`, `geocoding`, `reverse_geocoding`) | 4 |
| Delivery v2 | 3 |
| **Total** | **47** |

Supuestos del front que la nueva API debe mantener o que hay que adaptar:

- Basic auth con `client_id`/`client_secret` expuestos en el front (ideal: moverlos al backend o usar PKCE).
- Respuestas tipo arreglo para los listados (`isArray: true`).
- Borrado múltiple con `DELETE ?ids=`.
- Errores con forma `{ error, error_description }` o `{ message }`.
- Ruta mal escrita `/singup`.

Deuda técnica a resolver antes o durante la migración:

- Métodos inexistentes: `getAssignedServices`, `getJourneys`, `getChartData`, `getPlaces`.
- Acciones `read`/`update` sin uso en `journeys` y `routes`.
- `server/services/route.js` sin uso.
- Bug `weigth` en el optimizador de paquetes.
- Host de v2 hardcoded y por `http`.

Orden de migración sugerido:

1. Centralizar las URL base en `config` (incluida v2).
2. Autenticación.
3. Datos maestros (CRUD).
4. Geocodificación.
5. Carga de archivo y optimización.
6. Jornadas y rutas.
