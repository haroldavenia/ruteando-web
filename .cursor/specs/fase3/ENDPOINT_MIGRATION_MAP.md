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
Routing Engine (`/api/v1/routing/*`), Assigned Services, Positions, Webhooks (`/api/v1/webhooks/stripe`),
Admin (`/api/v1/admin/migrate`, `/api/v1/admin/geocoding-config`).

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
| `GET /api/v1/assigned-services/summary` | — (sin consumidores) |
| `DELETE /api/v1/assigned-services?ids=` | `DELETE /api/v1/assigned-services/{id}` |
| `GET /api/v1/admin/geocoding-config/{id}` | `GET /api/v1/admin/geocoding-config` |
| `PUT /api/v1/admin/geocoding-config/{id}` | `PUT /api/v1/admin/geocoding-config` |
| `POST`, `DELETE` de `geocoding-config` | — (el recurso es un singleton) |

`POST /api/v1/driver/positions` cambia de contrato: antes devolvía cuerpo vacío y solo publicaba
en RabbitMQ; ahora persiste la posición y responde `201` con el recurso creado.
Ver `docs/api/LEGACY_SUNSET_PLAN.md` §2.
