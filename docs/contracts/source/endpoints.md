# API Endpoints Reference

> **Versionado (ADR-004).** La superficie es **única**: **`/api/v1/*`**. No existen prefijos
> alternativos ni rutas `/hanoit/**`, y no queda ningún endpoint marcado como deprecado.
> Convenciones: filtros por **query param** (`?status=`, `?serviceType=`, `?active=`) y
> activación de tenant unificada (`PATCH /api/v1/tenants/{id}` `{active,reason}`).
>
> Todos los controllers viven en `com.hanoit.routing.controller`, usan DTOs de request/response
> dedicados y resuelven el aislamiento multitenant con el `tenantId` del JWT.
>
> **Para el SDD de frontend** este archivo es el catálogo de rutas. Los cuerpos JSON, estados
> de pantalla, roles y errores están en
> [`../frontend/migration-guide.md`](../frontend/migration-guide.md).
> Contratos de dominio: [ruteo](API_ROUTING_V3.md) · [geocoding](GEOCODING_API.md).
> Respuesta a los pendientes del frontend: [`../frontend/BACKEND_PENDIENTES_RESPUESTA.md`](../frontend/BACKEND_PENDIENTES_RESPUESTA.md).
> Mapa de corte: [`ENDPOINT_MIGRATION_MAP.md`](ENDPOINT_MIGRATION_MAP.md) ·
> decisión: [`../adr/ADR-004-rest-endpoint-conventions.md`](../adr/ADR-004-rest-endpoint-conventions.md).

## Routing engine (`/api/v1/routing`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/routing/route` | Ruta entre waypoints (OSRM single) | Authenticated |
| POST | `/api/v1/routing/matrix` | Matriz distancia/tiempo (OSRM table) | Authenticated |
| POST | `/api/v1/routing/directions` | Directions crudas (OSRM viaroute) | Authenticated |
| POST | `/api/v1/routing/nearest` | Rutas más cercanas al centro | Authenticated |
| POST | `/api/v1/routing/messenger` | Ruteo mensajeros (clustering) | Authenticated |
| POST | `/api/v1/routing/optimizations` | VRP nube de puntos (nearest-first) | Authenticated |
| POST | `/api/v1/routing/optimizations/point-route` | Ruta directa a nube de puntos | Authenticated |
| POST | `/api/v1/routing/optimizations/collection` | Ruteo de recolección con flota | Authenticated |

> Planificación persistida: `POST /api/v1/journeys/plan?mode=packages|messenger` (Journeys).
>
> Errores comunes de `nearest` y `messenger`: 400 `BAD_REQUEST` si falta un dato obligatorio
> (configuración, ubicación, depósito con ubicación, `breakTime` con inicio anterior al fin) y
> **502 `ROUTING_ENGINE_UNAVAILABLE`** si OSRM no responde. Cuerpos en [API_ROUTING_V3](API_ROUTING_V3.md).

## Positions & mobile
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/positions` | Última posición de cada conductor del tenant (de la más nueva a la más vieja) | Authenticated |
| GET | `/api/v1/positions/{driverId}` | Última posición de un conductor (404 si no ha reportado) | Authenticated |
| POST | `/api/v1/driver/positions` | Reportar la posición del conductor autenticado; devuelve 201 con la posición guardada | DRIVER |
| PUT | `/api/v1/driver/packages/report` | Reporte de entrega de un paquete (status, motivo, observación) | DRIVER |

Las posiciones se guardan en `vehicle_positions` (GeoJSON `[lon, lat]`). El conductor es el usuario
del JWT (rol `driver`); el body no lleva `driverId`. El servidor añade el `resourceId` del recurso
asignado al conductor (`resource.driverId`), si lo hay. `recordedAt` es opcional (UTC); si falta se
usa la hora del servidor.

```json
// POST /api/v1/driver/positions
{ "longitude": -74.08175, "latitude": 4.60971, "address": "Calle 26 #68-35", "recordedAt": "2026-11-19T14:35:12Z" }

// 201 / GET /api/v1/positions/{driverId}
{ "id": "…", "driverId": "…", "resourceId": "…", "longitude": -74.08175, "latitude": 4.60971,
  "address": "Calle 26 #68-35", "recordedAt": "2026-11-19T14:35:12Z" }
```

Cada posición guardada se publica además en RabbitMQ (`vehicle.exchange`, routing key
`queue.vehicle`) como canal de difusión; si el broker no responde, la posición queda guardada igual.
Cada reporte deja el audit log `driver.position.report` (`entityType: vehicle_position`, `changes {driverId, resourceId, recordedAt}`, sin coordenadas). La app reporta con alta frecuencia, así que `audit_logs` crece una fila por posición.

`PUT /api/v1/driver/packages/report` aplica las mismas reglas que
`PATCH /api/v1/packages/{id}/status/{status}`: `status` es una clave de `PackageStatus`
(`pending`, `attended`, `unattended`, `cancelled`) y `reason` una clave de
`/api/v1/package-status-reasons` que aplique a ese status. Deja el audit log `package.status.change`.

```json
// PUT /api/v1/driver/packages/report
{ "packageId": "…", "status": "unattended", "reason": "customer_absent", "observation": "Nadie en casa" }

// 200
{ "id": "…", "name": "Pedido 10432", "guideNumber": "GU-10432", "status": "unattended",
  "statusReason": "customer_absent", "observation": "Nadie en casa" }
```

Errores: 400 si el `status` no es una clave válida o el `packageId` no es un ObjectId, 404 si el
paquete no es del tenant del conductor y 422 si el motivo no existe, está inactivo o no aplica.

La asignación de vehículo y ruta del conductor se lee de `resource.driverId` y de
`GET /api/v1/driver/routes`; `/api/v1/assigned-services` y `/api/v1/driver/assignments` se retiraron.

## Admin
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/admin/geocoding-config` | Config runtime de geocoding | SUPER_ADMIN |
| PUT | `/api/v1/admin/geocoding-config` | Reemplazar config de geocoding | SUPER_ADMIN |

La configuración de geocoding es un **singleton** (colección `geocoding_config`, `_id: "global"`):
no se crea ni se borra, solo se lee y se reemplaza, por lo que no hay `{id}` en la ruta. Si no hay
configuración guardada, el primer `GET` guarda y devuelve los valores por defecto
(`BatchSecuentialMultiThreadStrategy`, 1000 direcciones y 4 hilos por proveedor).
`geocodingStrategyClassName` debe ser una clase que implemente `Strategical`; si no, 400
`BAD_REQUEST`. Cada `PUT` deja el audit log `admin.geocoding_config.update`.

No hay endpoints de migración de datos: el backend arranca en limpio sobre el modelo nuevo y los
restos del modelo legacy se borran con el runbook
[`../operations/LEGACY_DB_CLEANUP.md`](../operations/LEGACY_DB_CLEANUP.md).

## Authentication (`/api/v1/auth`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/login` | Login with email/password | Public |
| POST | `/api/v1/auth/refresh` | Rota el refresh: devuelve un par nuevo y revoca el usado | Public |
| POST | `/api/v1/auth/logout` | Invalidate refresh token | Public |
| GET | `/api/v1/auth/verify-email?token=` | Verificar email desde el enlace del correo | Public |

El alta tiene dos variantes de verificación sobre la misma ruta. `GET` es la que abre el usuario
al pulsar el enlace del correo y responde `text/html`; `POST` es la que consume la SPA y responde
`LoginResponse` en JSON, dejando la sesión iniciada. El resto del alta está en
**Fase 4 — Auth** más abajo.

`POST /auth/refresh` revoca el refresh usado y devuelve uno nuevo. Hay una sesión de refresh por
usuario, así que un login en otro dispositivo invalida el refresh anterior. Errores, siempre 401
JSON: `INVALID_TOKEN` si el token no existe, ya se rotó o se cerró sesión, y `TOKEN_EXPIRED` si
caducó (7 días). Con dos refresh en paralelo con el mismo token, uno recibe 401 `INVALID_TOKEN`:
el cliente debe hacer *single-flight*.

## Users (`/api/v1/users`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/users?role=&page=&size=&sort=` | List users (filterable by role) | TENANT_ADMIN+ |
| GET | `/api/v1/users/{id}` | Get user by ID | TENANT_ADMIN+ |
| POST | `/api/v1/users` | Create user | TENANT_ADMIN+ |
| PUT | `/api/v1/users/{id}` | Update user | TENANT_ADMIN+ |
| DELETE | `/api/v1/users/{id}` | Soft delete user | TENANT_ADMIN+ |
| GET | `/api/v1/users/drivers` | List active drivers | TENANT_ADMIN+ |

La licencia de un conductor va en `identifierValue` con `identifierType = "license"`; no hay campo
`licenseNumber`. `identifierType` es opcional y debe ser una clave de `IdentifierType`
(`citizen_id`, `itin`, `plate`, `code`, `license`); otro valor responde 400 `BAD_REQUEST`. Lo mismo aplica
al aceptar una invitación (`POST /api/v1/invitations/accept/{token}`).

## Tenants (`/api/v1/tenants`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/tenants` | List tenants | SUPER_ADMIN |
| GET | `/api/v1/tenants/{id}` | Get tenant | SUPER_ADMIN |
| GET | `/api/v1/tenants/slug/{slug}` | Get tenant by slug | SUPER_ADMIN |
| POST | `/api/v1/tenants` | Create tenant | SUPER_ADMIN |
| PUT | `/api/v1/tenants/{id}` | Replace tenant fields | SUPER_ADMIN |

`config` en `POST`/`PUT` solo acepta límites del plan. Enviar `config.defaultWeightUnit` o
`config.defaultVolumeUnit` responde **400** `VALIDATION_ERROR`: las unidades son de la plataforma
y no se configuran por tenant (ver [Unidades de medida](#unidades-de-medida-apiv1units)).

> Lifecycle: activación unificada `PATCH /api/v1/tenants/{id}` `{active,reason}` (ADR-004) y `/me`, `/me/billing` están en la sección **Fase 4 — Tenant Management** más abajo. Tenants no se eliminan físicamente: desactivar con `PATCH /api/v1/tenants/{id}` `{active:false,reason}`.

## Master Domains (`/api/v1/master-domains`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/master-domains` | List all domain catalogs | Authenticated |
| GET | `/api/v1/master-domains/{code}` | Get domain by code | Authenticated |
| GET | `/api/v1/master-domains/{code}/values` | Get values only | Authenticated |
| POST | `/api/v1/master-domains/{code}/values` | Add value | TENANT_ADMIN, SUPER_ADMIN |
| PATCH | `/api/v1/master-domains/{code}/values/{key}/toggle` | Toggle value | TENANT_ADMIN, SUPER_ADMIN |

Hay dos tipos de catálogo:

- **Respaldados por enums** (solo lectura, no se guardan en MongoDB): `OsrmProfile`, `RouteTopology`,
  `RestrictionType`, `TypeLengthOfStay`, `IdentifierType`, `ServiceType`, `PackageStatus`,
  `GeocodingStatus`, `Role`, `JourneyStatus`, `PlaceType` y `StopType`. El backend los arma desde
  sus enums, así que siempre coinciden con lo que valida: `id` es `null`, `system` es `true`, todos
  los valores vienen con `active = true` y `sortOrder` sigue el orden del enum. Las claves de `Role`
  son las mismas del JWT, en minúsculas (`super_admin`, `tenant_admin`, `agent`, `driver`).
- **Guardados en `master_domains`**: `audit_actions` (editable) y `MeasurementUnit` (solo lectura).

`GET /api/v1/master-domains` devuelve los dos tipos juntos, ordenados por `code`. Añadir o
desactivar un valor en un catálogo de solo lectura responde 422 `UNPROCESSABLE_ENTITY` con
`details {code, readOnlyCodes}`. Otros roles reciben 403 `FORBIDDEN` al escribir. Los catálogos son
**globales** (no por tenant); para motivos por tenant ver
[Package Status Reasons](#package-status-reasons-apiv1package-status-reasons).

Cada valor se serializa como `{ key, label, description, active, sortOrder }` y el catálogo como
`{ id, code, description, system, values }`.

`GET /api/v1/master-domains` y `GET /api/v1/master-domains/{code}` se cachean en Redis (JSON, TTL de
30 minutos). Añadir o desactivar un valor vacía la caché; el borrado en Redis es asíncrono y termina
milisegundos después de la respuesta. Si Redis no responde, el error se registra y la lectura va a
MongoDB, así que el endpoint sigue respondiendo 200.

## Unidades de medida (`/api/v1/units`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/units` | Unidades de la plataforma (solo informativo) | Authenticated (los 4 roles) |

El backend guarda y devuelve **todas** las magnitudes en unidades fijas de la plataforma. No se
configuran por tenant ni por usuario y el backend nunca convierte: el cliente convierte para
mostrar y vuelve a convertir antes de enviar. Los valores salen del dominio `MeasurementUnit`
(solo lectura; `key` = unidad, `category` = magnitud).

```json
{
  "weight":   { "key": "g",   "label": "Gramos",              "description": "Peso de paquetes, capacidades y restricciones" },
  "volume":   { "key": "cm3", "label": "Centímetros cúbicos", "description": "Volumen de paquetes, capacidades y restricciones" },
  "length":   { "key": "cm",  "label": "Centímetros",         "description": "Dimensiones (alto, ancho, profundidad)" },
  "distance": { "key": "m",   "label": "Metros",              "description": "Distancias de rutas, tramos y navegación" },
  "duration": { "key": "s",   "label": "Segundos",            "description": "Duraciones, estadías, turnos y descansos" },
  "dateTime": "ISO-8601 UTC"
}
```

| Magnitud | Unidad | Campos |
|---|---|---|
| Peso | `g` | `packages.weight`, `resource-types.capacity.weight`, `restriction.minWeight/maxWeight`, `routes.weightUsed`, `waypoints.weight/weightAccum`, `metrics.weightAccum`, columna `weight` del CSV |
| Volumen | `cm3` | `packages.volume`, `capacity.volume`, `restriction.minVolume/maxVolume`, `routes.volumeUsed`, `waypoints.volume/volumeAccum`, `metrics.volumeAccum`, columna `volume` del CSV |
| Dimensiones | `cm` | `packages.measure.*`, `resource-types.measure.*` |
| Distancia | `m` | `routes.distanceTraveled`, `waypoints.distance/distanceAccum`, navegación, `metrics.distance`, v3 `distance` |
| Duración | `s` | `packages.durationStay`, `settings.lengthOfStay`, `shiftDurationSec`, `breakDurationSec`, `routes.duration/avgStayTime`, `waypoints.duration/durationAccum`, `stats.*Time`, v3 `time/unloadingTime` |
| Fecha y hora | ISO-8601 UTC | Todos los `*Utc`, `createdAt`, `updatedAt`, `timeWindow.*` |

Si el dominio `MeasurementUnit` no existe, el endpoint responde las mismas claves sin `label` ni
`description`. Las unidades (`key`) salen siempre del código, aunque alguien edite el catálogo.

## Resource Types (`/api/v1/resource-types`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/resource-types` | List resource types | Authenticated |
| GET | `/api/v1/resource-types?active=true` | Active only (canónico) | Authenticated |
| GET | `/api/v1/resource-types/{id}` | Get resource type | Authenticated |
| POST | `/api/v1/resource-types` | Create resource type | Authenticated |
| PUT | `/api/v1/resource-types/{id}` | Update resource type | Authenticated |
| DELETE | `/api/v1/resource-types/{id}` | Soft delete (isActive=false); 409 si lo usan recursos | Authenticated |

## Resources (`/api/v1/resources`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/resources?resourceTypeId=&isActive=&page=&size=&sort=` | List resources (filterable) | Authenticated |
| GET | `/api/v1/resources?active=true` | Active resources (canónico) | Authenticated |
| GET | `/api/v1/resources/{id}` | Get resource | Authenticated |
| POST | `/api/v1/resources` | Create resource | Authenticated |
| PUT | `/api/v1/resources/{id}` | Update resource | Authenticated |
| DELETE | `/api/v1/resources/{id}` | Soft delete | Authenticated |
| PUT | `/api/v1/resources/{id}/driver/{driverId}` | Asignar conductor al recurso | Authenticated |
| DELETE | `/api/v1/resources/{id}/driver` | Desasignar el conductor | Authenticated |

## Places (`/api/v1/places`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/places?type=&page=&size=&sort=` | List places | Authenticated |
| GET | `/api/v1/places/nearby?lon=&lat=&maxDistance=` | Lugares cercanos a un punto | Authenticated |
| GET | `/api/v1/places/{id}` | Get place | Authenticated |
| POST | `/api/v1/places` | Create place | Authenticated |
| PUT | `/api/v1/places/{id}` | Update place | Authenticated |
| DELETE | `/api/v1/places/{id}` | Soft delete; 409 si es depósito de un recurso o inicio/fin de un settings activo | Authenticated |

`maxDistance` va en metros y por defecto es `5000`. Las coordenadas siguen el orden GeoJSON:
`lon` primero, `lat` después.

## Zones (`/api/v1/zones`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/zones` | Listar las zonas del tenant | Authenticated |
| GET | `/api/v1/zones/containing?longitude=&latitude=` | Zonas cuyo polígono cubre el punto | Authenticated |
| GET | `/api/v1/zones/{id}` | Obtener una zona | Authenticated |
| POST | `/api/v1/zones` | Crear zona | Authenticated |
| PUT | `/api/v1/zones/{id}` | Reemplazar los campos de la zona | Authenticated |
| DELETE | `/api/v1/zones/{id}` | Eliminar la zona; 409 si la refieren lugares o paquetes | Authenticated |

Una zona agrupa servicios dentro de una frontera geográfica. El `code` es único por tenant y el
borrado es **físico**, a diferencia del resto de recursos: aquí no hay soft delete.

**Request** (`POST` y `PUT`):
```json
{
  "name": "Zona Centro",
  "code": "ZC",
  "color": "#33FF57",
  "boundary": {
    "type": "Polygon",
    "coordinates": [[[-74.08, 4.60], [-74.06, 4.60], [-74.06, 4.62], [-74.08, 4.62], [-74.08, 4.60]]]
  }
}
```

| Campo | Tipo | Reglas |
|--------|------|--------|
| `name` | string | Obligatorio, máximo 100 caracteres |
| `code` | string | Alfanumérico, máximo 10 caracteres, único por tenant |
| `color` | string | Hex `#RRGGBB` |
| `boundary` | GeoJSON Polygon | Opcional. `type = "Polygon"`; al menos un anillo; cada anillo con al menos 4 posiciones `[lon, lat]` y el primer punto igual al último. Si no cumple, 400 `BAD_REQUEST` |

**Response:**
```json
{
  "id": "6650b2c3d4e5f6a7b8c9d0e1",
  "tenantId": "6650a1b2c3d4e5f6a7b8c9d0",
  "name": "Zona Centro",
  "code": "ZC",
  "boundary": {
    "type": "Polygon",
    "coordinates": [[[-74.08, 4.60], [-74.06, 4.60], [-74.06, 4.62], [-74.08, 4.62], [-74.08, 4.60]]]
  },
  "color": "#33FF57",
  "isActive": true,
  "createdAt": "2026-11-16T12:00:00Z",
  "updatedAt": "2026-11-16T12:00:00Z"
}
```

`GET /zones/containing` resuelve el polígono con `$geoIntersects` sobre el índice 2dsphere y
devuelve solo zonas del tenant del JWT. Las coordenadas van en orden GeoJSON.

`boundary` usa el mismo GeoJSON en request y response (`GeoJsonPolygonDto`). El 500 que daba
antes al enviarlo quedó corregido.

## Settings (`/api/v1/settings`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/settings?page=&size=&sort=` | List settings | Authenticated |
| GET | `/api/v1/settings?active=true` | Active settings (canónico) | Authenticated |
| GET | `/api/v1/settings/{id}` | Get setting | Authenticated |
| POST | `/api/v1/settings` | Create setting | Authenticated |
| PUT | `/api/v1/settings/{id}` | Update setting | Authenticated |
| DELETE | `/api/v1/settings/{id}` | Deactivate; 409 si lo usa una jornada no eliminada | Authenticated |

## Packages (`/api/v1/packages`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/packages?page=&size=&sort=` | List packages | Authenticated |
| GET | `/api/v1/packages?status=` | Filter by status (canónico) | Authenticated |
| GET | `/api/v1/packages?serviceType=` | Filter by service type (canónico) | Authenticated |
| GET | `/api/v1/packages/{id}` | Get package | Authenticated |
| POST | `/api/v1/packages` | Create package; 409 si el `guideNumber` ya existe en el tenant | Authenticated |
| POST | `/api/v1/packages/upload` | Upload CSV (multipart); 422 si supera el tope de filas | Authenticated |
| GET | `/api/v1/packages/upload/limits` | Tope de filas del CSV para el tenant | Authenticated |
| PUT | `/api/v1/packages/{id}` | Update package; 409 si el `guideNumber` es de otro paquete | Authenticated |
| DELETE | `/api/v1/packages/{id}` | Delete package; 409 si está en una jornada no eliminada | Authenticated |
| PATCH | `/api/v1/packages/{id}/status/{status}?reason=` | Update status (y motivo opcional) | Authenticated |

`guideNumber` es opcional y único por tenant; se guarda sin espacios a los lados y un valor vacío se guarda
como ausente. Repetido en `POST`/`PUT`: 409 `CONFLICT` con `details { "field": "guideNumber", "value" }`.
En la carga CSV un duplicado no da 409: es un error de fila dentro de la respuesta 200.

`statusReason` (opcional, en `POST`/`PUT` y en la respuesta) es la `key` de un motivo del tenant.
Debe existir, estar activo e incluir el status final del paquete en `appliesTo`; si no, 422
`UNPROCESSABLE_ENTITY` con `details { statusReason, status }`. En `PUT` es un reemplazo: omitirlo lo
borra. En `PATCH …/status/{status}`:

- con `?reason=` se valida igual que arriba;
- sin `reason`, el motivo actual se conserva solo si también aplica al nuevo status; si no, se borra.

El audit `package.status.change` guarda `before`/`after` con `{ status, reason }`.

`GET /packages/upload/limits` responde `{ "maxRows": 10000, "maxAddressesPerFile": 5000,
"effectiveLimit": 5000 }`. `effectiveLimit = min(maxRows, config.maxAddressesPerFile del tenant)`,
con 5000 si el tenant no lo define. Un CSV con más filas de datos responde 422
`UNPROCESSABLE_ENTITY` con `details { "limit": 5000, "rows": 5200 }` y no guarda nada. Formato del
CSV en [GEOCODING_API §4](GEOCODING_API.md).

## Package Status Reasons (`/api/v1/package-status-reasons`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/package-status-reasons?status=&active=` | Motivos del tenant, por `sortOrder` y `key` | Authenticated (los 4 roles) |
| POST | `/api/v1/package-status-reasons` | Crear motivo | TENANT_ADMIN, SUPER_ADMIN |
| PUT | `/api/v1/package-status-reasons/{key}` | Editar label, description, appliesTo, sortOrder | TENANT_ADMIN, SUPER_ADMIN |
| PATCH | `/api/v1/package-status-reasons/{key}/toggle` | Activar / desactivar | TENANT_ADMIN, SUPER_ADMIN |

Cada tenant define sus motivos (por qué un paquete quedó `unattended`, por qué se canceló, etc.).
No hay `DELETE`: un motivo se desactiva y los paquetes que ya lo tienen lo conservan.

```json
POST /api/v1/package-status-reasons
{ "key": "customer_absent", "label": "Cliente ausente", "description": "Nadie recibió",
  "appliesTo": ["unattended"], "sortOrder": 1 }
```

- `key`: snake_case (`^[a-z0-9_]{1,50}$`), única en el tenant e inmutable. Repetida → 409 `CONFLICT`.
- `appliesTo`: al menos un `PackageStatus`; un valor desconocido → 400 `BAD_REQUEST`.
- `?status=` también se valida contra `PackageStatus` (400). Para un select:
  `GET …?status=unattended&active=true`.
- Respuesta: `{ id, key, label, description, appliesTo, active, sortOrder, createdAt, updatedAt }`.
- Audit: `package.status_reason.create`, `.update` (con `before`/`after`) y `.toggle`.

## Journeys (`/api/v1/journeys`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/journeys/plan` | Plan journey (run algorithm) | Authenticated |
| GET | `/api/v1/journeys?page=&size=&sort=` | List journeys (summary, no routes) | Authenticated |
| GET | `/api/v1/journeys?status=` | Filter by status (canónico) | Authenticated |
| GET | `/api/v1/journeys/{id}` | Get journey detail (with routes) | Authenticated |
| DELETE | `/api/v1/journeys/{id}` | Soft delete | Authenticated |
| GET | `/api/v1/journeys/{journeyId}/navigations` | Get navigation data | Authenticated |
| GET | `/api/v1/journeys/{journeyId}/navigations/{routeIndex}` | Get specific route nav | Authenticated |
| GET | `/api/v1/journeys/{journeyId}/metrics` | Get journey metrics | Authenticated |

Cada parada (`routes[].waypoints[]`) trae `stopType = depot | delivery | pickup`. Las paradas
`delivery` y `pickup` traen `packageId` y `packageInfo {id, trackingCode, address, status}`, donde
`trackingCode` es la guía (`guideNumber`). Las `depot` traen `placeId`.

`navigations` devuelve `RouteNavigation {id, tenantId, journeyId, routeIndex, osrmVersion,
instructionsLegacy, viaPointsLegacy, legs[], snappedWaypoints[], createdAt}`. Con
`osrmVersion = "v5"` vienen `legs[] {distance, duration, summary, steps[]}` y
`steps[] {maneuver {type, modifier, location, bearingBefore, bearingAfter}, name, distance,
duration, geometry, mode}`. Con `"v4"` solo vienen `instructionsLegacy` y `viaPointsLegacy`.

## Ordenamiento (`sort`)

Los seis listados paginados aceptan `sort=campo` o `sort=campo,asc|desc` (dirección por defecto
`asc`). Un campo fuera de la lista blanca, una dirección inválida o más de dos partes responden
400 `BAD_REQUEST` con los campos permitidos en el mensaje.

| Listado | Campos permitidos | Orden sin `sort` |
|---------|-------------------|------------------|
| `GET /packages` | `createdAt`, `updatedAt`, `guideNumber`, `name`, `status`, `serviceType`, `city`, `geocodingStatus` | `createdAt,desc` |
| `GET /journeys` | `createdAt`, `updatedAt`, `name`, `status`, `totalServices`, `totalResources` | `createdAt,desc` |
| `GET /settings` | `createdAt`, `updatedAt`, `description`, `routeTopology`, `restrictionType` | `createdAt,desc` |
| `GET /users` | `createdAt`, `updatedAt`, `email`, `firstName`, `lastName`, `role`, `lastLoginAt` | `createdAt,desc` |
| `GET /places` | `name`, `type`, `createdAt`, `updatedAt` | `name,asc` |
| `GET /resources` | `name`, `licensePlate`, `createdAt`, `updatedAt` | `name,asc` |

## Semántica de `PUT`

`PUT` **sustituye** el registro: un campo omitido queda en `null` o en su valor por defecto. Se
conservan aunque no se envíen: `quantity` e `isDefault` en Resource, `osrmProfile` en
ResourceType, `pieceNumber` y `status` en Package (el estado cambia solo por `PATCH`), y la
contraseña en User (cambia solo si se envía `password`). `PUT /auth/me` y `PUT /tenants/me`
actualizan solo lo enviado.

## Borrado con referencias (409)

Un `DELETE` sobre un registro que otros registros vivos (no eliminados) aún usan responde 409
`CONFLICT` sin borrar nada. `details.referencedBy` nombra la colección que lo usa y `details.ids`
lista hasta 20 ids:

```json
{
  "error": "CONFLICT",
  "message": "Place is still referenced by settings; remove those references first",
  "details": { "referencedBy": "settings", "ids": ["6650c3d4e5f6a7b8c9d0e1f2"] },
  "timestamp": "2026-11-17T12:00:00Z",
  "path": "/api/v1/places/6650b2c3d4e5f6a7b8c9d0e1"
}
```

| Se borra | `referencedBy` posibles |
|----------|-------------------------|
| Tipo de recurso | `resources` (`resourceTypeId`) |
| Lugar | `resources` (`depotId`), `settings` activos (`placeStartId` o `placeEndId`) |
| Settings | `journeys` (`settingsId`) |
| Zona | `places`, `packages` (`zoneId`) |
| Paquete | `journeys` (`routes.waypoints.packageId`) |

## Driver Routes (`/api/v1/driver`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/driver/routes` | Driver's assigned routes | DRIVER |
| GET | `/api/v1/driver/routes/{journeyId}/{routeIndex}` | Route detail with nav | DRIVER |

## Geocoding (`/api/v1`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/geocoding` | Forward geocoding (address → coords) | Authenticated |
| POST | `/api/v1/reverse-geocoding` | Reverse geocoding (coords → address) | Authenticated |

## Response Format

### Paginated Response
```json
{
  "content": [...],
  "totalElements": 150,
  "totalPages": 8,
  "page": 0,
  "size": 20
}
```

### Error Response
```json
{
  "error": "NOT_FOUND",
  "message": "Settings not found: 6650a1b2c3d4e5f6a7b8c9d0",
  "timestamp": "2026-04-15T13:00:00Z",
  "path": "/api/v1/settings/6650a1b2c3d4e5f6a7b8c9d0",
  "details": null
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Request body fails Jakarta Bean Validation (`@NotNull`, `@NotBlank`, etc.) |
| 400 | `BAD_REQUEST` | Invalid argument or malformed request |
| 400 | `INVALID_OTP` | Código OTP incorrecto. `details.attemptsRemaining` con intentos disponibles (F4-10) |
| 400 | `INVALID_TOKEN` | Token de verificación o de restablecer inexistente o ya usado |
| 400 | `TOKEN_EXPIRED` | Token de verificación (24 h) o de restablecer (1 h) caducado |
| 400 | `EMAIL_NOT_VERIFIED` | Login antes de confirmar email |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT (cuerpo JSON `ErrorResponse`) |
| 401 | `INVALID_TOKEN` | `POST /auth/refresh` con refresh inexistente, revocado o ya rotado |
| 401 | `TOKEN_EXPIRED` | `POST /auth/refresh` con refresh caducado |
| 401 | `INVALID_CREDENTIALS` | Login con email/password incorrectos (F4-08, mensaje genérico para no revelar enumeración) |
| 401 | `ACCOUNT_DISABLED` | Login a cuenta desactivada (`active=false`) o tenant inactivo (F4-08) |
| 403 | `FORBIDDEN` | Insufficient permissions o cross-tenant access denied |
| 404 | `NOT_FOUND` | Resource not found by ID |
| 409 | `CONFLICT` | Clave única duplicada, o borrado de un registro en uso (`details {referencedBy, ids}`) |
| 409 | `EMAIL_ALREADY_EXISTS` | Registro o invitación con email ya usado en el tenant |
| 409 | `SEAT_LIMIT_EXCEEDED` | Crear/activar/invitar usuario excede `seatLimit` del tenant (F4-06/09) |
| 410 | `OTP_EXPIRED` | OTP expirado por TTL (5 min). Usuario debe pedir nuevo (F4-10) |
| 410 | `INVITATION_TOKEN_GONE` | Token de invitación expirado, revocado o ya consumido (F4-06) |
| 422 | `UNPROCESSABLE_ENTITY` | Request válido que la lógica rechaza: CSV sobre el tope (`details {limit, rows}`), catálogo de solo lectura (`details {code, readOnlyCodes}`) |
| 422 | `MAX_ATTEMPTS_EXCEEDED` | OTP: superado `otp.max-attempts` (default 3). Pedir nuevo OTP (F4-10). El 429 de verify es otro tope: 5 llamadas / 15 min |
| 422 | `MAX_RESENDS` | OTP: superado el máximo de reenvíos (3). Esperar TTL (F4-10) |
| 422 | `ENTERPRISE_PLAN_SELF_SERVICE` | Intento de checkout/upgrade a plan ENTERPRISE vía self-service (F4-07) |
| 422 | `SEAT_DECREASE_BLOCKED` | Reducir asientos por debajo de `seatUsed` (F4-07/09) |
| 423 | `ACCOUNT_LOCKED` | Login con lockout activo. `details.lockedUntil` ISO-8601 (F4-08) |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit excedido. Header `Retry-After` con segundos hasta refill (F4-08/10) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `ROUTING_ENGINE_UNAVAILABLE` | OSRM no respondió en `routing/nearest` o `routing/messenger` |
| 502 | `STRIPE_INTEGRATION_ERROR` | Error invocando la API de Stripe (timeouts, webhooks ya procesados, etc.) (F4-07) |

### GeoJSON Point Format

Location fields use standard GeoJSON `[longitude, latitude]`:
```json
{
  "type": "Point",
  "coordinates": [-75.5636, 6.2518]
}
```

Used in: `PlaceSummary.location`, `PackageRequest.location`, `PlaceRequest.location`

---

## Fase 4 — Endpoints Nuevos

### Auth — Registration & Password Management (`/api/v1/auth`) — F4
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/register` | Self-service signup (crea tenant + user) | Public |
| POST | `/api/v1/auth/verify-email` | Verificar email con token | Public |
| POST | `/api/v1/auth/resend-verification` | Reenviar email de verificación | Public |
| POST | `/api/v1/auth/forgot-password` | Solicitar reset de contraseña | Public |
| POST | `/api/v1/auth/reset-password` | Resetear con token | Public |
| PUT | `/api/v1/auth/change-password` | Cambiar contraseña (requiere password actual) | Authenticated |
| GET | `/api/v1/auth/me` | Perfil del usuario actual | Authenticated |
| PUT | `/api/v1/auth/me` | Actualizar perfil propio | Authenticated |

### Tenant Management (`/api/v1/tenants`) — F4 ampliado
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| PATCH | `/api/v1/tenants/{id}` | **Activación unificada** `{active,reason}` (canónico) | SUPER_ADMIN |
| GET | `/api/v1/tenants/me` | Mi tenant (datos + billing + seat usage) | TENANT_ADMIN |
| PUT | `/api/v1/tenants/me` | Actualizar datos de mi tenant | TENANT_ADMIN |
| PUT | `/api/v1/tenants/me/billing` | Actualizar billing info | TENANT_ADMIN |

`GET /tenants/me` incluye `config` con los límites del plan (`maxDeposits`, `maxDrivers`,
`maxRoutesMonthly`, `maxAdmins`, `maxAddressesPerFile`, `maxGeocodedAddresses`,
`maxDefaultResources`). No trae unidades: son de la plataforma y se consultan en
[`GET /api/v1/units`](#unidades-de-medida-apiv1units).

### User Invitations (`/api/v1/invitations`) — F4
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/invitations` | Enviar invitación por email | TENANT_ADMIN |
| GET | `/api/v1/invitations?status=pending` | Listar invitaciones del tenant | TENANT_ADMIN |
| DELETE | `/api/v1/invitations/{id}` | Revocar invitación pendiente | TENANT_ADMIN |
| POST | `/api/v1/invitations/{token}/resend` | Reenviar email de invitación | TENANT_ADMIN |
| GET | `/api/v1/invitations/accept/{token}` | Validar token (preview) | Public |
| POST | `/api/v1/invitations/accept/{token}` | Aceptar invitación + crear cuenta | Public |

### User Management (`/api/v1/users`) — F4 ampliado
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/users/{id}/reset-password` | Forzar reset de password (envía email Brevo, invalida refresh tokens) | TENANT_ADMIN |

> Activación / desactivación / cambio de rol se realizan vía `PUT /api/v1/users/{id}` (campo `active`, campo `role`). El `SeatEnforcementService` libera el asiento al pasar `active=false` y bloquea con `409 SEAT_LIMIT_EXCEEDED` al pasar `active=true` si no hay cupo. Eliminar (`DELETE /api/v1/users/{id}`) hace soft delete (`deletedAt`) y libera asiento.

### Billing & Subscriptions (`/api/v1/billing`) — F4
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/billing/subscription` | Estado actual de suscripción (404 si no existe) | TENANT_ADMIN |
| POST | `/api/v1/billing/checkout` | Crear Stripe Checkout Session (nueva suscripción, 201) | TENANT_ADMIN |
| POST | `/api/v1/billing/portal` | Crear Stripe Customer Portal session | TENANT_ADMIN |
| POST | `/api/v1/billing/upgrade` | Cambiar plan y/o intervalo (monthly↔annual) | TENANT_ADMIN |
| PUT | `/api/v1/billing/seats` | Aumentar/disminuir cantidad de asientos (Stripe quantity) | TENANT_ADMIN |
| POST | `/api/v1/billing/cancel` | Programar cancelación al fin del período (downgrade a FREE) | TENANT_ADMIN |
| GET | `/api/v1/billing/invoices` | Listar facturas recientes desde Stripe | TENANT_ADMIN |
| GET | `/api/v1/billing/usage` | Uso actual (limites, cuota mensual rutas, %, trial) | TENANT_ADMIN |
| POST | `/api/v1/webhooks/stripe` | Stripe webhook receiver (verificado con signature) | Public* |

### Notifications — Brevo (`/api/v1/notifications`) — F4
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/notifications/push/register` | Registrar device token (FCM via Brevo) | Authenticated |
| DELETE | `/api/v1/notifications/push/unregister` | Eliminar device token | Authenticated |
| POST | `/api/v1/notifications/otp/send` | Enviar OTP por SMS o email | Public |
| POST | `/api/v1/notifications/otp/resend` | Reenviar OTP por canal alternativo | Public |
| POST | `/api/v1/notifications/otp/verify` | Verificar código OTP | Public |
| GET | `/api/v1/notifications/preferences` | Preferencias de notificación | Authenticated |
| PUT | `/api/v1/notifications/preferences` | Actualizar preferencias | Authenticated |

### Audit Logs (`/api/v1/audit-logs`) — F4
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/audit-logs?page=&size=&action=&entityType=&actorId=` | Logs del tenant (filtrable por actor) | TENANT_ADMIN |
| GET | `/api/v1/audit-logs/me?page=&size=&action=&entityType=` | Mi actividad (sin IP) | Authenticated |
| GET | `/api/v1/audit-logs/{id}` | Detalle de un log | TENANT_ADMIN |
| GET | `/api/v1/audit-logs/admin?page=&size=&action=&entityType=&tenantId=&actorId=` | Logs globales cross-tenant | SUPER_ADMIN |

Las tres rutas de listado devuelven `PageResponse` (`content`, `totalElements`, `totalPages`,
`page`, `size`), igual que el resto de la API; ya no devuelven `number` ni `pageable`.

> Filtros temporales `dateFrom`/`dateTo` no están expuestos en el controller actual. Ver [`docs/flows/AUDIT_LOG_FLOW.md`](../flows/AUDIT_LOG_FLOW.md) para el detalle de actores, esquema `changes` por acción y privacidad.

---

## Security Hardening — F4-08

### Rate Limiting (Bucket4j + Redis)

Backend distribuido (Bucket4j 8.17 + Redis vía Lettuce). Cuando se excede la capacidad, el servidor responde `429 Too Many Requests` con header `Retry-After` (segundos hasta el próximo refill) y body:

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Try again in 875 seconds.",
  "timestamp": "2026-04-23T18:12:00Z",
  "path": "/api/v1/auth/login"
}
```

Reglas registradas en `RateLimitRule`:

| Endpoint | Capacidad | Ventana | Key |
|---|---|---|---|
| POST `/api/v1/auth/login` | 5 | 15 min | IP + `email` (body) |
| POST `/api/v1/auth/register` | 3 | 1 h | IP |
| POST `/api/v1/auth/forgot-password` | 3 | 1 h | `email` (body) |
| POST `/api/v1/auth/verify-email` | 5 | 15 min | IP |
| POST `/api/v1/invitations` | 20 | 1 h | `tenantId` (JWT) |
| POST `/api/v1/notifications/otp/send` | 3 | 1 h | `recipient` (body) |
| POST `/api/v1/notifications/otp/resend` | 2 | 1 h | `otpId` (body) |
| POST `/api/v1/notifications/otp/verify` | 5 | 15 min | `otpId` (body) |

`X-Forwarded-For` se respeta para la IP cuando viene de un reverse proxy. Toggle global: `app.security.rate-limit.enabled` (default `true`).

### Account Lockout

Aplicado por `AccountLockoutService` en el flujo de `POST /api/v1/auth/login`:

| Intentos fallidos | Acción |
|---|---|
| 5 | Bloqueo 15 min |
| 10 | Bloqueo 1 h |
| 20+ | Bloqueo 24 h + email Brevo al `TENANT_ADMIN` (template `account-locked-admin`) |
| Login OK | Reset `loginAttempts=0`, `lockedUntil=null` |

Login durante bloqueo:

```http
HTTP/1.1 423 Locked
Content-Type: application/json

{
  "error": "ACCOUNT_LOCKED",
  "message": "Account is locked until 2026-04-24T18:12:00Z",
  "details": { "lockedUntil": "2026-04-24T18:12:00Z" },
  "timestamp": "2026-04-23T18:12:00Z",
  "path": "/api/v1/auth/login"
}
```

Cada intento fallido emite un audit log `auth.login.failed` con metadata `{ email, attempts, reason: "bad_password" | "account_locked", lockedUntil? }`.

### Security Headers

Configurados en `SecurityConfig` para todas las respuestas:

| Header | Valor |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |

---

## Notifications — OTP, Push y Preferences (F4-10)

### Autorización

| Endpoint | Auth |
|---|---|
| `POST /api/v1/notifications/otp/{send,resend,verify}` | Public (`permitAll`) |
| `POST /api/v1/notifications/push/register`, `DELETE /api/v1/notifications/push/unregister` | Authenticated |
| `GET/PUT /api/v1/notifications/preferences` | Authenticated |

### POST /api/v1/notifications/otp/send

**Request:**

```json
{ "recipient": "+57300111222", "channel": "sms", "purpose": "phone_verification" }
```

- `channel` ∈ `sms | email`
- `purpose` ∈ `phone_verification | login_2fa | email_2fa`
- Si `channel = sms` → `recipient` debe ser E.164 (`^\+\d{10,15}$`).
- Si `channel = email` → `recipient` email válido. Se envía aunque no exista un `RoutingUser` con ese email (silent send por privacidad).

**Response 200:**

```json
{
  "otpId": "5f9d…",
  "expiresInSeconds": 300,
  "channel": "sms",
  "message": "Código OTP enviado al número terminado en **1222."
}
```

### POST /api/v1/notifications/otp/resend

**Request:**

```json
{ "otpId": "5f9d…", "channel": "email", "recipient": "user@example.com" }
```

Regenera código pero **preserva la expiración original** (`expiresInSeconds` = tiempo restante). Cambia canal y `recipient`. Mensaje: `"Código OTP reenviado a u***@example.com"`.

### POST /api/v1/notifications/otp/verify

**Request:** `{ "otpId": "5f9d…", "code": "123456" }` (`code` debe matchear `^\d{6}$`).

| Status | Body | Origen |
|---|---|---|
| 200 | `{ "verified": true }` | OK |
| 400 | `{ "error": "INVALID_OTP", "message", "details": { "attemptsRemaining": N }, "timestamp" }` | Construido en controller |
| 410 | `{ "error": "OTP_EXPIRED", ... }` | `OtpExpiredException` |
| 422 | `{ "error": "MAX_ATTEMPTS_EXCEEDED", ... }` | `OtpMaxAttemptsException` |
| 429 | `{ "error": "RATE_LIMIT_EXCEEDED", ... }` + header `Retry-After` | `OtpRateLimitException` o filtro F4-08 |

Verificación channel-agnostic: solo requiere `otpId + code`.

### POST /api/v1/notifications/push/register

**Request:** `{ "deviceToken": "fcm-…", "platform": "android|ios|web" }`

**Response 200:** `{ "registered": true, "deviceCount": N }` (N ≤ 5).

- Idempotente: si el token ya existe, actualiza `platform` y `registeredAt`.
- **FIFO max 5** por usuario: el más antiguo por `registeredAt` se descarta.
- Llama `BrevoNotificationService.registerDeviceToken(user.email, token, platform)`.
- Audit `notification.push.registered` con `{ platform, deviceCount }`.

### DELETE /api/v1/notifications/push/unregister

**Request:** `{ "deviceToken": "fcm-…" }`
**Response:** `204 No Content` (idempotente — limpia Brevo aunque el token no esté en local).

### GET/PUT /api/v1/notifications/preferences

`GET` devuelve `NotificationPreferencesDto` (defaults sin persistir si nunca se actualizó):

```json
{
  "email":  { "billing": true,  "security": true, "product": true,  "invitations": true },
  "sms":    { "otp": true,      "alerts": false },
  "push":   { "routeUpdates": true, "journeyCompleted": true, "billing": false }
}
```

`PUT` aplica **merge parcial** (solo campos no-`null`). `sms.otp` es **inmutable**: cualquier patch que lo ponga en `false` se ignora silenciosamente y se fuerza a `true` antes de persistir. Devuelve el objeto completo resultante. Audit `notification.preferences.updated` con `details` = solo los campos efectivamente cambiados (clave dot-notation, ej. `"email.product": false`).
