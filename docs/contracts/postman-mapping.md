# Mapeo de la colección Postman del backend

> Fuente: `docs/contracts/source/postman/Hanoit-API.postman_collection.json` (versión del 2026-11-24, tras cerrar G19–G23).
> Regenerar el resumen: `node tools/specs.mjs contract-diff --postman docs/contracts/source/postman/Hanoit-API.postman_collection.json`
> (sale con código 1 si la colección trae un endpoint que no está en `endpoint-coverage.json`).

## Resumen

- **145 peticiones** (sin la carpeta `00`), **145 mapeadas** a `trazabilidad/endpoint-coverage.json`. `contract-diff --postman` termina en **0**.
- **Sin ejemplo en Postman:** ninguno. Ya están los 6 borrados por lote y `GET /packages/upload/limits` (`{maxRows,maxAddressesPerFile,effectiveLimit}`).
- **Sin historia:** ninguna. El backend quitó «List by status» (`GET /packages/status/pending`) el 2026-11-24; el filtro es `GET /packages?status=pending` (PAQ-002).

## Brechas cerradas por el backend (2026-11-24)

| Brecha | Contrato | Historia | Cambio en la spec |
| --- | --- | --- | --- |
| G19 | Jornada recién planificada en `planning`; filtro solo `planning`, `in_progress`, `completed`, `failed`, `cancelled`; `planned`/`dispatched` → 400 | JOR-002 | CA-6 y CA-10 reescritos; pregunta resuelta |
| G20 | Aceptar invitación → 201 `LoginResponse` (`message`, `accessToken`, `refreshToken`, `expiresIn`, `user`); sesión iniciada | EMP-002 | CA-8: guarda tokens y entra; fallback a login solo defensivo |
| G21 | `places/nearby` solo `lon`/`lat`; `longitude`/`latitude` son de zonas y de posición del conductor | MAE-005 | Riesgo cerrado |
| G22 | Checkout 201 `{checkoutUrl,sessionId}`; seats 200 y `quantity` es delta (10 + 3 → 13) | EMP-004 | CA-3 (`checkoutUrl`) y CA-13 (delta) |
| G23 | Colección con lotes y `upload/limits`; `GET /packages/status/{status}` no existe | — | Retirado de la cobertura |
| Búsqueda | `q=G.01` literal: coincide con «guide g.01 north», no con «GX01» | PAQ-002 | CA-19 |

## Comprobado en los ejemplos de la colección

`POST /journeys/plan` 201 con `status: "planning"`; plan asíncrono 202 `{jobId,status:"queued"}` y job 200 `succeeded` con `journeyId`; borrado por lote 200 `results[]` con `deleted`/`not_found`/`conflict`; seats 200 `previousQuantity` 10 → `newQuantity` 13, `seatLimit` 13; checkout 201; aceptar invitación 201 con tokens; `GET /journeys?status=planning`; `GET /places/nearby?lon=&lat=&maxDistance=`.

## Mapeo por carpeta

### 01 Auth & Session [PUBLIC]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Login | `POST /auth/login` | `POST /auth/login` | en alcance | ACC-001 |
| Refresh token | `POST /auth/refresh` | `POST /auth/refresh` | en alcance | ACC-001 |
| Logout | `POST /auth/logout` | `POST /auth/logout` | en alcance | ACC-001 |
| Register | `POST /auth/register` | `POST /auth/register` | en alcance | ACC-002 |
| Verify email (link GET) | `GET /auth/verify-email` | `GET /auth/verify-email` | fuera de alcance | — |
| Verify email (POST) | `POST /auth/verify-email` | `POST /auth/verify-email` | en alcance | ACC-002 |
| Resend verification | `POST /auth/resend-verification` | `POST /auth/resend-verification` | en alcance | ACC-002 |
| Forgot password | `POST /auth/forgot-password` | `POST /auth/forgot-password` | en alcance | ACC-003 |
| Reset password | `POST /auth/reset-password` | `POST /auth/reset-password` | en alcance | ACC-003 |

### 02 Account & Profile [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Get my profile | `GET /auth/me` | `GET /auth/me` | en alcance | ACC-004 |
| Update my profile | `PUT /auth/me` | `PUT /auth/me` | en alcance | ACC-004 |
| Change password | `PUT /auth/change-password` | `PUT /auth/change-password` | en alcance | ACC-004 |

### 03 Tenants

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Get my tenant | `GET /tenants/me` | `GET /tenants/me` | en alcance | EMP-001, EMP-003 |
| Update my tenant | `PUT /tenants/me` | `PUT /tenants/me` | en alcance | EMP-003 |
| Update billing info | `PUT /tenants/me/billing` | `PUT /tenants/me/billing` | en alcance | EMP-003 |
| Create tenant | `POST /tenants` | `POST /tenants` | en alcance | PLA-001 |
| List tenants | `GET /tenants` | `GET /tenants` | en alcance | PLA-001 |
| Get tenant by id | `GET /tenants/{tenant_id}` | `GET /tenants/{id}` | en alcance | PLA-001 |
| Get tenant by slug | `GET /tenants/slug/acme-logistics` | `GET /tenants/slug/{slug}` | en alcance | PLA-001 |
| Update tenant | `PUT /tenants/{tenant_id}` | `PUT /tenants/{id}` | en alcance | PLA-001 |
| Deactivate tenant (unified) | `PATCH /tenants/{tenant_id}` | `PATCH /tenants/{id}` | en alcance | PLA-001 |
| Activate tenant (unified) | `PATCH /tenants/{tenant_id}` | `PATCH /tenants/{id}` | en alcance | PLA-001 |

### 04 Users & Team [TENANT_ADMIN]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| List users | `GET /users` | `GET /users` | en alcance | MAE-003, EMP-001 |
| List drivers | `GET /users/drivers` | `GET /users/drivers` | en alcance | MAE-003 |
| Get user by id | `GET /users/{created_user_id}` | `GET /users/{id}` | en alcance | MAE-003, EMP-001 |
| Create user (agent) | `POST /users` | `POST /users` | en alcance | MAE-003, EMP-001 |
| Create user (driver) | `POST /users` | `POST /users` | en alcance | MAE-003, EMP-001 |
| Update user (role / active) | `PUT /users/{created_user_id}` | `PUT /users/{id}` | en alcance | MAE-003, EMP-001 |
| Reset user password (admin) | `POST /users/{created_user_id}/reset-password` | `POST /users/{id}/reset-password` | en alcance | EMP-001 |
| Delete user (soft delete) | `DELETE /users/{created_user_id}` | `DELETE /users/{id}` | en alcance | MAE-003, EMP-001 |
| Batch delete users | `POST /users/batch-delete` | `POST /users/batch-delete` | en alcance | MAE-003, EMP-001 |

### 05 Invitations

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Create invitation [TENANT_ADMIN] | `POST /invitations` | `POST /invitations` | en alcance | EMP-002 |
| List invitations [TENANT_ADMIN] | `GET /invitations` | `GET /invitations` | en alcance | EMP-002 |
| Resend invitation [TENANT_ADMIN] | `POST /invitations/{invitation_token}/resend` | `POST /invitations/{token}/resend` | en alcance | EMP-002 |
| Revoke invitation [TENANT_ADMIN] | `DELETE /invitations/{invitation_id}` | `DELETE /invitations/{id}` | en alcance | EMP-002 |
| Preview invitation [PUBLIC] | `GET /invitations/accept/{invitation_token}` | `GET /invitations/accept/{token}` | en alcance | EMP-002 |
| Accept invitation [PUBLIC] | `POST /invitations/accept/{invitation_token}` | `POST /invitations/accept/{token}` | en alcance | EMP-002 |

### 06 Billing & Subscriptions [TENANT_ADMIN]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Get subscription | `GET /billing/subscription` | `GET /billing/subscription` | en alcance | EMP-004 |
| Create checkout session | `POST /billing/checkout` | `POST /billing/checkout` | en alcance | EMP-004 |
| Create customer portal session | `POST /billing/portal` | `POST /billing/portal` | en alcance | EMP-004 |
| Upgrade plan / interval | `POST /billing/upgrade` | `POST /billing/upgrade` | en alcance | EMP-004 |
| Change seats | `PUT /billing/seats` | `PUT /billing/seats` | en alcance | EMP-004 |
| Cancel subscription | `POST /billing/cancel` | `POST /billing/cancel` | en alcance | EMP-004 |
| List invoices | `GET /billing/invoices` | `GET /billing/invoices` | en alcance | EMP-004 |
| Get usage | `GET /billing/usage` | `GET /billing/usage` | en alcance | EMP-004 |

### 07 Notifications

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Send OTP [PUBLIC] | `POST /notifications/otp/send` | `POST /notifications/otp/send` | en alcance | EMP-005 |
| Resend OTP [PUBLIC] | `POST /notifications/otp/resend` | `POST /notifications/otp/resend` | en alcance | EMP-005 |
| Verify OTP [PUBLIC] | `POST /notifications/otp/verify` | `POST /notifications/otp/verify` | en alcance | EMP-005 |
| Register device (push) [AUTH] | `POST /notifications/push/register` | `POST /notifications/push/register` | en alcance | EMP-005 |
| Unregister device (push) [AUTH] | `DELETE /notifications/push/unregister` | `DELETE /notifications/push/unregister` | en alcance | EMP-005 |
| Get preferences [AUTH] | `GET /notifications/preferences` | `GET /notifications/preferences` | en alcance | EMP-005 |
| Update preferences [AUTH] | `PUT /notifications/preferences` | `PUT /notifications/preferences` | en alcance | EMP-005 |

### 08 Audit Logs

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| My activity [AUTH] | `GET /audit-logs/me` | `GET /audit-logs/me` | en alcance | EMP-006 |
| Tenant logs [TENANT_ADMIN] | `GET /audit-logs` | `GET /audit-logs` | en alcance | EMP-006 |
| Get log by id [TENANT_ADMIN] | `GET /audit-logs/AUDIT_LOG_ID` | `GET /audit-logs/{id}` | en alcance | EMP-006 |
| Global logs [SUPER_ADMIN] | `GET /audit-logs/admin` | `GET /audit-logs/admin` | en alcance | PLA-002 |

### 09 Journeys & Routing [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Plan journey | `POST /journeys/plan` | `POST /journeys/plan` | en alcance | JOR-001 |
| Plan journey async | `POST /journeys/plan` | `POST /journeys/plan` | en alcance | JOR-001 |
| Plan job status | `GET /journeys/plan/jobs/{plan_job_id}` | `GET /journeys/plan/jobs/{jobId}` | en alcance | JOR-001 |
| Plan journey (messenger mode) | `POST /journeys/plan` | `POST /journeys/plan` | en alcance | JOR-001 |
| List journeys | `GET /journeys` | `GET /journeys` | en alcance | JOR-002 |
| Get journey by id | `GET /journeys/{journey_id}` | `GET /journeys/{id}` | en alcance | JOR-003 |
| List journeys by status | `GET /journeys` | `GET /journeys` | en alcance | JOR-002 |
| Get navigations | `GET /journeys/{journey_id}/navigations` | `GET /journeys/{journeyId}/navigations` | en alcance | JOR-004 |
| Get navigation by route index | `GET /journeys/{journey_id}/navigations/0` | `GET /journeys/{journeyId}/navigations/{routeIndex}` | en alcance | JOR-004 |
| Get journey metrics | `GET /journeys/{journey_id}/metrics` | `GET /journeys/{journeyId}/metrics` | en alcance | JOR-004 |
| Delete journey | `DELETE /journeys/{journey_id}` | `DELETE /journeys/{id}` | en alcance | JOR-002 |
| Package statuses | `GET /journeys/{journey_id}/package-statuses` | `GET /journeys/{id}/package-statuses` | en alcance | JOR-003, JOR-006 |
| Batch delete journeys | `POST /journeys/batch-delete` | `POST /journeys/batch-delete` | en alcance | JOR-002 |

### 09b Routing Engine [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| POST directions | `POST /routing/directions` | `POST /routing/directions` | en alcance | JOR-007 |
| POST matrix | `POST /routing/matrix` | `POST /routing/matrix` | en alcance | JOR-007 |
| POST route (single) | `POST /routing/route` | `POST /routing/route` | en alcance | JOR-007 |
| POST nearest | `POST /routing/nearest` | `POST /routing/nearest` | en alcance | JOR-007 |
| POST messenger | `POST /routing/messenger` | `POST /routing/messenger` | en alcance | JOR-007 |
| POST optimizations | `POST /routing/optimizations` | `POST /routing/optimizations` | en alcance | JOR-007 |
| POST optimizations/point-route | `POST /routing/optimizations/point-route` | `POST /routing/optimizations/point-route` | en alcance | JOR-007 |
| POST optimizations/collection | `POST /routing/optimizations/collection` | `POST /routing/optimizations/collection` | en alcance | JOR-007 |

### 10 Driver [DRIVER]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| List my routes | `GET /driver/routes` | `GET /driver/routes` | fuera de alcance | — |
| Get route detail | `GET /driver/routes/{journey_id}/0` | `GET /driver/routes/{journeyId}/{routeIndex}` | fuera de alcance | — |
| Post driver position | `POST /driver/positions` | `POST /driver/positions` | fuera de alcance | — |
| Latest positions (tenant) | `GET /positions` | `GET /positions` | en alcance | SEG-001 |
| Latest position of a driver | `GET /positions/{user_id}` | `GET /positions/{driverId}` | en alcance | SEG-001 |
| Report package delivery | `PUT /driver/packages/report` | `PUT /driver/packages/report` | fuera de alcance | — |

### 11 Packages [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| List packages | `GET /packages` | `GET /packages` | en alcance | PAQ-002, JOR-006 |
| Search packages | `GET /packages` | `GET /packages` | en alcance | PAQ-002, JOR-006 |
| Get package by id | `GET /packages/{package_id}` | `GET /packages/{id}` | en alcance | PAQ-002 |
| List by service type | `GET /packages` | `GET /packages` | en alcance | PAQ-002, JOR-006 |
| Create package | `POST /packages` | `POST /packages` | en alcance | PAQ-002 |
| Upload packages (file) | `POST /packages/upload` | `POST /packages/upload` | en alcance | PAQ-003 |
| Upload limits | `GET /packages/upload/limits` | `GET /packages/upload/limits` | en alcance | PAQ-003 |
| Update package | `PUT /packages/{package_id}` | `PUT /packages/{id}` | en alcance | PAQ-002 |
| Update package status | `PATCH /packages/{package_id}/status/unattended` | `PATCH /packages/{id}/status/{status}` | en alcance | PAQ-002, JOR-006 |
| Update package statuses | `PATCH /packages/status` | `PATCH /packages/status` | en alcance | PAQ-002 |
| Delete package | `DELETE /packages/{package_id}` | `DELETE /packages/{id}` | en alcance | PAQ-002 |
| List status reasons | `GET /package-status-reasons` | `GET /package-status-reasons` | en alcance | MAE-009, PAQ-002, JOR-006 |
| Create status reason | `POST /package-status-reasons` | `POST /package-status-reasons` | en alcance | MAE-009 |
| Update status reason | `PUT /package-status-reasons/customer_absent` | `PUT /package-status-reasons/{key}` | en alcance | MAE-009 |
| Toggle status reason | `PATCH /package-status-reasons/customer_absent/toggle` | `PATCH /package-status-reasons/{key}/toggle` | en alcance | MAE-009 |

### 12 Places & Zones [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| List places | `GET /places` | `GET /places` | en alcance | MAE-005 |
| Get place by id | `GET /places/{place_id}` | `GET /places/{id}` | en alcance | MAE-005 |
| Nearby places | `GET /places/nearby` | `GET /places/nearby` | en alcance | MAE-005 |
| Create place | `POST /places` | `POST /places` | en alcance | MAE-005 |
| Update place | `PUT /places/{place_id}` | `PUT /places/{id}` | en alcance | MAE-005 |
| Delete place | `DELETE /places/{place_id}` | `DELETE /places/{id}` | en alcance | MAE-005 |
| Batch delete places | `POST /places/batch-delete` | `POST /places/batch-delete` | en alcance | MAE-005 |
| List zones | `GET /zones` | `GET /zones` | en alcance | MAE-006 |
| Get zone by id | `GET /zones/{zone_id}` | `GET /zones/{id}` | en alcance | MAE-006 |
| Zone containing point | `GET /zones/containing` | `GET /zones/containing` | en alcance | MAE-005, MAE-006 |
| Create zone | `POST /zones` | `POST /zones` | en alcance | MAE-006 |
| Update zone | `PUT /zones/{zone_id}` | `PUT /zones/{id}` | en alcance | MAE-006 |
| Delete zone | `DELETE /zones/{zone_id}` | `DELETE /zones/{id}` | en alcance | MAE-006 |

### 13 Resources & Resource Types [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| List resource types | `GET /resource-types` | `GET /resource-types` | en alcance | MAE-001 |
| List active resource types | `GET /resource-types` | `GET /resource-types` | en alcance | MAE-001 |
| Get resource type by id | `GET /resource-types/{resource_type_id}` | `GET /resource-types/{id}` | en alcance | MAE-001 |
| Create resource type | `POST /resource-types` | `POST /resource-types` | en alcance | MAE-001 |
| Update resource type | `PUT /resource-types/{resource_type_id}` | `PUT /resource-types/{id}` | en alcance | MAE-001 |
| Delete resource type | `DELETE /resource-types/{resource_type_id}` | `DELETE /resource-types/{id}` | en alcance | MAE-001 |
| Batch delete resource-types | `POST /resource-types/batch-delete` | `POST /resource-types/batch-delete` | en alcance | MAE-001 |
| List resources | `GET /resources` | `GET /resources` | en alcance | MAE-002 |
| List active resources | `GET /resources` | `GET /resources` | en alcance | MAE-002 |
| Get resource by id | `GET /resources/{resource_id}` | `GET /resources/{id}` | en alcance | MAE-002 |
| Create resource | `POST /resources` | `POST /resources` | en alcance | MAE-002 |
| Update resource | `PUT /resources/{resource_id}` | `PUT /resources/{id}` | en alcance | MAE-002 |
| Assign driver | `PUT /resources/{resource_id}/driver/{created_user_id}` | `PUT /resources/{id}/driver/{driverId}` | en alcance | MAE-002 |
| Unassign driver | `DELETE /resources/{resource_id}/driver` | `DELETE /resources/{id}/driver` | en alcance | MAE-002 |
| Delete resource | `DELETE /resources/{resource_id}` | `DELETE /resources/{id}` | en alcance | MAE-002 |
| Batch delete resources | `POST /resources/batch-delete` | `POST /resources/batch-delete` | en alcance | MAE-002 |

### 14 Settings & Master Domains [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| List settings | `GET /settings` | `GET /settings` | en alcance | PAQ-001 |
| List active settings | `GET /settings` | `GET /settings` | en alcance | PAQ-001 |
| Get settings by id | `GET /settings/{settings_id}` | `GET /settings/{id}` | en alcance | PAQ-001 |
| Create settings | `POST /settings` | `POST /settings` | en alcance | PAQ-001 |
| Update settings | `PUT /settings/{settings_id}` | `PUT /settings/{id}` | en alcance | PAQ-001 |
| Delete settings | `DELETE /settings/{settings_id}` | `DELETE /settings/{id}` | en alcance | PAQ-001 |
| Batch delete settings | `POST /settings/batch-delete` | `POST /settings/batch-delete` | en alcance | PAQ-001 |
| Platform measurement units | `GET /units` | `GET /units` | en alcance | FND-003 |
| List master domains | `GET /master-domains` | `GET /master-domains` | en alcance | FND-003, MAE-007 |
| Get master domain by code | `GET /master-domains/{master_domain_code}` | `GET /master-domains/{code}` | en alcance | FND-003, MAE-007 |
| Get domain values | `GET /master-domains/{master_domain_code}/values` | `GET /master-domains/{code}/values` | en alcance | FND-003, MAE-007 |
| Add domain value | `POST /master-domains/audit_actions/values` | `POST /master-domains/{code}/values` | en alcance | MAE-007 |
| Toggle domain value | `PATCH /master-domains/audit_actions/values/report.export/toggle` | `PATCH /master-domains/{code}/values/{key}/toggle` | en alcance | MAE-007 |

### 15 Geocoding [AUTH]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Geocode address | `POST /geocoding` | `POST /geocoding` | en alcance | MAE-004 |
| Reverse geocode | `POST /reverse-geocoding` | `POST /reverse-geocoding` | en alcance | MAE-004 |

### 16 Admin [SUPER_ADMIN]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Get geocoding config | `GET /admin/geocoding-config` | `GET /admin/geocoding-config` | en alcance | PLA-003 |
| Replace geocoding config | `PUT /admin/geocoding-config` | `PUT /admin/geocoding-config` | en alcance | PLA-003 |

### 17 Webhooks [PUBLIC]

| Petición Postman | Ruta en la colección | Endpoint (cobertura) | Alcance | Historias |
| --- | --- | --- | --- | --- |
| Stripe webhook | `POST /webhooks/stripe` | `POST /webhooks/stripe` | fuera de alcance | — |
