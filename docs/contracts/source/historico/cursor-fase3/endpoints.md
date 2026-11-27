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

## Positions & mobile
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/positions` | Posiciones GPS de la flota del tenant | Authenticated |
| GET | `/api/v1/positions/{driverId}` | Última posición de un conductor | Authenticated |
| POST | `/api/v1/driver/positions` | Reportar posición; persiste y devuelve el recurso creado | DRIVER |
| GET | `/api/v1/driver/assignments` | Asignación activa del conductor para hoy | DRIVER |
| PUT | `/api/v1/driver/packages/report` | Reporte de entrega de un paquete | DRIVER |

La consulta de la última posición es única: `GET /api/v1/positions/{driverId}` sirve tanto al
panel como a la app móvil. `POST /api/v1/driver/positions` guarda la posición y además la publica
en la cola `queue.vehicle`, que funciona solo como canal de difusión hacia consumidores externos.

## Assigned services (`/api/v1/assigned-services`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/assigned-services` | Listar asignaciones del tenant | Authenticated |
| GET | `/api/v1/assigned-services/{id}` | Obtener una asignación | Authenticated |
| POST | `/api/v1/assigned-services` | Crear asignación (conductor + fecha) | Authenticated |
| PUT | `/api/v1/assigned-services/{id}` | Actualizar asignación | Authenticated |
| DELETE | `/api/v1/assigned-services/{id}` | Eliminar asignación | Authenticated |

Una asignación es única por conductor y fecha: si se crea una que ya existe para ese par, se
actualiza la existente en lugar de duplicarla.

## Admin
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/admin/geocoding-config` | Config runtime de geocoding | SUPER_ADMIN |
| PUT | `/api/v1/admin/geocoding-config` | Reemplazar config de geocoding | SUPER_ADMIN |
| POST | `/api/v1/admin/migrate` | Ejecutar todos los pasos de migración | SUPER_ADMIN |
| POST | `/api/v1/admin/migrate/{step}` | Ejecutar un paso concreto | SUPER_ADMIN |
| GET | `/api/v1/admin/migrate/validate` | Conteo por colección tras migrar | SUPER_ADMIN |

La configuración de geocoding es un **singleton**: no se crea ni se borra, solo se lee y se
reemplaza, por lo que no hay `{id}` en la ruta.

La migración transforma las colecciones heredadas al esquema nuevo. Cada paso es **idempotente**,
así que puede relanzarse sin duplicar datos. Las dos rutas `POST` devuelven un resumen
`{ "paso": resultado }` y `validate` devuelve `{ "coleccion": conteo }`.

## Authentication (`/api/v1/auth`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/login` | Login with email/password | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| POST | `/api/v1/auth/logout` | Invalidate refresh token | Public |
| GET | `/api/v1/auth/verify-email?token=` | Verificar email desde el enlace del correo | Public |

El alta tiene dos variantes de verificación sobre la misma ruta. `GET` es la que abre el usuario
al pulsar el enlace del correo y responde `text/html`; `POST` es la que consume la SPA y responde
`LoginResponse` en JSON, dejando la sesión iniciada. El resto del alta está en
**Fase 4 — Auth** más abajo.

## Users (`/api/v1/users`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/users?role=&page=&size=` | List users (filterable by role) | TENANT_ADMIN+ |
| GET | `/api/v1/users/{id}` | Get user by ID | TENANT_ADMIN+ |
| POST | `/api/v1/users` | Create user | TENANT_ADMIN+ |
| PUT | `/api/v1/users/{id}` | Update user | TENANT_ADMIN+ |
| DELETE | `/api/v1/users/{id}` | Soft delete user | TENANT_ADMIN+ |
| GET | `/api/v1/users/drivers` | List active drivers | TENANT_ADMIN+ |

## Tenants (`/api/v1/tenants`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/tenants` | List tenants | SUPER_ADMIN |
| GET | `/api/v1/tenants/{id}` | Get tenant | SUPER_ADMIN |
| GET | `/api/v1/tenants/slug/{slug}` | Get tenant by slug | SUPER_ADMIN |
| POST | `/api/v1/tenants` | Create tenant | SUPER_ADMIN |
| PUT | `/api/v1/tenants/{id}` | Replace tenant fields | SUPER_ADMIN |

> Lifecycle: activación unificada `PATCH /api/v1/tenants/{id}` `{active,reason}` (ADR-004) y `/me`, `/me/billing` están en la sección **Fase 4 — Tenant Management** más abajo. Tenants no se eliminan físicamente: desactivar con `PATCH /api/v1/tenants/{id}` `{active:false,reason}`.

## Master Domains (`/api/v1/master-domains`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/master-domains` | List all domain catalogs | Authenticated |
| GET | `/api/v1/master-domains/{code}` | Get domain by code | Authenticated |
| GET | `/api/v1/master-domains/{code}/values` | Get values only | Authenticated |
| POST | `/api/v1/master-domains/{code}/values` | Add value | Authenticated |
| PATCH | `/api/v1/master-domains/{code}/values/{key}/toggle` | Toggle value | Authenticated |

## Resource Types (`/api/v1/resource-types`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/resource-types` | List resource types | Authenticated |
| GET | `/api/v1/resource-types?active=true` | Active only (canónico) | Authenticated |
| GET | `/api/v1/resource-types/{id}` | Get resource type | Authenticated |
| POST | `/api/v1/resource-types` | Create resource type | Authenticated |
| PUT | `/api/v1/resource-types/{id}` | Update resource type | Authenticated |
| DELETE | `/api/v1/resource-types/{id}` | Soft delete (isActive=false) | Authenticated |

## Resources (`/api/v1/resources`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/resources?resourceTypeId=&isActive=&page=&size=` | List resources (filterable) | Authenticated |
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
| GET | `/api/v1/places?type=&page=&size=` | List places | Authenticated |
| GET | `/api/v1/places/nearby?lon=&lat=&maxDistance=` | Lugares cercanos a un punto | Authenticated |
| GET | `/api/v1/places/{id}` | Get place | Authenticated |
| POST | `/api/v1/places` | Create place | Authenticated |
| PUT | `/api/v1/places/{id}` | Update place | Authenticated |
| DELETE | `/api/v1/places/{id}` | Soft delete | Authenticated |

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
| DELETE | `/api/v1/zones/{id}` | Eliminar la zona | Authenticated |

Una zona agrupa servicios dentro de una frontera geográfica. El `code` es único por tenant y el
borrado es **físico**, a diferencia del resto de recursos: aquí no hay soft delete.

**Request** (`POST` y `PUT`):
```json
{
  "name": "Zona Centro",
  "code": "ZC",
  "color": "#33FF57"
}
```

| Campo | Tipo | Reglas |
|--------|------|--------|
| `name` | string | Obligatorio, máximo 100 caracteres |
| `code` | string | Alfanumérico, máximo 10 caracteres, único por tenant |
| `color` | string | Hex `#RRGGBB` |
| `boundary` | GeoJSON Polygon | Coordenadas en orden `[lon, lat]`; el primer y el último punto deben coincidir para cerrar el polígono |

**Response:**
```json
{
  "id": "6650b2c3d4e5f6a7b8c9d0e1",
  "tenantId": "6650a1b2c3d4e5f6a7b8c9d0",
  "name": "Zona Centro",
  "code": "ZC",
  "boundary": null,
  "color": "#33FF57",
  "isActive": true,
  "createdAt": "2026-11-16T12:00:00Z",
  "updatedAt": "2026-11-16T12:00:00Z"
}
```

`GET /zones/containing` resuelve el polígono con `$geoIntersects` sobre el índice 2dsphere y
devuelve solo zonas del tenant del JWT. Las coordenadas van en orden GeoJSON.

> **Limitación conocida.** `boundary` se mapea al tipo `GeoJsonPolygon` de Spring Data, que
> Jackson no sabe deserializar, así que enviarlo en el cuerpo de `POST` o `PUT` devuelve **500**.
> Hoy las fronteras solo pueden cargarse directamente en MongoDB; una vez almacenadas,
> `GET /zones/containing` las consulta con normalidad.

## Settings (`/api/v1/settings`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/settings?page=&size=` | List settings | Authenticated |
| GET | `/api/v1/settings?active=true` | Active settings (canónico) | Authenticated |
| GET | `/api/v1/settings/{id}` | Get setting | Authenticated |
| POST | `/api/v1/settings` | Create setting | Authenticated |
| PUT | `/api/v1/settings/{id}` | Update setting | Authenticated |
| DELETE | `/api/v1/settings/{id}` | Deactivate | Authenticated |

## Packages (`/api/v1/packages`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/packages?page=&size=` | List packages | Authenticated |
| GET | `/api/v1/packages?status=` | Filter by status (canónico) | Authenticated |
| GET | `/api/v1/packages?serviceType=` | Filter by service type (canónico) | Authenticated |
| GET | `/api/v1/packages/{id}` | Get package | Authenticated |
| POST | `/api/v1/packages` | Create package | Authenticated |
| POST | `/api/v1/packages/upload` | Upload CSV (multipart) | Authenticated |
| PUT | `/api/v1/packages/{id}` | Update package | Authenticated |
| DELETE | `/api/v1/packages/{id}` | Delete package | Authenticated |
| PATCH | `/api/v1/packages/{id}/status/{status}` | Update status | Authenticated |

## Journeys (`/api/v1/journeys`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/journeys/plan` | Plan journey (run algorithm) | Authenticated |
| GET | `/api/v1/journeys?page=&size=` | List journeys (summary, no routes) | Authenticated |
| GET | `/api/v1/journeys?status=` | Filter by status (canónico) | Authenticated |
| GET | `/api/v1/journeys/{id}` | Get journey detail (with routes) | Authenticated |
| DELETE | `/api/v1/journeys/{id}` | Soft delete | Authenticated |
| GET | `/api/v1/journeys/{journeyId}/navigations` | Get navigation data | Authenticated |
| GET | `/api/v1/journeys/{journeyId}/navigations/{routeIndex}` | Get specific route nav | Authenticated |
| GET | `/api/v1/journeys/{journeyId}/metrics` | Get journey metrics | Authenticated |

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
| 400 | `TOKEN_EXPIRED` | Refresh / verification / reset token expirado o desconocido (F4-03/05/08) |
| 400 | `EMAIL_NOT_VERIFIED` | Login antes de confirmar email |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 401 | `INVALID_CREDENTIALS` | Login con email/password incorrectos (F4-08, mensaje genérico para no revelar enumeración) |
| 401 | `ACCOUNT_DISABLED` | Login a cuenta desactivada (`active=false`) o tenant inactivo (F4-08) |
| 403 | `FORBIDDEN` | Insufficient permissions o cross-tenant access denied |
| 404 | `NOT_FOUND` | Resource not found by ID |
| 409 | `CONFLICT` | Duplicate key violation (unique constraint) |
| 409 | `EMAIL_ALREADY_EXISTS` | Registro o invitación con email ya usado en el tenant |
| 409 | `SEAT_LIMIT_EXCEEDED` | Crear/activar/invitar usuario excede `seatLimit` del tenant (F4-06/09) |
| 410 | `OTP_EXPIRED` | OTP expirado por TTL (5 min). Usuario debe pedir nuevo (F4-10) |
| 410 | `INVITATION_TOKEN_GONE` | Token de invitación expirado, revocado o ya consumido (F4-06) |
| 422 | `UNPROCESSABLE_ENTITY` | Request es válido pero la lógica de negocio lo rechaza |
| 422 | `MAX_ATTEMPTS_EXCEEDED` | OTP: superado `otp.max-attempts` (default 3). Pedir nuevo OTP (F4-10). El 429 de verify es otro tope: 5 llamadas / 15 min |
| 422 | `MAX_RESENDS` | OTP: superado el máximo de reenvíos (3). Esperar TTL (F4-10) |
| 422 | `ENTERPRISE_PLAN_SELF_SERVICE` | Intento de checkout/upgrade a plan ENTERPRISE vía self-service (F4-07) |
| 422 | `SEAT_DECREASE_BLOCKED` | Reducir asientos por debajo de `seatUsed` (F4-07/09) |
| 423 | `ACCOUNT_LOCKED` | Login con lockout activo. `details.lockedUntil` ISO-8601 (F4-08) |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit excedido. Header `Retry-After` con segundos hasta refill (F4-08/10) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
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
