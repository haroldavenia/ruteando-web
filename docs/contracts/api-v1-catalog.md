# Catálogo `/api/v1` para el frontend

> Canónico: [`source/migration-guide.md`](source/migration-guide.md). Este índice resume reglas y mapea dominios a specs.

Detalle de cada ruta: [`source/endpoints.md`](source/endpoints.md) · ruteo y jornadas: [`source/API_ROUTING_V3.md`](source/API_ROUTING_V3.md). Este índice añade lo que las specs necesitan y está verificado contra fixtures.

## Reglas transversales
- Base relativa `/api/v1` (ADR-F001). `Authorization: Bearer <accessToken>`.
- Página: `{ content, totalElements, totalPages, page, size }` (base 0, size 20), también en `audit-logs`.
- Listas planas (sin página): `zones`, `assigned-services`, `master-domains`, `users/drivers`, `journeys/{id}/navigations`, `positions`.
- Borrado por lote: `POST /{recurso}/batch-delete {ids}` (máx. 100, 200 con `results[]`) en places, resource-types, resources, settings, users y journeys.
- Filtros por query (`status`, `serviceType`, `active`, `role`, `type`, `resourceTypeId`, `isActive`). `sort=campo,asc|desc` con lista blanca en packages, journeys, settings, users, places y resources (400 si no está permitido).
- Unidades fijas de plataforma (`GET /units`): peso g, volumen cm³, longitud cm, distancia m, duración s. El cliente convierte para mostrar y capturar.
- `PUT` sustituye el registro (excepciones: `quantity`/`isDefault` de Resource, `osrmProfile`, `pieceNumber`/`status` de Package, `password` de User). Borrar algo en uso: 409 `details{referencedBy, ids}`.
- Refresh rota en cada uso (una sesión por usuario); 401 de seguridad en JSON.
- Ids ObjectId 24 hex; id mal formado → 400 `BAD_REQUEST`.
- GeoJSON `[lon, lat]` en `location`, `boundary`, `waypoints[].coordinates`. `routes[].geoJson` = polilínea codificada precisión 5.
- Unidades: metros, segundos, % 0–100. Fechas `Instant` UTC.
- Sin borrado múltiple: una petición por id.
- Las rutas legacy (`/oauth`, `/auth/*` sin versión, `/hanoit/**`) responden **403**: no hay convivencia.
- `role` en JSON siempre en minúsculas (`super_admin|tenant_admin|agent|driver`); el dominio `Role` solo da etiquetas.
- Teléfonos en E.164 (`+573001234567`). Contraseña: ≥16, mayúscula, minúscula, dígito y `@$!%*?&`.
- Excepciones de fecha: `executionDate` de asignaciones `YYYY-MM-DD`; `timeInit` del messenger `HH:mm:ss`.
- Sesión: access token (1 h) en memoria; refresh (7 días) persistido; claims `sub`, `tenantId`, `role`; no enviar `tenantId` en cuerpos.

## Roles (migration-guide §2)
| Módulo | super_admin | tenant_admin | agent |
|---|:-:|:-:|:-:|
| Lugares, zonas, recursos, tipos, settings, paquetes, jornadas, geocoding, ruteo, posiciones, asignaciones | ✔ | ✔ | ✔ |
| Mi empresa, facturación, invitaciones, auditoría del tenant | | ✔ | |
| Usuarios (incl. conductores) | ✔ | ✔ | |
| Tenants, auditoría global, migración, config de geocoding | ✔ | | |
| Perfil, preferencias, push, mi actividad | ✔ | ✔ | ✔ |
`driver` solo usa la app móvil.

## Dominios → specs
| Dominio | Rutas | Spec(s) |
|---|---|---|
| Auth | `/auth/login, refresh, logout, register, verify-email (POST), resend-verification, forgot-password, reset-password, change-password, me (GET/PUT)` | ACC-001…ACC-004 |
| Users | `/users` CRUD, `?role=`, `/users/drivers`, `/users/{id}/reset-password` | MAE-003, EMP-001 |
| Tenants | `/tenants` CRUD, `/slug/{slug}`, `PATCH {active,reason}`, `/me`, `/me/billing` | EMP-003, PLA-001 |
| Invitations | `/invitations`, `?status=`, `DELETE /{id}`, `/{token}/resend`, `/accept/{token}` GET/POST | EMP-002 |
| Billing | `/billing/subscription, checkout, portal, upgrade, seats, cancel, invoices, usage` | EMP-004 |
| Notifications | `/notifications/preferences`, `/otp/send|resend|verify`, `/push/register|unregister` | EMP-005 |
| Audit | `/audit-logs`, `/me`, `/{id}`, `/admin`; `dateFrom`/`dateTo` UTC inclusivos | EMP-006, PLA-002 |
| Master domains | `/master-domains`, `/{code}`, `/{code}/values` GET/POST, `/{code}/values/{key}/toggle` | FND-003, MAE-007 |
| Resource types | `/resource-types` CRUD, `?active=true` | MAE-001 |
| Resources | `/resources` CRUD + filtros, `PUT /{id}/driver/{driverId}`, `DELETE /{id}/driver` | MAE-002 |
| Places | `/places` CRUD, `?type=`, `/nearby?lon=&lat=&maxDistance=` | MAE-005 |
| Zones | `/zones` CRUD, `/containing?longitude=&latitude=` | MAE-006 |
| Assigned services | **Retirado (404)**: el vehículo del conductor es el recurso con `driverId` | MAE-002 |
| Geocoding | `POST /geocoding`, `POST /reverse-geocoding` | MAE-004 |
| Settings | `/settings` CRUD, `?active=true` (DELETE = desactivar) | PAQ-001 |
| Packages | `/packages` CRUD, `?status=`, `?serviceType=`, `?q=`, `PATCH /{id}/status/{status}?reason=`, `PATCH /status` (lote), `POST /upload`, `GET /upload/limits` | PAQ-002, PAQ-003, JOR-006 |
| Journeys | `POST /journeys/plan?mode=packages|messenger[&async=true]`, `GET /plan/jobs/{jobId}`, list, `?status=`, `/{id}`, `/{id}/package-statuses`, DELETE, `POST /batch-delete`, `/navigations`, `/navigations/{routeIndex}`, `/metrics` | JOR-001…JOR-006 |
| Routing engine | `/routing/route, directions, matrix, nearest, messenger, optimizations, optimizations/point-route, optimizations/collection` | JOR-007 |
| Positions | `GET /positions`, `GET /positions/{driverId}` | SEG-001 |
| Admin | `/admin/geocoding-config` GET/PUT (`/admin/migrate*` retirado) | PLA-003 |
| Unidades | `GET /units` | FND-003 |
| Motivos de estado | `/package-status-reasons` GET/POST, `PUT /{key}`, `PATCH /{key}/toggle` | MAE-009 (uso en PAQ-002, JOR-006) |
| Fuera de alcance | `/driver/*`, `POST /driver/positions`, `/webhooks/stripe`, `GET /auth/verify-email` | — |

## Errores
| HTTP | `error` | Tratamiento en UI (clave i18n `errors.<code>`) |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Marcar campos de `details`; «Revisa los datos» |
| 400 | `BAD_REQUEST` | Mensaje genérico; id mal formado = «registro no válido» |
| 400 | `PASSWORD_POLICY_VIOLATION` | Política real: ≥16 caracteres, mayúscula, minúscula, dígito y `@$!%*?&` |
| 400 | `INVALID_TOKEN` / `TOKEN_EXPIRED` | Enlace no válido o caducado + acción de reenviar |
| 400 | `EMAIL_NOT_VERIFIED` | Ofrecer reenviar verificación |
| 400 | `INVALID_OTP` | `details.attemptsRemaining` |
| 401 | `UNAUTHORIZED` | Renovar sesión una vez; si falla, login |
| 401 | `INVALID_TOKEN` / `TOKEN_EXPIRED` (en refresh) | Fin de sesión → login |
| 502 | `ROUTING_ENGINE_UNAVAILABLE` | Motor de rutas caído: reintentar |
| 401 | `INVALID_CREDENTIALS` | «Correo o contraseña incorrectos» (sin enumeración) |
| 401 | `ACCOUNT_DISABLED` | Cuenta o empresa desactivada |
| 403 | `FORBIDDEN` | Pantalla/acción sin permiso |
| 404 | `NOT_FOUND` | «El registro ya no existe» + volver al listado |
| 409 | `CONFLICT` / `EMAIL_ALREADY_EXISTS` / `SEAT_LIMIT_EXCEEDED` | Mensaje específico por pantalla |
| 410 | `OTP_EXPIRED` / `INVITATION_TOKEN_GONE` | Pedir nuevo código / invitación |
| 422 | `UNPROCESSABLE_ENTITY`, `MAX_ATTEMPTS_EXCEEDED`, `MAX_RESENDS`, `ENTERPRISE_PLAN_SELF_SERVICE`, `SEAT_DECREASE_BLOCKED` | Mensaje de negocio |
| 423 | `ACCOUNT_LOCKED` | «Bloqueada hasta {lockedUntil}» |
| 429 | `RATE_LIMIT_EXCEEDED` | «Inténtalo en {Retry-After}» y desactivar el botón |
| 500 | `INTERNAL_ERROR` | Genérico + reintentar |
| 502 | `STRIPE_INTEGRATION_ERROR` | Facturación no disponible |
| 502/503/504 (proxy) | — | Servicio no disponible / tiempo agotado |
