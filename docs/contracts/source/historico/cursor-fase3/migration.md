# Contrato de integración frontend

Fuente para redactar los SDD de cada módulo. Catálogo de rutas:
[`../api/endpoints.md`](../api/endpoints.md). Ruteo:
[`../api/API_ROUTING_V3.md`](../api/API_ROUTING_V3.md). Geocoding:
[`../api/GEOCODING_API.md`](../api/GEOCODING_API.md).

El cruce de las 47 llamadas vivas del AngularJS (`master/`) está en la [sección 16](#16-cruce-ruteando-web--apiv1).
Las secciones 1–15 son el contrato nuevo; la 16 dice qué pantalla deja de llamar qué.

Base URL de desarrollo: `http://localhost:8000`. Prefijo único: **`/api/v1`**.
No hay alias `/api/*` ni `/hanoit/**`. Una llamada a esas rutas responde **403**.

Cada SDD de pantalla debe copiar de aquí: rol que entra, request, response, estados vacíos y la fila de error que esa pantalla pinta.

---

## 1. Convenciones que aplican a todas las pantallas

### Sesión

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

| Token | Dónde vive | Duración |
|-------|------------|----------|
| `accessToken` | Memoria. No en `localStorage` | `expiresIn` segundos (1 h) |
| `refreshToken` | Persistencia del cliente | 7 días |

Claims que el cliente puede leer del JWT (RS256): `sub` (user id), `tenantId`, `role`.
El aislamiento es del servidor: **no enviar `tenantId` en el body**.

Renovación: `POST /api/v1/auth/refresh` `{ "refreshToken" }` → nuevo par de tokens.
Si el refresh falla (`TOKEN_EXPIRED`), limpiar sesión y ir a login.
Logout: `POST /api/v1/auth/logout` `{ "refreshToken" }` → `{ "message": "Logout exitoso" }`.

### Paginación

Query `page` (base 0) y `size` (default 20).

```json
{ "content": [], "totalElements": 150, "totalPages": 8, "page": 0, "size": 20 }
```

### Fechas y coordenadas

- Instants en UTC ISO-8601: `2026-11-17T13:00:00Z`. No enviar fecha local sin zona.
- Excepción: `executionDate` de asignaciones es `YYYY-MM-DD`.
- Excepción: `timeInit` del messenger suelto es `HH:mm:ss`.
- GeoJSON Point: `{ "type": "Point", "coordinates": [longitud, latitud] }`.
- Waypoints de jornada: `coordinates` es el array `[lon, lat]` sin el wrapper.
- Teléfono, cuando se envía: E.164 `+[10 a 15 dígitos]`, ejemplo `+573001234567`.

### IDs

ObjectId hex de 24 caracteres. En la UI son opacos.

### Error único

```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found: 6650…",
  "timestamp": "2026-11-17T13:00:00Z",
  "path": "/api/v1/resources/6650…",
  "details": null
}
```

`VALIDATION_ERROR` trae `details` con un mapa campo → mensaje. Pintar el mensaje junto al input.
`429` incluye el header `Retry-After` (segundos). Deshabilitar el botón ese tiempo.

### Roles en JSON

El campo `role` de la API va en **minúsculas**: `super_admin` | `tenant_admin` | `agent` | `driver`.
El catálogo `GET /api/v1/master-domains/Role` usa claves `SUPER_ADMIN`, `TENANT_ADMIN`, `AGENT`, `DRIVER` solo como etiqueta. No reenviar esas claves en un `POST /users`.

### Contraseña

Mínimo 16 caracteres, una mayúscula, una minúscula, un dígito y un carácter de `@$!%*?&`.
Aplica a registro, reset, change-password y aceptación de invitación.

---

## 2. Quién ve qué

| Módulo | `super_admin` | `tenant_admin` | `agent` | `driver` |
|--------|:---:|:---:|:---:|:---:|
| Login, refresh, logout, me | sí | sí | sí | sí |
| Alta self-service, forgot/reset, OTP | público | público | público | público |
| Tenants (CRUD y activar) | sí | | | |
| Mi tenant, billing, invitaciones, audit del tenant | | sí | | |
| Usuarios del tenant | | sí | | |
| Places, zones, resources, settings, packages, journeys, geocoding | sí | sí | sí | |
| Posiciones de flota, assigned-services | sí | sí | sí | |
| Rutas del día, reportar entrega, enviar GPS | | | | sí |
| Audit `/me`, preferencias, push | sí | sí | sí | sí |
| Audit global, migrate, geocoding-config | sí | | | |

Una pantalla de `agent` no debe ofrecer checkout, invitaciones ni alta de usuarios: el API responde **403**.

---

## 3. Mapa de SDD sugerido

| SDD | Pantallas | Sección |
|-----|-----------|---------|
| Identidad | Login, registro, verificar email, recuperar y cambiar clave, perfil | §4 |
| Organización | Mi empresa, usuarios, invitaciones, asientos | §5 |
| Suscripción | Plan, checkout, portal, facturas, uso | §6 |
| Maestros | Lugares, zonas, tipos de recurso, recursos, settings | §7 |
| Servicios | Paquetes, CSV, geocoding | §8 y [`GEOCODING_API.md`](../api/GEOCODING_API.md) |
| Planificación | Armar jornada, listado, detalle, mapa, métricas | §9 y [`API_ROUTING_V3.md`](../api/API_ROUTING_V3.md) |
| Operación | Asignar conductor, mapa en vivo | §10 |
| App conductor | Mis rutas, navegación, entrega, GPS | §11 |
| Cuenta | OTP, push, preferencias, mi actividad | §12 |
| Plataforma | Tenants, migración, config de geocoding | §13 |

---

## 4. Identidad

### Login — `POST /api/v1/auth/login` (público)

```json
{ "email": "owner@acme.com", "password": "MySecurePassw0rd!X" }
```

`email` se normaliza (trim + minúsculas). **200:**

```json
{
  "accessToken": "eyJ…",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": 3600,
  "user": {
    "id": "6650…",
    "email": "owner@acme.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "+573001234567",
    "role": "tenant_admin",
    "tenantId": "6651…",
    "emailVerified": true,
    "phoneVerified": false,
    "createdAt": "2026-11-01T10:00:00Z"
  }
}
```

Guardar `user` para el shell (nombre, rol, tenant). No hace falta un `GET /me` en el primer paint si el login acaba de responder; sí hace falta tras un refresh de página (`GET /api/v1/auth/me` devuelve el mismo `user` sin tokens).

| HTTP | `error` | UI |
|------|---------|----|
| 400 | `EMAIL_NOT_VERIFIED` | “Revisa tu correo” + acción de reenviar |
| 401 | `INVALID_CREDENTIALS` | Mensaje genérico. No decir si el email existe |
| 401 | `ACCOUNT_DISABLED` | Cuenta o tenant inactivo |
| 423 | `ACCOUNT_LOCKED` | Leer `details.lockedUntil` y mostrar la hora. No reintentar antes |
| 429 | `RATE_LIMIT_EXCEEDED` | 5 intentos / 15 min por IP + email |

Lockout: 5 fallos → 15 min; 10 → 1 h; 20+ → 24 h y correo al admin del tenant.

### Registro — `POST /api/v1/auth/register` (público, 201)

No devuelve tokens. El usuario queda sin sesión hasta verificar el correo.

```json
{
  "email": "owner@acme.com",
  "password": "MySecurePassw0rd!X",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+573001234567",
  "tenantName": "Acme Logistics",
  "country": "CO",
  "timezone": "America/Bogota",
  "companySize": "11-50",
  "industry": "logistics",
  "trialPlan": "standard"
}
```

Obligatorios: `email`, `password`, `firstName`, `lastName`, `tenantName`, `country`.
`phone`, `timezone`, `companySize`, `industry`, `trialPlan` son opcionales.
`trialPlan`: `basic` | `standard` | `premium` | `enterprise`. Si se envía, el trial dura **14 días** y el cupo es **2 asientos** (el admin + un invitado). Un tenant solo tiene un trial.

**201:**

```json
{
  "message": "Revisa tu correo para verificar la cuenta.",
  "tenant": {
    "id": "6651…",
    "name": "Acme Logistics",
    "slug": "acme-logistics",
    "plan": "trial_standard",
    "trial": {
      "plan": "standard",
      "startsAt": "2026-11-17T15:00:00Z",
      "endsAt": "2026-12-01T15:00:00Z",
      "seatLimit": 2
    }
  },
  "user": {
    "id": "6650…",
    "email": "owner@acme.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "tenant_admin",
    "emailVerified": false
  }
}
```

Pantalla siguiente: “revisa el correo”, no el dashboard.
**409** `EMAIL_ALREADY_EXISTS`. **400** si la clave no cumple la política. **429**: 3 registros / hora / IP.

Reenviar correo: `POST /api/v1/auth/resend-verification` `{ "email" }` → `{ "message" }` aunque el email no exista.

### Verificar email

- El enlace del correo abre `GET /api/v1/auth/verify-email?token=` y recibe **HTML**, no JSON. Ese enlace no lo consume la SPA.
- La SPA, si recibe el token por query propio, llama `POST /api/v1/auth/verify-email` `{ "token" }` y obtiene un `LoginResponse`: dejar la sesión iniciada y entrar al home.
- **400** `TOKEN_EXPIRED` si el token no vale (vence a las 24 h).

### Recuperar clave (público)

1. `POST /api/v1/auth/forgot-password` `{ "email" }` → siempre `{ "message" }`. No revelar si el email existe. 3 por hora por email.
2. `POST /api/v1/auth/reset-password` `{ "token", "newPassword" }` → `{ "message" }`. Invalida todos los refresh tokens. El token del correo dura 1 h.

### Sesión ya iniciada

`PUT /api/v1/auth/change-password` `{ "currentPassword", "newPassword" }` → `{ "message" }`.
Tras el cambio, el refresh actual deja de valer: volver a login o pedir un par nuevo según el flujo que elija el SDD (el servidor invalida los refresh).

`PUT /api/v1/auth/me` actualiza solo lo enviado:

```json
{ "firstName": "Jane", "lastName": "Doe", "phone": "+573001234567" }
```

Respuesta: `UserProfileResponse` (el mismo objeto `user` del login).

---

## 5. Organización

### Mi empresa — `tenant_admin`

`GET /api/v1/tenants/me`

```json
{
  "id": "6651…",
  "name": "Acme Logistics",
  "slug": "acme-logistics",
  "country": "CO",
  "timezone": "America/Bogota",
  "plan": "standard",
  "companySize": "11-50",
  "industry": "logistics",
  "billing": {
    "email": "billing@acme.com",
    "taxId": "900123456-1",
    "address": {
      "line1": "Cra 7 #71-21",
      "line2": null,
      "city": "Bogotá",
      "state": "DC",
      "postalCode": "110231",
      "country": "CO"
    }
  },
  "seats": { "limit": 10, "used": 4, "available": 6 },
  "trial": {
    "plan": "standard",
    "startsAt": "2026-11-01T00:00:00Z",
    "endsAt": "2026-11-15T00:00:00Z",
    "seatLimit": 2,
    "expired": true
  },
  "subscriptionStatus": "active",
  "createdAt": "2026-11-01T00:00:00Z"
}
```

`seats.limit = -1` es ilimitado (enterprise). `trial` solo viene si el tenant tuvo trial.
`subscriptionStatus`: `trialing` | `active` | `past_due` | `canceled` | `unpaid`.

`PUT /api/v1/tenants/me`: `name` (obligatorio, ≤ 200), `country`, `timezone`, `companySize`, `industry`.
`PUT /api/v1/tenants/me/billing`: `billingEmail`, `taxId` (≤ 50), `billingAddress` con los campos de arriba.

### Usuarios — `tenant_admin`

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/api/v1/users?role=&page=&size=` | `role` en minúsculas |
| GET | `/api/v1/users/drivers` | Conductores activos, para los selectores |
| GET | `/api/v1/users/{id}` | |
| POST | `/api/v1/users` | Alta directa. Consume un asiento |
| PUT | `/api/v1/users/{id}` | Incluye activar (`active`) y cambiar `role` |
| DELETE | `/api/v1/users/{id}` | Soft delete. Libera el asiento |
| POST | `/api/v1/users/{id}/reset-password` | Envía el correo. No devuelve la clave |

Alta y edición:

```json
{
  "email": "ana@acme.com",
  "password": "MySecurePassw0rd!X",
  "firstName": "Ana",
  "lastName": "López",
  "phone": "+573001112233",
  "role": "agent",
  "identifierType": "citizen_id",
  "identifierValue": "1234567890",
  "avatar": "https://cdn.example/a.png"
}
```

En `PUT`, omitir `password` si no se cambia. `role` es obligatorio en el alta.
`identifierType`: `citizen_id` | `itin` | `plate` | `code` (catálogo `IdentifierType`).

`UserResponse`: `id`, `tenantId`, `email`, `firstName`, `lastName`, `phone`, `role`, `identifierType`, `identifierValue`, `avatar`, `active`, `lastLoginAt`, `createdAt`, `updatedAt`.

Activar a alguien cuando `seats.available` es 0 → **409** `SEAT_LIMIT_EXCEEDED`.
Desactivar (`active: false`) libera el cupo. El SDD de usuarios debe mostrar `used/limit` tomado de `/tenants/me` antes de habilitar “activar” o “invitar”.

### Invitaciones — `tenant_admin`, aceptar es público

`POST /api/v1/invitations`

```json
{
  "email": "driver@acme.com",
  "role": "driver",
  "metadata": { "firstName": "Luis", "lastName": "Gómez", "phone": "+573009998877" }
}
```

`role` solo `agent` o `driver`. No se invita a un `tenant_admin` por esta vía.
**201** `InviteResponse`: `id`, `tenantId`, `email`, `role`, `status` (`pending`), `expiresAt` (7 días), `invitedBy` `{ id, firstName, lastName }`, `createdAt`.

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/v1/invitations?status=pending` | `tenant_admin`. `status`: `pending` \| `accepted` \| `expired` \| `revoked` |
| DELETE | `/api/v1/invitations/{id}` | Revoca una pendiente |
| POST | `/api/v1/invitations/{token}/resend` | Reenvía el correo |
| GET | `/api/v1/invitations/accept/{token}` | Público. Preview |
| POST | `/api/v1/invitations/accept/{token}` | Público. Crea la cuenta y deja sesión iniciada |

Preview:

```json
{
  "email": "driver@acme.com",
  "role": "driver",
  "tenantName": "Acme Logistics",
  "inviterName": "Jane Doe",
  "expiresAt": "2026-11-24T15:00:00Z"
}
```

Aceptar:

```json
{
  "firstName": "Luis",
  "lastName": "Gómez",
  "phone": "+573009998877",
  "password": "MySecurePassw0rd!X",
  "identifierType": "citizen_id",
  "identifierValue": "1234567890"
}
```

Obligatorios: `firstName`, `lastName`, `password`. La respuesta es un `LoginResponse`.
**410** `INVITATION_TOKEN_GONE` si el token venció, se revocó o ya se usó.
**409** `SEAT_LIMIT_EXCEEDED` si el cupo se llenó entre el envío y la aceptación.
**429**: 20 invitaciones / hora / tenant.

---

## 6. Suscripción — `tenant_admin`

`enterprise` no se compra aquí. Checkout, upgrade y cambio de asientos con `plan = enterprise` → **422** `ENTERPRISE_PLAN_SELF_SERVICE`.

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/api/v1/billing/subscription` | | Suscripción, o **404** si aún no hay (trial o free) |
| POST | `/api/v1/billing/checkout` | ver abajo | **201** `{ checkoutUrl, sessionId }` |
| POST | `/api/v1/billing/portal` | `{ "returnUrl" }` | `{ portalUrl }` |
| POST | `/api/v1/billing/upgrade` | `{ plan, billingInterval }` | Plan nuevo, mismos asientos |
| PUT | `/api/v1/billing/seats` | `{ "op": "increase"\|"decrease", "quantity": N }` | Cupo nuevo |
| POST | `/api/v1/billing/cancel` | | Cancela al fin del periodo |
| GET | `/api/v1/billing/invoices` | | Lista de facturas |
| GET | `/api/v1/billing/usage` | | Cupos del plan |

Checkout (el front debe mandar URLs absolutas de retorno):

```json
{
  "plan": "standard",
  "billingInterval": "monthly",
  "initialQuantity": 5,
  "successUrl": "https://app.example/billing/success",
  "cancelUrl": "https://app.example/billing/cancel"
}
```

`plan`: `basic` | `standard` | `premium`. `billingInterval`: `monthly` | `annual` (el anual ya trae el 20 % en el price de Stripe). `initialQuantity` ≥ 1.
Redirigir el navegador a `checkoutUrl`. Al volver por `successUrl`, refrescar `GET /billing/subscription` y `GET /tenants/me`: el webhook puede tardar unos segundos, así que un 404 inmediato no es un fallo de pago.

`SubscriptionResponse`: `id`, `plan`, `billingInterval`, `status`, `quantity` (asientos comprados), `unitAmount`, `amount` (céntimos), `currency`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `canceledAt`, `latestInvoiceId`, `latestInvoiceStatus`, `latestInvoicePdfUrl`.

Bajar asientos por debajo de `seats.used` → **422** `SEAT_DECREASE_BLOCKED`. El SDD debe calcular `quantityActual - N >= seats.used` y deshabilitar el control, y además pintar el 422 si llega.

`CancelSubscriptionResponse`: `cancelAtPeriodEnd`, `currentPeriodEnd`, `message`. El plan sigue activo hasta `currentPeriodEnd`. Después el tenant pasa a free (2 asientos) y el servidor desactiva usuarios de más. La UI solo informa; no desactiva usuarios en ese momento.

Factura: `id`, `number`, `status`, `amountPaid` (céntimos), `currency`, `created`, `pdfUrl`.

Uso (`BillingUsageResponse`), para la barra de cupos:

```json
{
  "plan": "standard",
  "seats": { "limit": 10, "used": 4, "available": 6, "usagePercent": 40.0 },
  "limits": {
    "deposits": { "limit": 20, "used": 3, "usagePercent": 15.0 },
    "drivers": { "limit": 50, "used": 8, "usagePercent": 16.0 },
    "routesMonthly": { "limit": 100000, "used": 1200, "usagePercent": 1.2, "resetsAt": "2026-12-01T00:00:00Z" },
    "admins": { "limit": 5, "used": 1, "usagePercent": 20.0 },
    "addressesPerFile": { "limit": 5000 }
  },
  "subscription": {
    "status": "active",
    "billingInterval": "monthly",
    "currentPeriodEnd": "2026-12-17T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "trial": null
}
```

`addressesPerFile` no tiene consumo: es el tope del CSV. `limit = -1` es ilimitado.

`past_due`: banner de pago fallido y botón al portal. No bloquear la operación en el cliente; el servidor decide.

---

## 7. Maestros operativos

Todos exigen sesión. El listado es paginado salvo donde se indica. Soft delete en places, resources, resource-types y settings (`active: false`). Las zonas se borran de verdad.

### Lugares — `/api/v1/places`

```json
{
  "name": "Bodega Norte",
  "type": "depot",
  "address": "Cra 65A #67F-15, Medellín",
  "location": { "type": "Point", "coordinates": [-75.5636, 6.2518] },
  "phoneNumber": "+573001234567",
  "contactName": "María García",
  "zoneId": "6650…"
}
```

Obligatorios: `name` (≤ 100), `location`. `type`: `depot` | `warehouse` | `store` | `office` | `custom`.

`PlaceResponse` añade `id`, `tenantId`, `active`, `createdAt`, `updatedAt`.
`GET /api/v1/places?type=&page=&size=`.
`GET /api/v1/places/nearby?lon=&lat=&maxDistance=` — `maxDistance` en metros, default 5000. `lon` va primero.

### Zonas — `/api/v1/zones`

```json
{ "name": "Zona Centro", "code": "ZC", "color": "#33FF57" }
```

`name` obligatorio ≤ 100. `code` alfanumérico ≤ 10, único en el tenant. `color` `#RRGGBB`.
`ZoneResponse`: `id`, `tenantId`, `name`, `code`, `boundary`, `color`, `isActive`, `createdAt`, `updatedAt`.
`GET /api/v1/zones/containing?longitude=&latitude=` devuelve las zonas del tenant cuyo polígono cubre el punto.

**Límite para el SDD.** Enviar `boundary` en el `POST` o `PUT` responde **500**: el tipo GeoJSON del polígono no se deserializa. Hoy el polígono se carga en base de datos. La pantalla puede listar y consultar `containing`, y no debe ofrecer un editor de polígono contra este API hasta que ese límite se cierre.

### Tipos de recurso — `/api/v1/resource-types`

```json
{
  "category": "Van",
  "name": "NHR REWARD EURO IV",
  "osrmProfile": "driving",
  "capacity": { "weight": 2500, "volume": 12 },
  "measure": { "height": 1.8, "width": 1.6, "depth": 3.2 },
  "restriction": { "minWeight": 0, "maxWeight": 2500, "minVolume": 0, "maxVolume": 12 },
  "gasMileage": 32.0
}
```

Obligatorios: `category` (≤ 50), `name` (≤ 100). `osrmProfile`: `driving` | `cycling` | `walking`.
Filtro de activos: `GET /api/v1/resource-types?active=true`.

### Recursos (vehículo + turno) — `/api/v1/resources`

```json
{
  "resourceTypeId": "6650…",
  "driverId": "6650…",
  "name": "Van Norte #1",
  "licensePlate": "ABC-123",
  "depotId": "6650…",
  "shiftStartUtc": "2026-11-17T12:00:00Z",
  "shiftDurationSec": 28800,
  "breakDurationSec": 3600,
  "quantity": 1,
  "isDefault": false,
  "allowedPackageTypes": ["delivery"],
  "allowedZoneIds": ["6650…"]
}
```

Obligatorios: `resourceTypeId`, `depotId`, `shiftStartUtc`, `shiftDurationSec` (≥ 1), `breakDurationSec` (≥ 0).
`GET /api/v1/resources?resourceTypeId=&isActive=&active=&page=&size=`.
`PUT /api/v1/resources/{id}/driver/{driverId}` asigna conductor. `DELETE /api/v1/resources/{id}/driver` lo quita.

La respuesta enriquece `resourceType` `{ id, name, capacity, osrmProfile }` y `assignedUser` `{ id, firstName, lastName, email }`. El formulario puede mostrar el nombre sin una segunda petición.

### Settings de planificación — `/api/v1/settings`

```json
{
  "description": "CVRPTW Zona Norte",
  "routeTopology": "round_trip",
  "restrictionType": "resource_vs_time",
  "placeStartId": "6650…",
  "placeEndId": "6650…",
  "evaluateWeight": true,
  "evaluateVolume": false,
  "evaluateItineraryZone": false,
  "fixedRoutes": 5,
  "lengthOfStay": 600,
  "typeLengthOfStay": "fixed",
  "shiftStartUtc": "2026-11-17T12:00:00Z",
  "shiftDurationSec": 28800,
  "breakDurationSec": 3600,
  "resourceIds": ["6650…"]
}
```

Catálogos:

| Campo | Claves |
|-------|--------|
| `routeTopology` | `depot_to_depot`, `round_trip`, `open_delivery`, `open_pickup`, `flexible` |
| `restrictionType` | `fixed_routes`, `resource_vs_time`, `time_windows` |
| `typeLengthOfStay` | `fixed`, `define_itinerary` |

`lengthOfStay`, `shiftDurationSec` y `breakDurationSec` van en **segundos**.
`fixedRoutes` solo aplica si `restrictionType = fixed_routes`.
Activos: `GET /api/v1/settings?active=true`. `DELETE` desactiva, no borra.

La respuesta añade `placeStart`, `placeEnd` (`{ id, name, location }`), `resources` (`[{ id, name, licensePlate, resourceTypeName }]`), `globalShiftActive` (`shiftDurationSec >= 0`) y `globalBreakActive`.

---

## 8. Paquetes

`POST /api/v1/packages` y `PUT /api/v1/packages/{id}`:

```json
{
  "guideNumber": "G010",
  "name": "Paquete #42",
  "serviceType": "delivery",
  "address": "Calle 100 #15-20, Bogotá",
  "standardizedAddress": "CL 100 15 20, BOGOTA, COLOMBIA",
  "location": { "type": "Point", "coordinates": [-74.0721, 4.6097] },
  "geocodingScore": 95,
  "geocodingStatus": "match",
  "city": "Bogotá",
  "country": "CO",
  "postalCode": "110111",
  "zoneId": "6650…",
  "weight": 2.5,
  "volume": 0.015,
  "pieceNumber": 1,
  "measure": { "height": 0.2, "width": 0.3, "depth": 0.25 },
  "durationStay": 600,
  "timeWindow": { "startUtc": "2026-11-17T13:00:00Z", "endUtc": "2026-11-17T16:00:00Z" },
  "category": "electronics",
  "goodsTags": ["fragile"],
  "customerId": "C-19",
  "receiver": { "name": "Ana", "phone": "+573001112233", "email": "ana@cliente.com" },
  "sender": { "name": "Bodega", "phone": "+573009990000", "email": "bodega@acme.com" },
  "observation": "Entregar en portería",
  "status": "pending"
}
```

Obligatorio: `serviceType` (`pickup` | `delivery` | `mixed`).
`status`: `pending` | `attended` | `unattended` | `cancelled`.
`country` en este DTO es de 2 letras. `durationStay` en segundos. `weight` y `volume` ≥ 0.

Listados: `GET /api/v1/packages?page=&size=`, `?status=`, `?serviceType=`. Se pueden combinar.
Cambio de estado sin reenviar el paquete: `PATCH /api/v1/packages/{id}/status/{status}`.
CSV y geocoding: [`GEOCODING_API.md`](../api/GEOCODING_API.md).

Un paquete sin `location` no debería entrar a `journeys/plan`. El SDD de “listos para rutear” filtra `geocodingStatus` en `match` o `manual`.

---

## 9. Planificación

Flujo de la pantalla “armar jornada”:

1. Cargar settings activos, recursos activos y paquetes con coordenada.
2. El usuario elige un settings y un conjunto de paquetes.
3. `POST /api/v1/journeys/plan?mode=packages|messenger` con `{ settingsId, packageIds, name, date }`.
4. Pintar el **201**, que ya trae `routes[]`, `waypoints` y `resourceSummary`. No hace falta un GET inmediato.
5. Si `invalidPackageIds` o algún `badPackageIds` viene con ids, mostrarlos como no asignados.

`mode=packages` es el VRP (peso, volumen, jornada, zonas). `mode=messenger` son rutas fijas; el settings debe tener `restrictionType = fixed_routes`.

Listado (`GET /api/v1/journeys`) **no trae `routes`**. El detalle y el mapa usan `GET /api/v1/journeys/{id}`.
Filtro: `?status=` con `planning` | `in_progress` | `completed` | `failed` | `cancelled`.
`DELETE /api/v1/journeys/{id}` es soft delete.

Contrato completo de `routes[]`, navegación y métricas: [`API_ROUTING_V3.md`](../api/API_ROUTING_V3.md) §6.

La previsualización de una polilínea suelta (sin guardar) usa `/api/v1/routing/route`, no `/plan`.

---

## 10. Operación de flota

### Asignaciones — `/api/v1/assigned-services`

Una asignación es única por conductor y fecha: si se crea otra para el mismo par, el servidor **actualiza** la existente.

```json
{
  "driverId": "6650…",
  "vehicleId": "6650…",
  "routeId": "6650…",
  "state": "ACTIVO",
  "executionDate": "2026-11-17"
}
```

Obligatorios: `driverId`, `executionDate` (`YYYY-MM-DD`).
`state`: `INACTIVO` | `COMPLETADO` | `EN_SERVICIO` | `ACTIVO`.
Respuesta: `id`, `tenantId`, `driverId`, `vehicleId`, `routeId`, `routeName`, `state`, `executionDate`.
Borrado de una en una: `DELETE /api/v1/assigned-services/{id}`. No hay borrado masivo.

### Posiciones — panel

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/v1/positions` | Últimos puntos de la flota del tenant |
| GET | `/api/v1/positions/{driverId}` | Último punto de un conductor |

`VehiclePositionResponse`: `id`, `driverId`, `longitude`, `latitude`, `address`, `date`.
`longitude`/`latitude` van en campos planos (no GeoJSON) en este recurso.

---

## 11. App del conductor — rol `driver`

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/v1/driver/routes` | Rutas asignadas al conductor del token |
| GET | `/api/v1/driver/routes/{journeyId}/{routeIndex}` | Paradas + navegación |
| GET | `/api/v1/driver/assignments` | Asignación de hoy |
| POST | `/api/v1/driver/positions` | Enviar GPS. **201** con el punto guardado |
| PUT | `/api/v1/driver/packages/report` | Resultado de una entrega |

Ítem del listado: `journeyId`, `journeyName`, `routeIndex`, `name`, `date`, `geoJson`, `startRouteUtc`, `finishRouteUtc`, `distanceTraveled` (m), `duration` (s), `waypointCount`, `status`.

Detalle: lo anterior más `resourceId`, `weightUsed`, `volumeUsed`, `waypoints[]` y `navigation`.
Cada parada: `sequence`, `stopType`, `packageId`, `placeId`, `coordinates` `[lon, lat]`, `arrivalUtc`, `departureUtc`, `distance`, `distanceAccum`, `duration`, `durationAccum`.
`navigation.instructionsLegacy` es la lista turn-by-turn que ya consumía la app anterior.

GPS:

```json
{ "driverId": "6650…", "longitude": -74.08, "latitude": 4.65, "address": "Calle 100" }
```

El servidor también publica el punto para consumidores externos. La app no abre un websocket: el canal en vivo del panel es `GET /api/v1/positions` (polling o el mecanismo que defina el SDD).

Reporte de entrega:

```json
{ "packageId": "6650…", "status": "attended", "observation": "Recibido por portería" }
```

`status`: `attended` | `unattended` | `cancelled` (y `pending` si se revierte). `packageId` es obligatorio.

---

## 12. Cuenta: OTP, push, preferencias, actividad

### OTP (público)

`POST /api/v1/notifications/otp/send`

```json
{ "recipient": "+573001112233", "channel": "sms", "purpose": "phone_verification" }
```

`channel`: `sms` | `email`. `purpose`: `phone_verification` | `login_2fa` | `email_2fa`.
SMS exige E.164. Email exige correo. **200:** `{ otpId, expiresInSeconds: 300, channel, message }`.
El `message` ya viene enmascarado (“terminado en **1222”). Mostrarlo tal cual.

`POST /api/v1/notifications/otp/resend` `{ otpId, channel, recipient }` regenera el código y **no alarga** el vencimiento. `expiresInSeconds` es lo que queda.

`POST /api/v1/notifications/otp/verify` `{ "otpId", "code" }` con `code` de 6 dígitos.
**200** `{ "verified": true }`. **400** `INVALID_OTP` y `details.attemptsRemaining`. **410** `OTP_EXPIRED`. **422** `MAX_ATTEMPTS_EXCEEDED` (3 intentos de verificación) o `MAX_RESENDS`.

Topes: 3 envíos / hora / destinatario, 2 reenvíos por `otpId`, 5 verificaciones / 15 min / `otpId`.

### Push (sesión)

`POST /api/v1/notifications/push/register` `{ "deviceToken", "platform": "android"|"ios"|"web" }` → `{ "registered": true, "deviceCount": N }` con N ≤ 5. Si ya hay 5, se descarta el más viejo.
`DELETE /api/v1/notifications/push/unregister` `{ "deviceToken" }` → **204**.

### Preferencias

`GET /api/v1/notifications/preferences` devuelve el objeto aunque nunca se haya guardado:

```json
{
  "email": { "billing": true, "security": true, "product": true, "invitations": true },
  "sms": { "otp": true, "alerts": false },
  "push": { "routeUpdates": true, "journeyCompleted": true, "billing": false }
}
```

`PUT` es un merge: enviar solo los booleanos que cambian. `sms.otp` no se puede apagar; si el cliente manda `false`, el servidor lo deja en `true` y responde el objeto completo.

### Mi actividad

`GET /api/v1/audit-logs/me?page=&size=&action=&entityType=` para cualquier rol.
El ítem de `/me` no trae IP. El del admin sí: `id`, `action`, `entityType`, `entityId`, `description`, `actorEmail`, `actorRole`, `changes`, `ipAddress`, `createdAt`.
`GET /api/v1/audit-logs` y `/{id}` son de `tenant_admin`. `GET /api/v1/audit-logs/admin?tenantId=` es de `super_admin`.
No hay filtro `dateFrom`/`dateTo`.

---

## 13. Plataforma — `super_admin`

### Tenants

`POST /api/v1/tenants`

```json
{
  "name": "Acme Logistics",
  "slug": "acme-logistics",
  "taxId": "900123456-1",
  "country": "CO",
  "timezone": "America/Bogota",
  "plan": "enterprise",
  "config": {
    "defaultWeightUnit": "kg",
    "defaultVolumeUnit": "cm3",
    "maxDeposits": 100,
    "maxDrivers": 500,
    "maxRoutesMonthly": -1,
    "maxAdmins": 20,
    "maxAddressesPerFile": 10000,
    "maxGeocodedAddresses": -1,
    "maxDefaultResources": 50
  }
}
```

`slug`: minúsculas, números y guiones. `country`: dos letras mayúsculas. `timezone` obligatorio.
Unidades de peso: `g` | `kg` | `lb`. De volumen: `cm3` | `m3` | `l`.
`TenantResponse` repite esos campos más `id`, `isActive`, `createdAt`, `updatedAt`.
Lookup: `GET /api/v1/tenants/slug/{slug}`.

Activar o desactivar (no hay DELETE):

```json
{ "active": false, "reason": "Impago" }
```

`PATCH /api/v1/tenants/{id}`. `reason` acompaña la desactivación.

### Otros

| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET / PUT | `/api/v1/admin/geocoding-config` | Singleton. Ver geocoding §5 |
| POST | `/api/v1/admin/migrate` | `{ "paso": resultado }` de todos los pasos |
| POST | `/api/v1/admin/migrate/{step}` | Un paso. Idempotente |
| GET | `/api/v1/admin/migrate/validate` | `{ "coleccion": conteo }` |

---

## 14. Catálogos para armar selects

`GET /api/v1/master-domains` lista todos. `GET /api/v1/master-domains/{code}` uno.
`GET /api/v1/master-domains/{code}/values` solo los valores.
Cada valor: `key`, `label`, `description`, `isActive`, `sortOrder`. Ordenar por `sortOrder` y ocultar `isActive = false`.

| `code` | Para qué campo |
|--------|----------------|
| `OsrmProfile` | `resourceType.osrmProfile` |
| `RouteTopology` | `settings.routeTopology` |
| `RestrictionType` | `settings.restrictionType` |
| `TypeLengthOfStay` | `settings.typeLengthOfStay` |
| `IdentifierType` | `user.identifierType` |
| `ServiceType` | `package.serviceType` |
| `PackageStatus` | `package.status` |
| `GeocodingStatus` | `package.geocodingStatus` |
| `Role` | etiquetas. El valor que se envía va en minúsculas (§1) |
| `JourneyStatus` | `journey.status` |
| `PlaceType` | `place.type` |
| `StopType` | `waypoint.stopType` |

Alta de un valor (sesión): `POST /api/v1/master-domains/{code}/values` `{ key, label, description, sortOrder }`.
`PATCH /api/v1/master-domains/{code}/values/{key}/toggle` invierte `isActive`.

---

## 15. Errores que un SDD debe asignar a un estado de pantalla

| HTTP | `error` | Pantalla |
|------|---------|----------|
| 400 | `VALIDATION_ERROR` | Formulario. `details` por campo |
| 400 | `BAD_REQUEST` | Argumento mal formado (id, coordenadas, CSV) |
| 400 | `INVALID_OTP` | Input del código. Mostrar `details.attemptsRemaining` |
| 400 | `TOKEN_EXPIRED` | Enlace de verificación, reset o refresh |
| 400 | `EMAIL_NOT_VERIFIED` | Login |
| 401 | `UNAUTHORIZED` | Sesión ausente o JWT inválido → login |
| 401 | `INVALID_CREDENTIALS` | Login |
| 401 | `ACCOUNT_DISABLED` | Login |
| 403 | `FORBIDDEN` | Rol insuficiente o dato de otro tenant |
| 404 | `NOT_FOUND` | El id no existe en el tenant. Incluye suscripción ausente |
| 409 | `CONFLICT` | Único violado (slug, código de zona) |
| 409 | `EMAIL_ALREADY_EXISTS` | Registro o invitación |
| 409 | `SEAT_LIMIT_EXCEEDED` | Alta, activación o aceptación de invitación |
| 410 | `OTP_EXPIRED` | Pedir un código nuevo |
| 410 | `INVITATION_TOKEN_GONE` | Invitación |
| 422 | `UNPROCESSABLE_ENTITY` | Regla de negocio genérica |
| 422 | `MAX_ATTEMPTS_EXCEEDED` | OTP |
| 422 | `MAX_RESENDS` | OTP |
| 422 | `ENTERPRISE_PLAN_SELF_SERVICE` | Billing |
| 422 | `SEAT_DECREASE_BLOCKED` | Bajar asientos |
| 423 | `ACCOUNT_LOCKED` | Login. `details.lockedUntil` |
| 429 | `RATE_LIMIT_EXCEEDED` | Header `Retry-After` |
| 500 | `INTERNAL_ERROR` | Polígono de zona en el body, fallo OSRM o proveedor |
| 502 | `STRIPE_INTEGRATION_ERROR` | Billing. Ofrecer reintento |

---

## 16. Cruce ruteando-web → `/api/v1`

Inventario de lo que `master/js` llama hoy. No es el mapa de controllers retirados
([`../api/ENDPOINT_MIGRATION_MAP.md`](../api/ENDPOINT_MIGRATION_MAP.md)): allí están los paths
del backend viejo, que no coinciden siempre con los del front.

Bases que arma `master/js/custom/config/constant.js`:

| Base | URL que usa el front | Ahora |
|------|----------------------|-------|
| OAuth / cuenta | `http://hanoit:9000` | `POST /api/v1/auth/*` en el mismo host de la API |
| API v1 | `http://hanoit:9000/hanoit/api/v1` | `/api/v1/*` |
| Delivery v2 | `http://app.ruteando.co:9000/hanoit/v2/delivery` (hardcoded en `osrmHttp.js`) | `/api/v1/routing/*` y `/api/v1/journeys/plan` |

Esas tres bases responden **403**. No hay periodo en el que convivan.

Auth vieja: header `Authorization: Basic SEFOT0lULUFQUDoxMjM0NTY=` (`HANOIT-APP:123456`) y
`client_id` / `client_secret` en el query. Desaparece. El resto de llamadas ya mandaba
`Bearer`; se conserva el header, cambia el token (sección 1). `authResponseInterceptor.js`
deja de buscar `error: invalid_token` y redirige a login ante un **401**.

Los listados del front usan `$resource` con `isArray: true`. La respuesta nueva es la página
de la sección 1 (`content`, no un arreglo suelto).

### 16.1 Las 47 llamadas vivas

#### Cuenta — 6 (`authHttp.js`, base OAuth)

| # | Front | Ahora | Adaptación |
|---|-------|-------|------------|
| 1 | `POST /oauth/token` `grant_type=password`, `username`, `password`, `client_id`, `client_secret`, `scope` | `POST /api/v1/auth/login` `{ email, password }` | JSON. Sin Basic ni client secret. Guarda `accessToken` en memoria, no `access_token` en `localStorage` |
| 2 | `POST /oauth/token` `grant_type=refresh_token` | `POST /api/v1/auth/refresh` `{ refreshToken }` | Sin `client_id` ni `client_secret`. Lo disparan `main.js` y `resincTknRefresh.js` |
| 3 | `POST /singup` `{ username, password, password_repeat }` | `POST /api/v1/auth/register` | Crea tenant + `tenant_admin`. No devuelve tokens. El formulario pide `tenantName`, `country` y el resto de la sección 4. Duplicado: `EMAIL_ALREADY_EXISTS`, no `UserDuplicateException` |
| 4 | `POST /singup/activate` `{ token }` (ruta `/activate/:token`) | `POST /api/v1/auth/verify-email` `{ token }` | Devuelve `LoginResponse`: dejar la sesión iniciada. El `GET` homónimo es el HTML del correo, no lo llama la SPA |
| 5 | `POST /forgotPassword` `{ email }` | `POST /api/v1/auth/forgot-password` `{ email }` | Siempre el mismo `{ message }`, exista o no el correo |
| 6 | `POST /forgotPassword/reset` `{ token, password, password-repeat }` | `POST /api/v1/auth/reset-password` `{ token, newPassword }` | `password-repeat` se queda en el formulario. Invalida los refresh |

#### Tipos de vehículo — 5 (`vehicletypes_http.js`, `/typevehicle`)

El path del front es singular. El controller viejo del backend era `/typevehicles`.

| # | Front | Ahora |
|---|-------|-------|
| 7 | `GET /typevehicle` | `GET /api/v1/resource-types?page=&size=` |
| 8 | `POST /typevehicle` | `POST /api/v1/resource-types` |
| 9 | `PUT /typevehicle/:id` | `PUT /api/v1/resource-types/{id}` |
| 10 | `DELETE /typevehicle/:id` | `DELETE /api/v1/resource-types/{id}` (soft: `active=false`) |
| 11 | `DELETE /typevehicle?ids=` | Sin equivalente. Borrar en bucle la fila 10, o quitar el borrado múltiple |

`weight` / `volume` pasan a `capacity`. `restriction.minWeight|maxWeight|minVolume|maxVolume` conserva el objeto `restriction`. Hay que enviar `category` y `name`. Perfil OSRM: `osrmProfile` (`driving`, `cycling`, `walking`).

#### Vehículos — 5 (`vehicles_http.js`, `/vehicles`)

| # | Front | Ahora |
|---|-------|-------|
| 12 | `GET /vehicles` | `GET /api/v1/resources?page=&size=` |
| 13 | `POST /vehicles` | `POST /api/v1/resources` |
| 14 | `PUT /vehicles/:id` | `PUT /api/v1/resources/{id}` |
| 15 | `DELETE /vehicles/:id` | `DELETE /api/v1/resources/{id}` (soft) |
| 16 | `DELETE /vehicles?ids=` | Sin equivalente. Mismo criterio que la fila 11 |

No es un rename. El alta exige `resourceTypeId`, `depotId` (un lugar), `shiftStartUtc`, `shiftDurationSec` (≥ 1) y `breakDurationSec` (≥ 0). El conductor, si se asigna en el mismo formulario, va en `driverId` o después con `PUT /api/v1/resources/{id}/driver/{driverId}`.

#### Conductores — 5 (`drivers_http.js`, `/driver`)

| # | Front | Ahora |
|---|-------|-------|
| 17 | `GET /driver` | `GET /api/v1/users/drivers` para el combo. El listado paginado es `GET /api/v1/users?role=driver` |
| 18 | `POST /driver` | `POST /api/v1/users` con `role: "driver"` |
| 19 | `PUT /driver/:id` | `PUT /api/v1/users/{id}` |
| 20 | `DELETE /driver/:id` | `DELETE /api/v1/users/{id}` (soft, libera el asiento) |
| 21 | `DELETE /driver?ids=` | Sin equivalente. Mismo criterio que la fila 11 |

Deja de ser un recurso propio. Hace falta email, contraseña de 16 caracteres (sección 1) y un asiento libre. Lo crea un `tenant_admin`. Sin cupo: **409** `SEAT_LIMIT_EXCEEDED`. Desactivar es `PUT` con `active: false`, no un delete distinto.

#### Servicios asignados — 1 (`assignedservices_http.js`, `/assignedservice`)

| # | Front | Ahora |
|---|-------|-------|
| 22 | `POST /assignedservice` (conductor + vehículo, sin fecha) | `POST /api/v1/assigned-services` |

`driverId` y `executionDate` (`YYYY-MM-DD`) son obligatorios. `vehicleId` es opcional. La misma pareja conductor+fecha actualiza la fila existente. `state`: `INACTIVO` | `COMPLETADO` | `EN_SERVICIO` | `ACTIVO`.

`assigned_services_controller.js` llama a `getAssignedServices()`, que no existe en el servicio viejo. El listado nuevo es `GET /api/v1/assigned-services`.

#### Lugares — 5 (`places_http.js`, `/places`)

| # | Front | Ahora |
|---|-------|-------|
| 23 | `GET /places` | `GET /api/v1/places?page=&size=` |
| 24 | `POST /places` | `POST /api/v1/places` |
| 25 | `PUT /places/:id` | `PUT /api/v1/places/{id}` |
| 26 | `DELETE /places/:id` | `DELETE /api/v1/places/{id}` (soft) |
| 27 | `DELETE /places?ids=` | Sin equivalente. Mismo criterio que la fila 11 |

`location` deja de ser lat/lon sueltos y pasa a GeoJSON `[lon, lat]`. Ese lugar es el `depotId` del recurso y el `placeStartId` / `placeEndId` del settings. Ya no se reenvía como `depot` dentro del optimizador.

#### Catálogos — 4 (`catalogs_http.js`, `/catalogs`)

| # | Front | Ahora |
|---|-------|-------|
| 28 | `GET /catalogs` | `GET /api/v1/master-domains` |
| 29 | `POST /catalogs` | Sin equivalente. No se crea un dominio nuevo |
| 30 | `PUT /catalogs/:id` | Sin equivalente. Un valor nuevo es `POST /api/v1/master-domains/{code}/values` |
| 31 | `DELETE /catalogs/:id` | Sin equivalente. Apagar un valor: `PATCH /api/v1/master-domains/{code}/values/{key}/toggle` |

La pantalla de catálogos no se migra 1:1. Los selects de la app salen de los códigos de la sección 14. Las claves de `Role` en el catálogo van en mayúsculas y no se reenvían en el body (sección 1).

#### Configuraciones — 5 (`settings_http.js`, `/settings`)

| # | Front | Ahora |
|---|-------|-------|
| 32 | `GET /settings` | `GET /api/v1/settings?page=&size=` (activos: `?active=true`) |
| 33 | `POST /settings` | `POST /api/v1/settings` |
| 34 | `PUT /settings/:id` | `PUT /api/v1/settings/{id}` |
| 35 | `DELETE /settings/:id` | `DELETE /api/v1/settings/{id}` desactiva (`active=false`), no borra |
| 36 | `DELETE /settings?ids=` | Sin equivalente. Mismo criterio que la fila 11 |

Diccionario del formulario en §16.2. Contrato del body en la sección 7.

#### Jornadas — 4 (`journeyHttp.js`, `/journeys`)

| # | Front | Ahora |
|---|-------|-------|
| 37 | `GET /journeys/summary` | `GET /api/v1/journeys?page=&size=`. No trae `routes` |
| 38 | `GET /journeys/:id` | `GET /api/v1/journeys/{id}`. Trae rutas, paradas y geometría para mapa, timeline y export |
| 39 | `DELETE /journeys/:id` | `DELETE /api/v1/journeys/{id}` (soft) |
| 40 | `DELETE /journeys?ids=` | Sin equivalente. Mismo criterio que la fila 11 |

`getJourneys()`, `getChartData()` y `getPlaces()` no existían en el servicio viejo y siguen sin existir. `read` y `update` de jornadas tampoco se usan: no hay `PUT /journeys/{id}`.

#### Carga, visitas, geocoding y optimización — 7

| # | Front | Ahora |
|---|-------|-------|
| 41 | `POST /journey/upload?name=` (multipart, Bearer) | `POST /api/v1/packages/upload` campo `file` |
| 42 | `GET /routes` (`visits_controller.js`) | Sin colección. Las paradas están en `routes[].waypoints` del detalle de jornada. `json/visits.json` sigue siendo mock local |
| 43 | `POST /geocoding` con el modelo del formulario (`id`, `country`, `city`, `address`) | `POST /api/v1/geocoding` `{ address }` |
| 44 | `POST /reverse_geocoding` `{ location: { x: lon, y: lat } }` | `POST /api/v1/reverse-geocoding` con GeoJSON Point |
| 45 | `POST /hanoit/v2/delivery/optimalRouteOfPointCloud` | `POST /api/v1/routing/optimizations` |
| 46 | `POST /hanoit/v2/delivery/optimisationForMessenger` | `POST /api/v1/journeys/plan?mode=messenger` |
| 47 | `POST /hanoit/v2/delivery/optimisationForPackages` | `POST /api/v1/journeys/plan?mode=packages` |

El detalle de 41 y de 45–47 está en §16.3. El de 43–44, en [`../api/GEOCODING_API.md`](../api/GEOCODING_API.md).

`path.api.optimalRouteOfPointCloud` y `path.api.optimisationForMessenger` bajo `/v1` en `constant.js` no se usan: el front llama la v2 hardcoded. `/hanoit/v3/routing/single` tampoco lo llama este cliente; su sucesor (`POST /api/v1/routing/route`) es para una polilínea suelta, no para estas 47 llamadas. `geocode_address_list` tampoco.

### 16.2 Settings: del formulario viejo al body nuevo

| Campo en `settings_form_controller.js` | Campo nuevo | Regla |
|----------------------------------------|-------------|-------|
| `roadRestrictionType = TIME` | `restrictionType: "time_windows"` | Dispara `plan?mode=packages` |
| `roadRestrictionType = RESOURCE_TIME` | `restrictionType: "resource_vs_time"` | Igual, con peso y volumen |
| `roadRestrictionType = FIXED_ROUTES` | `restrictionType: "fixed_routes"` | `fixedRoutes == 1` puede seguir en el optimizador efímero; si es mayor, `plan?mode=messenger` |
| `fixedRoutes` | `fixedRoutes` | Solo se lee cuando `restrictionType` es `fixed_routes` |
| `backToStartPoint = true` | `routeTopology: "round_trip"` | El depósito ya no viaja dentro del optimizador |
| `backToStartPoint = false` | `routeTopology: "open_delivery"` | Última milla sin regreso |
| depósito elegido en el itinerario | `placeStartId` y, si vuelve, `placeEndId` | ObjectId de `/api/v1/places` |
| `initTime`, `finishTime` | `shiftStartUtc` + `shiftDurationSec` | Inicio en UTC. La duración es el tramo en segundos, no una hora de fin |
| `typeLengthOfStay = FIXED` | `typeLengthOfStay: "fixed"` | |
| `typeLengthOfStay = DEFINE_ITINERARY` | `typeLengthOfStay: "define_itinerary"` | La estadía por parada va en `package.durationStay` |
| `lengthOfStay` | `lengthOfStay` | Sigue en segundos |
| `evaluateWeight`, `evaluateVolume`, `evaluateItineraryZone` | mismos nombres | |
| `evaluateRestrictionPackage` | no existe | Los límites quedan en `resourceType.restriction` |
| `settingResource[]` (`typeVehicle`, `quantity`) | `resourceIds` | Antes se crean el tipo y el recurso (`quantity`, `depotId`). El settings apunta a recursos, no a tipos |

`breakDurationSec` no estaba en el formulario viejo y es parte del recurso, no del settings, salvo que se quiera un descanso global (`settings.breakDurationSec`).

### 16.3 Optimizadores y el CSV

Hoy `itinerary_controller.js` no guarda nada: arma `cargoInput` + `configuration` y navega a `app.routes.list` con `response.data`. Dos de esos tres métodos ya no existen. `journeys/plan` no acepta ese cuerpo: exige `settingsId` y `packageIds` persistidos.

```mermaid
flowchart LR
  csv[CSV upload] --> packages[Paquetes persistidos]
  depot[Lugar deposito] --> settings[Settings]
  fleet[Resources] --> settings
  packages --> plan["POST /journeys/plan"]
  settings --> plan
  plan --> detail[JourneyResponse 201]
```

| Condición en el itinerario | Llamada vieja | Qué hacer |
|----------------------------|---------------|-----------|
| `FIXED_ROUTES` y `fixedRoutes == 1` | `optimalRouteOfPointCloud` | Sigue vivo en `POST /api/v1/routing/optimizations`. Acepta el mismo `CargoConfig`, ahora con JWT. La respuesta no es un `JourneyResponse`: no queda jornada para el listado ni para el PDF. Para guardarla, crear paquetes y settings y llamar `plan?mode=messenger` con `fixedRoutes = 1` |
| `FIXED_ROUTES` y `fixedRoutes > 1` | `optimisationForMessenger` | El método no existe. `POST /api/v1/journeys/plan?mode=messenger`. El efímero `POST /api/v1/routing/messenger` usa `RequestMessenger`, no `CargoConfig` |
| `TIME` o `RESOURCE_TIME` | `optimisationForPackages` | El método no existe. `POST /api/v1/journeys/plan?mode=packages` |

`/api/v1/routing/optimizations/point-route` y `/collection` no sustituyen a ninguna de estas tres llamadas.

El bug `itinerary[i].weigth` deja de importar: el peso se guarda en el paquete (`weight`) antes de planificar. `city: 'BOGOTA'` fijo, `maxiumTime`, `maxiumWeight` y `maxiumVolume` no se envían. La capacidad está en el tipo de recurso; el turno, en el recurso y en el settings.

Upload (fila 41):

- Se quita `?name=`. El título de la jornada va en `plan.name`.
- La respuesta deja de traer `routes[0].packages`. Es `{ totalRows, successCount, errorCount, errors: [{ row, message }] }` con HTTP 200 aunque haya filas malas. `row` es 1-based.
- El itinerario en memoria desaparece. Después del upload la pantalla lista `GET /api/v1/packages`, el usuario elige settings y llama a `plan`. El **201** ocupa el lugar de `response.data`.

`date` del optimizador era `yyyy-MM-dd`. En `plan` es un `Instant` UTC opcional; el algoritmo usa el settings.

### 16.4 Lo que no migra 1:1

- Basic `HANOIT-APP:123456`, `client_id`, `client_secret` y el body `application/x-www-form-urlencoded` del token.
- `error: invalid_token`. La sesión caída es **401** `UNAUTHORIZED`.
- `POST /singup` como alta de un usuario suelto. Ahora abre un tenant.
- `DELETE ?ids=` en tipos, vehículos, conductores, lugares, settings y jornadas. No queda ningún query `ids` en los controllers.
- POST, PUT y DELETE de un catálogo entero.
- `GET /routes` y `GET /journeys/summary` como recursos propios.
- `CargoConfig` (`cargoInput`, `configuration`, `resource[]`, `restriction[]`) en messenger y en packages.
- `routes[0].packages` como resultado del CSV.
- Conductor sin email, sin contraseña y sin asiento.
- Vehículo sin tipo, depósito ni turno.
- Coordenadas `location.x` / `location.y` en geocoding y lugares. Siguen en campos planos solo en posiciones de flota, que este front no llama.

Billing, invitaciones, OTP, zonas, posiciones y la app del conductor no están entre estas 47 llamadas. Siguen documentados en las secciones 6 y 10–13 como capacidad nueva.

### 16.5 Tabla corta

| Antes (path real del front) | Ahora |
|-----------------------------|-------|
| `POST /oauth/token` password | `POST /api/v1/auth/login` |
| `POST /oauth/token` refresh | `POST /api/v1/auth/refresh` |
| `POST /singup` | `POST /api/v1/auth/register` |
| `POST /singup/activate` | `POST /api/v1/auth/verify-email` |
| `POST /forgotPassword` | `POST /api/v1/auth/forgot-password` |
| `POST /forgotPassword/reset` | `POST /api/v1/auth/reset-password` |
| `/hanoit/api/v1/typevehicle` | `/api/v1/resource-types` |
| `/hanoit/api/v1/vehicles` | `/api/v1/resources` |
| `/hanoit/api/v1/driver` | `/api/v1/users` con `role=driver` |
| `/hanoit/api/v1/assignedservice` | `/api/v1/assigned-services` |
| `/hanoit/api/v1/places` | `/api/v1/places` |
| `/hanoit/api/v1/catalogs` | `/api/v1/master-domains` (solo lectura y valores) |
| `/hanoit/api/v1/settings` | `/api/v1/settings` |
| `GET /hanoit/api/v1/journeys/summary` | `GET /api/v1/journeys` |
| `GET /hanoit/api/v1/journeys/:id` | `GET /api/v1/journeys/{id}` |
| `GET /hanoit/api/v1/routes` | waypoints del detalle de jornada |
| `POST /hanoit/api/v1/journey/upload` | `POST /api/v1/packages/upload` |
| `POST /hanoit/api/v1/geocoding` | `POST /api/v1/geocoding` `{ address }` |
| `POST /hanoit/api/v1/reverse_geocoding` | `POST /api/v1/reverse-geocoding` |
| `POST /hanoit/v2/delivery/optimalRouteOfPointCloud` | `POST /api/v1/routing/optimizations` |
| `POST /hanoit/v2/delivery/optimisationForMessenger` | `POST /api/v1/journeys/plan?mode=messenger` |
| `POST /hanoit/v2/delivery/optimisationForPackages` | `POST /api/v1/journeys/plan?mode=packages` |
| Listado arreglo / `{ list, total }` | `{ content, totalElements, totalPages, page, size }` |
| `location.x` / `location.y` | GeoJSON `[lon, lat]` |

Renombres: Vehicle → Resource, TypeVehicle → ResourceType, Driver → User `role=driver`, Catalog → MasterDomain, `roadRestrictionType` → `restrictionType` con los valores de §16.2.