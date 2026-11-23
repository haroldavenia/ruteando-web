# Endpoint Migration Map — `/api/v1/*`

> Estado: **migración ejecutada** (ADR-004). Sin producción/clientes → corte limpio.
> Superficie **única**: `/api/v1/*`. El prefijo sin versión `/api/*` fue **eliminado**
> (controllers migrados nativamente a `@RequestMapping("/api/v1/...")`, sin filtro de alias).
>
> Este archivo describe el corte del **backend** (controllers y paths Java). No es el
> inventario del AngularJS: las 47 llamadas vivas de `master/js`, con los paths reales
> del front (`/typevehicle`, `/driver`, `/reverse_geocoding`, los tres POST de delivery v2),
> están en [`../frontend/migration-guide.md`](../frontend/migration-guide.md) §16.

## 1. Cambios de contrato ejecutados

| Antes (removido) | Ahora (único, `/api/v1`) |
|---|---|
| `GET /api/packages/status/{status}` | `GET /api/v1/packages?status=` |
| `GET /api/packages/service-type/{serviceType}` | `GET /api/v1/packages?serviceType=` |
| `GET /api/journeys/status/{status}` | `GET /api/v1/journeys?status=` |
| `GET /api/resources/active` | `GET /api/v1/resources?active=true` |
| `GET /api/resource-types/active` | `GET /api/v1/resource-types?active=true` |
| `GET /api/settings/active` | `GET /api/v1/settings?active=true` |
| `PATCH /api/tenants/{id}/activate` | `PATCH /api/v1/tenants/{id}` `{ "active": true }` |
| `PATCH /api/tenants/{id}/deactivate` | `PATCH /api/v1/tenants/{id}` `{ "active": false, "reason": "..." }` |
| `PATCH /api/tenants/{id}/toggle-active` | `PATCH /api/v1/tenants/{id}` `{ "active": <bool> }` |

Se conserva `PATCH /api/v1/packages/{id}/status/{status}` (parche de estado, no filtro).

## 2. Legacy `/hanoit/api/v1/*` removido (con equivalente)

| Legacy removido | Reemplazo `/api/v1` |
|---|---|
| `CatalogController` `/hanoit/api/v1/catalogs*` | `/api/v1/master-domains*` |
| `DriverController` `/hanoit/api/v1/drivers*` | `/api/v1/users*` |
| `TypeVehicleController` `/hanoit/api/v1/typevehicles*` | `/api/v1/resource-types*` |
| `SettingController` `/hanoit/api/v1/settings*` | `/api/v1/settings*` |
| `PlaceController` `/hanoit/api/v1/places*` | `/api/v1/places*` |
| `JourneyController` `/hanoit/api/v1/journeys*` | `/api/v1/journeys*` |
| `RouteController` `/hanoit/api/v1/routes*` | `/api/v1/journeys/{id}` (rutas embebidas) |
| `GeocodingController` `/hanoit/api/v1/geocoding*` | `/api/v1/geocoding`, `/api/v1/reverse-geocoding` |
| `FileUploadController` `/hanoit/api/v1/journey/upload`, `/reverse_geocoding` | `/api/v1/packages/upload`, `/api/v1/reverse-geocoding` |

## 3. Superficie `/api/v1` por dominio

Auth, Users, Tenants, Invitations, Billing, Notifications, Audit Logs, Packages, Places,
Resources, Resource Types, Settings, Zones, Journeys, Driver Routes, Geocoding, Master Domains,
Routing Engine (`/api/v1/routing/*`), Positions, Driver Reports, Webhooks (`/api/v1/webhooks/stripe`),
Admin (`/api/v1/admin/geocoding-config`).

## 4. Legacy eliminado (2026-07-18)

OAuth stack (`/auth/*`, `/oauth/*`, `/hanoit/api/v1/user/*`), paquete `com.hanoit.oauth`, y paths
`/hanoit/v2|v3/*` migrados a `/api/v1/routing/*`. Ver `docs/api/LEGACY_SUNSET_PLAN.md`.

## 5. Unificación de paquetes y contratos (2026-11-13)

Cierre de la migración: desaparecen `com.hanoit.controller.api.rest.v1|v2` y
`com.hanoit.routing.v3.{single,nearest,messenger}.controller`. **Todos los controllers viven en
`com.hanoit.routing.controller`**, exponen DTOs dedicados y se aíslan por el `tenantId` del JWT.

| Antes (removido) | Ahora (único, `/api/v1`) |
|---|---|
| `GET /api/v1/driver/positions/{driverId}` | `GET /api/v1/positions/{driverId}` |
| `GET /api/v1/assigned-services/summary` | — (sin consumidores; el recurso entero se retiró en §7) |
| `GET /api/v1/admin/geocoding-config/{id}` | `GET /api/v1/admin/geocoding-config` |
| `PUT /api/v1/admin/geocoding-config/{id}` | `PUT /api/v1/admin/geocoding-config` |
| `POST`, `DELETE` de `geocoding-config` | — (el recurso es un singleton) |

`POST /api/v1/driver/positions` cambia de contrato: antes devolvía cuerpo vacío y solo publicaba
en RabbitMQ; ahora persiste la posición y responde `201` con el recurso creado.
Ver `docs/api/LEGACY_SUNSET_PLAN.md` §2.

## 6. Pendientes del frontend: cambios de contrato (2026-11-17)

Mismas rutas; cambian respuestas y reglas. Detalle por ítem en
[`../frontend/BACKEND_PENDIENTES_RESPUESTA.md`](../frontend/BACKEND_PENDIENTES_RESPUESTA.md).

| Ruta | Antes | Ahora |
|---|---|---|
| `POST /api/v1/auth/refresh` | Mismo refresh, seguía valiendo; error 401 texto | Refresh nuevo y el usado revocado; 401 JSON `INVALID_TOKEN` / `TOKEN_EXPIRED` |
| Cualquier ruta protegida | 401/403 con cuerpo de texto | 401 `UNAUTHORIZED` / 403 `FORBIDDEN` en `ErrorResponse` |
| `GET /api/v1/audit-logs`, `/me`, `/admin` | `Page` de Spring (`number`) | `PageResponse` (`page`) |
| `GET /api/v1/tenants/me` | Sin `config` | Con `config` (solo límites del plan; las unidades están en `GET /api/v1/units`) |
| `POST /api/v1/journeys/plan` | 400 con ids hexadecimales; paradas `service` sin paquete | 201; paradas `delivery`/`pickup` con `packageId` y `packageInfo` |
| `POST /api/v1/routing/nearest`, `/messenger` | 500 | 400 en validaciones, 502 `ROUTING_ENGINE_UNAVAILABLE` si cae OSRM |
| `POST`/`PUT /api/v1/zones` | `boundary` daba 500 | `boundary` GeoJSON `Polygon` validado (400 si es inválido) |
| `POST /api/v1/packages/upload` | 400 sin mensaje | 200 con errores por línea; 400 con mensaje; 422 sobre el tope |
| — | — | Nueva: `GET /api/v1/packages/upload/limits` |
| Listados de packages, journeys, places, resources, settings, users | `sort` ignorado | `sort=campo,asc\|desc` con lista blanca; 400 si el campo no está |
| `DELETE` de resource-types, places, settings, zones, packages | 204 aunque estuviera en uso | 409 `CONFLICT` `{referencedBy, ids}` si está en uso |
| `POST`/`PATCH /api/v1/master-domains/{code}/values…` | Cualquier usuario autenticado | Solo `tenant_admin` y `super_admin`; 422 en dominios respaldados por enums |

### 6.1 Unidades de medida fijas (2026-11-18)

| Ruta | Antes | Ahora |
|---|---|---|
| — | — | Nueva: `GET /api/v1/units` (los 4 roles): peso `g`, volumen `cm3`, dimensiones `cm`, distancia `m`, duración `s`, fechas ISO-8601 UTC |
| `POST`/`PUT /api/v1/tenants` | `config.defaultWeightUnit` (`g\|kg\|lb`) y `defaultVolumeUnit` (`cm3\|m3\|l`) aceptados | 400 `VALIDATION_ERROR` si se envían |
| `GET /api/v1/tenants`, `/{id}`, `/me` | `config.defaultWeightUnit`, `config.defaultVolumeUnit` | Ya no vienen |
| `POST`/`PATCH /api/v1/master-domains/MeasurementUnit/values…` | — | 422: dominio de solo lectura |

## 7. Retiro del legacy (2026-11-19)

El sistema arranca en limpio: no hay migración de datos y se eliminaron `com.hanoit.service.core`,
`com.hanoit.repository.mongo`, las entidades legacy de `com.hanoit.business.object` y los runners de
corrección al arrancar. Las rutas retiradas responden **404** `NOT_FOUND`. Las colecciones legacy se
borran con [`../operations/LEGACY_DB_CLEANUP.md`](../operations/LEGACY_DB_CLEANUP.md).

| Ruta | Antes | Ahora |
|---|---|---|
| `/api/v1/assigned-services*` | CRUD de servicios asignados (colección `assignedService`) | 404. El conductor se asigna en el recurso (`PUT /api/v1/resources/{id}/driver/{driverId}`) |
| `GET /api/v1/driver/assignments` | Asignaciones del conductor | 404. Usar `GET /api/v1/driver/routes` |
| `/api/v1/admin/migrate`, `/{step}`, `/validate` | Migración legacy → multitenant | 404 |
| `POST /api/v1/driver/positions` | Body con `driverId`; colección `positionVehicle`; respuesta con `date` | Sin `driverId` (sale del JWT); `recordedAt` opcional (UTC); se guarda en `vehicle_positions` y se publica en RabbitMQ. Respuesta `{id, driverId, resourceId, longitude, latitude, address, recordedAt}` |
| `GET /api/v1/positions`, `/{driverId}` | Lectura de `positionVehicle` | Última posición por conductor del tenant; 404 si el conductor no reportó |
| `PUT /api/v1/driver/packages/report` | `status` legacy sobre la colección `package` | `status` clave de `PackageStatus` + `reason` (motivo del tenant) sobre `packages`; audit `package.status.change` |
| `GET`/`PUT /api/v1/admin/geocoding-config` | Colección `globalConfiguration` | Singleton `geocoding_config` (`_id: "global"`); 400 si la clase no es una estrategia |
