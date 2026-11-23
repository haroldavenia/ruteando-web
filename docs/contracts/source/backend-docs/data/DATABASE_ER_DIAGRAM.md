# HanoIT - Diagrama ER y Modelo de Datos

**Badge:** Estado: Actualizado | Fase 1 + Fase 4 | Fecha: 2026-11-19

Base de datos: **hanoit** (MongoDB). Este documento resume el modelo relacional lógico sobre colecciones: entidades Fase 1 + Fase 4. El modelo legacy se retiró el 2026-11-19 (ver [Colecciones legacy retiradas](#colecciones-legacy-retiradas)).

---

## Modelo Actual (Fase 1 + Fase 4)

Veintiuna colecciones con multitenancy por `tenantId` (salvo los globales `master_domains`, `geocoding_config` y `refresh_tokens`, y las colecciones temporales `otp_codes` y `stripe_webhook_events`, que persisten para idempotencia y se purgan por TTL). Coordenadas en GeoJSON: **Point** y **Polygon** con índice **2dsphere** donde aplica.

```mermaid
erDiagram
    tenants {
        ObjectId _id PK
        string name
        string slug UK
        string taxId UK_sparse
        string country
        string timezone
        string plan "enum free basic standard premium enterprise"
        document config "TenantConfig"
        bool isActive
        datetime createdAt
        datetime updatedAt
        string billingEmail "F4"
        document billingAddress "F4"
        string companySize "F4 enum"
        string industry "F4 opcional"
        string stripeCustomerId "F4"
        string stripeSubscriptionId "F4"
        int seatLimit "F4 = subscription.quantity (paid) | 2 (free/trial) | custom (enterprise)"
        int seatUsed "F4 contador operativo crítico (mantenido por SeatEnforcementService + reconciliación on-startup)"
        string trialPlan "F4 nullable"
        datetime trialStartedAt "F4"
        datetime trialEndsAt "F4"
        int trialSeatLimit "F4 siempre 2"
        bool trialExpired "F4"
        datetime trialReminderSentAt "F4 idempotencia del recordatorio T-3"
        string subscriptionStatus "F4 enum"
        datetime canceledAt "F4"
        datetime deactivatedAt "F4"
        ObjectId deactivatedBy "F4 FK users"
        string deactivationReason "F4"
    }

    users {
        ObjectId _id PK
        ObjectId tenantId FK
        string email
        string passwordHash
        string firstName
        string lastName
        string phone
        string role "enum super_admin tenant_admin agent driver"
        string identifierType "enum IdentifierType (license en conductores)"
        string identifierValue "nro de licencia si identifierType=license"
        string avatar
        string fcmToken
        datetime lastLoginAt
        bool isActive
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
        ObjectId createdBy
        bool emailVerified "F4"
        string emailVerificationToken "F4"
        datetime emailVerificationExpiresAt "F4"
        string passwordResetToken "F4"
        datetime passwordResetExpiresAt "F4"
        ObjectId invitedBy "F4 FK users"
        datetime invitationAcceptedAt "F4"
        datetime lastPasswordChangedAt "F4"
        int loginAttempts "F4"
        datetime lockedUntil "F4"
        bool phoneVerified "F4"
        document notificationPreferences "F4 embedded"
        array deviceTokens "F4 push tokens"
    }

    master_domains {
        ObjectId _id PK
        string code UK
        string description
        bool isSystem
        array values "List DomainValue"
    }

    zones {
        ObjectId _id PK
        ObjectId tenantId FK
        string name
        string code
        document boundary "GeoJSON Polygon 2dsphere"
        string color
        bool isActive
        datetime createdAt
        datetime updatedAt
    }

    resource_types {
        ObjectId _id PK
        ObjectId tenantId FK
        string category
        string name
        string osrmProfile
        document capacity "Capacity"
        document measure "ResourceMeasure"
        document restriction "ResourceRestriction"
        number gasMileage
        bool isActive
        datetime createdAt
        datetime updatedAt
    }

    places {
        ObjectId _id PK
        ObjectId tenantId FK
        string name
        string type
        string address
        document location "GeoJSON Point 2dsphere"
        string phoneNumber
        string contactName
        ObjectId zoneId
        bool isActive
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
        ObjectId createdBy
    }

    resources {
        ObjectId _id PK
        ObjectId tenantId FK
        ObjectId resourceTypeId FK
        ObjectId driverId FK
        string name
        string licensePlate
        ObjectId depotId FK
        datetime shiftStartUtc
        int shiftDurationSec
        int breakDurationSec
        int quantity
        bool isDefault
        document allowedRestrictions "AllowedRestrictions"
        bool isActive
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    settings {
        ObjectId _id PK
        ObjectId tenantId FK
        ObjectId createdBy
        string description
        string routeTopology
        string restrictionType
        ObjectId placeStartId FK
        ObjectId placeEndId FK
        bool evaluateWeight
        bool evaluateVolume
        bool evaluateItineraryZone
        int fixedRoutes
        int lengthOfStay
        string typeLengthOfStay
        datetime shiftStartUtc
        int shiftDurationSec
        int breakDurationSec
        array resourceIds "List ObjectId"
        bool isActive
        datetime createdAt
        datetime updatedAt
    }

    packages {
        ObjectId _id PK
        ObjectId tenantId FK
        string guideNumber UK_partial
        string name
        string serviceType
        string address
        string standardizedAddress
        document location "GeoJSON Point 2dsphere"
        number geocodingScore
        string geocodingStatus
        string city
        string country
        string postalCode
        ObjectId zoneId FK
        number weight "gramos"
        number volume "cm3"
        int pieceNumber
        document measure "PackageMeasure cm"
        int durationStay "segundos"
        document timeWindow "TimeWindow"
        string category
        array goodsTags
        ObjectId customerId
        document receiver "PackagePerson"
        document sender "PackagePerson"
        string observation
        string status
        string statusReason "key de package_status_reasons"
        datetime createdAt
        datetime updatedAt
        ObjectId createdBy
    }

    package_status_reasons {
        ObjectId _id PK
        ObjectId tenantId FK
        string key "UK con tenantId"
        string label
        string description
        array appliesTo "PackageStatus keys"
        bool isActive
        int sortOrder
        datetime createdAt
        datetime updatedAt
        ObjectId createdBy
    }

    journeys {
        ObjectId _id PK
        ObjectId tenantId FK
        ObjectId createdBy
        ObjectId settingsId FK
        string name
        string status
        int totalServices
        int totalResources
        int totalZones
        document stats "JourneyStats"
        array invalidPackageIds
        array routes "List EmbeddedRoute"
        array resourceSummary "ResourceSummaryItem"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    route_navigations {
        ObjectId _id PK
        ObjectId tenantId FK
        ObjectId journeyId FK
        int routeIndex
        string osrmVersion
        array instructionsLegacy
        array viaPointsLegacy
        array legs "List NavigationLeg"
        array snappedWaypoints "SnappedWaypoint"
        datetime createdAt
    }

    journey_metrics {
        ObjectId _id PK
        ObjectId tenantId FK
        ObjectId journeyId "FK UK"
        number distance
        number efficiency
        number weightAccum
        number volumeAccum
        number avgAttendWeightPct
        number avgAttendVolumePct
        number attendServicesPct
        int attendedRoutes
        int attendedServices
        int totalServices
        int usedResources
        int totalResources
        int attendedCustomers
        int attendedZones
        array serviceTypes
        array packageTags
        array usedResourceTypes
        datetime createdAt
    }

    invitations {
        ObjectId _id PK
        ObjectId tenantId FK
        string email
        string role "enum agent driver"
        string token UK
        string status "enum pending accepted expired revoked"
        ObjectId invitedBy "FK users"
        datetime expiresAt "now + 7d"
        datetime deleteAt "TTL index, null tras accept o revoke"
        datetime acceptedAt
        ObjectId acceptedUserId "FK users"
        document metadata "firstName lastName phone"
        datetime createdAt
        datetime updatedAt
    }

    subscriptions {
        ObjectId _id PK
        ObjectId tenantId "FK UK"
        string stripeSubscriptionId UK
        string stripeCustomerId
        string stripePriceId
        string plan "enum"
        string billingInterval "enum monthly annual"
        string status "enum trialing active past_due canceled unpaid incomplete"
        datetime currentPeriodStart
        datetime currentPeriodEnd
        int seatQuantity
        int seatUnitPrice "centavos"
        string currency
        datetime trialStart
        datetime trialEnd
        bool cancelAtPeriodEnd
        datetime canceledAt
        string latestInvoiceId
        string latestInvoiceStatus
        string latestInvoicePdfUrl
        document metadata
        datetime createdAt
        datetime updatedAt
    }

    otp_codes {
        ObjectId _id PK
        string otpId UK
        string recipientHash "hash teléfono o email"
        string codeHash
        string channel "enum sms email"
        string purpose "enum phone_verification login_2fa email_2fa"
        int attempts "max 3"
        int resendCount "max 2"
        datetime expiresAt "TTL index"
        datetime createdAt
    }

    audit_logs {
        ObjectId _id PK
        ObjectId tenantId "FK nullable"
        ObjectId actorId "FK users"
        string actorEmail "denormalized"
        string actorRole
        string action "ver catalogo"
        string actionCategory "admin auth billing notification operation"
        string entityType
        ObjectId entityId
        string description
        document changes "before after"
        string ipAddress
        string userAgent
        document metadata
        datetime createdAt "inmutable"
    }

    stripe_webhook_events {
        ObjectId _id PK
        string stripeEventId UK "idempotencia"
        string type "ej. customer.subscription.updated"
        string status "RECEIVED PROCESSED FAILED"
        ObjectId tenantId "FK nullable (resuelto desde stripeCustomerId)"
        document payload "raw event"
        string error
        datetime receivedAt
        datetime processedAt
        datetime expiresAt "TTL ~30 días"
    }

    vehicle_positions {
        ObjectId _id PK
        ObjectId tenantId FK
        ObjectId driverId "FK users role driver"
        ObjectId resourceId "FK resources nullable"
        Point location "GeoJSON 2dsphere"
        string address
        datetime recordedAt "UTC"
        datetime createdAt
    }

    geocoding_config {
        string _id PK "singleton global"
        document geocoding "GeocodingServicesConfiguration"
        datetime updatedAt
    }

    refresh_tokens {
        string _id PK
        string token UK
        string username UK "una sesion por usuario"
        datetime expiryDate
        bool revoked
    }

    tenants ||--o{ users : "tenantId"
    tenants ||--o{ zones : "tenantId"
    tenants ||--o{ resource_types : "tenantId"
    tenants ||--o{ places : "tenantId"
    tenants ||--o{ resources : "tenantId"
    tenants ||--o{ settings : "tenantId"
    tenants ||--o{ packages : "tenantId"
    tenants ||--o{ package_status_reasons : "tenantId"
    package_status_reasons ||--o{ packages : "tenantId + key = statusReason"
    tenants ||--o{ journeys : "tenantId"
    tenants ||--o{ route_navigations : "tenantId"
    tenants ||--o{ journey_metrics : "tenantId"

    resource_types ||--o{ resources : "resourceTypeId"
    places ||--o{ resources : "depotId"
    users ||--o{ resources : "driverId"

    places ||--o{ settings : "placeStartId"
    places ||--o{ settings : "placeEndId"

    settings ||--o{ journeys : "settingsId"
    journeys ||--o{ route_navigations : "journeyId"
    journeys ||--|| journey_metrics : "journeyId"

    zones ||--o{ packages : "zoneId"

    tenants ||--o{ invitations : "tenantId"
    tenants ||--|| subscriptions : "tenantId"
    tenants ||--o{ audit_logs : "tenantId"
    users ||--o{ invitations : "invitedBy"
    users ||--o{ audit_logs : "actorId"
    tenants ||--o{ vehicle_positions : "tenantId"
    users ||--o{ vehicle_positions : "driverId"
    resources ||--o{ vehicle_positions : "resourceId"
    users ||--o| refresh_tokens : "username"
```

> **Nota:** `master_domains` es catálogo global (dominios y valores maestros); no referencia `tenantId`. `journeys.routes` almacena rutas como subdocumentos (`EmbeddedRoute`); la navegación OSRM detallada vive en `route_navigations`. `otp_codes` es temporal (TTL auto-delete) y no referencia `tenantId`. Los campos marcados con **F4** fueron agregados en la Fase 4.

---

## Colecciones legacy retiradas

El modelo anterior a la Fase 1 (aislamiento por `userId` string, OAuth con `roles`) se retiró el 2026-11-19 junto con su código y la migración de datos. No hay entidades Java mapeadas a esas colecciones. Si una base las conserva (`journey`, `route`, `package`, `setting`, `vehicle`, `typeVehicle`, `driver`, `place`, `catalog`, `roles`, `assignedService`, `globalConfiguration`, `positionVehicle`, `oauth_*`, …), se borran con el script versionado de [`LEGACY_DB_CLEANUP.md`](../operations/LEGACY_DB_CLEANUP.md). La correspondencia histórica de conceptos está en [`migration-map.md`](migration-map.md).

---

## Subdocumentos Embebidos

Tipos reutilizados dentro de documentos Fase 1 (no son colecciones propias):

| Tipo | Uso breve |
|------|-----------|
| **TenantConfig** | Límites del plan en `tenants.config` (`maxDeposits`, `maxDrivers`, `maxRoutesMonthly`, `maxAdmins`, `maxAddressesPerFile`, `maxGeocodedAddresses`, `maxDefaultResources`). Sin unidades de medida: son de plataforma (dominio `MeasurementUnit`). |
| **DomainValue** | Entradas del catálogo en `master_domains.values` (`code`, `label`, orden, metadata). |
| **Capacity** | Límites de carga en `resource_types.capacity` (peso, volumen, piezas, dimensiones). |
| **ResourceMeasure** | Medidas físicas del tipo de recurso / vehículo. |
| **ResourceRestriction** | Restricciones min/max por envío en el tipo de recurso. |
| **AllowedRestrictions** | Restricciones efectivas por recurso individual (`resources`). |
| **PackageMeasure** | Dimensiones del paquete cuando aplica medición detallada. |
| **PackagePerson** | Datos de remitente/receptor (`packages.sender` / `packages.receiver`). |
| **TimeWindow** | Ventana horaria del servicio en el paquete. |
| **EmbeddedRoute** | Ruta materializada dentro de `journeys.routes` (waypoints, paquetes asignados, métricas de ruta). |
| **Waypoint** | Punto de paso o parada dentro de una ruta embebida. `stopType`: `depot` (con `placeId`), `delivery` o `pickup` (con `packageId`; sale de `packages.serviceType`, `mixed` → `delivery`). Las jornadas anteriores al 2026-11-17 pueden traer `service`. |
| **JourneyStats** | Agregados de la jornada en `journeys.stats`. |
| **ResourceSummaryItem** | Entradas de `journeys.resourceSummary` (uso por recurso o tipo). |
| **NavigationLeg** | Tramo OSRM en `route_navigations.legs`. |
| **NavigationStep** | Paso dentro de un leg (instrucción, geometría, distancia/duración). |
| **StepManeuver** | Maniobra asociada a un paso (tipo, bearing, ubicación). |
| **SnappedWaypoint** | Punto proyectado a la red vial en `route_navigations.snappedWaypoints`. |
| **BillingAddress** | Dirección de facturación en `tenants.billingAddress` (line1, line2, city, state, postalCode, country). (F4) |
| **NotificationPreferences** | Preferencias de notificación por canal en `users.notificationPreferences` (email, sms, push). (F4) |
| **DeviceToken** | Token FCM para push en `users.deviceTokens[]` (token, platform, registeredAt). (F4) |
| **InvitationMetadata** | Datos pre-llenados del invitado en `invitations.metadata` (firstName, lastName, phone). (F4) |
| **AuditChanges** | Par before/after para diffs en `audit_logs.changes`. (F4) |

---

## Relaciones Clave

**Multitenancy.** Casi todas las entidades de negocio cuelgan de `tenants` mediante `tenantId`, lo que delimita consultas y políticas de seguridad (JWT + contexto de tenant).

**Usuarios y recursos.** `users` representa cuentas con rol RBAC por tenant. `resources.driverId` enlaza opcionalmente un recurso de flota con el usuario conductor; la flota tipada proviene de `resource_types`.

**Tipos y depósitos.** `resources.resourceTypeId` apunta al catálogo tipado por tenant. `resources.depotId` referencia un `places` usado como base o depósito; coincide con el modelo de topología en configuración.

**Configuración de ruteo.** `settings` centraliza topología (`routeTopology`), tipo de restricción (`restrictionType`), turnos globales y la lista `resourceIds`. Opcionalmente ancla inicio/fin con `placeStartId` y `placeEndId` sobre `places` cuando la topología lo exige.

**Jornadas y métricas.** `journeys` referencia la `settings` aplicada al planificar. Las instrucciones detalladas y geometría por ruta se externalizan a `route_navigations` (una fila por `journeyId` + `routeIndex`). Los KPI consolidados de la jornada viven en `journey_metrics` en relación 1:1 con el journey (clave única por `journeyId`).

**Posiciones de flota.** `vehicle_positions` guarda cada GPS que reporta un conductor (`users` con rol `driver`) desde la app. `resourceId` es el recurso cuyo `driverId` era el conductor al reportar (nulo si no tenía). Índice compuesto `tenantId + driverId + recordedAt` (desc) para servir la última posición por conductor. Cada reporte también se publica en RabbitMQ (`vehicle.exchange`) y deja el audit log `driver.position.report` (sin coordenadas).

**Configuración de geocodificación.** `geocoding_config` es un singleton global (`_id: "global"`) con la estrategia y los límites de ArcGIS y Geocentrix. Si no existe, la API usa los valores por defecto; lo edita el SUPER_ADMIN con `PUT /api/v1/admin/geocoding-config`.

**Paquetes y zonas.** `packages.zoneId` clasifica geográficamente el servicio respecto a `zones` del mismo tenant; geocodificación y estado se mantienen en el propio documento de paquete.

**Dominios maestros.** `master_domains` guarda solo los catálogos que no salen de un enum: `audit_actions` (editable) y `MeasurementUnit` (solo lectura). Los doce catálogos respaldados por enums (`OsrmProfile`, `RouteTopology`, `RestrictionType`, `TypeLengthOfStay`, `IdentifierType`, `ServiceType`, `PackageStatus`, `GeocodingStatus`, `Role`, `JourneyStatus`, `PlaceType`, `StopType`) no se guardan: la API los arma desde el código. Las copias que quedaran en una base antigua las borra el script de [`LEGACY_DB_CLEANUP.md`](../operations/LEGACY_DB_CLEANUP.md).

**Motivos de estado.** `package_status_reasons` es el catálogo de motivos de cada tenant (índice único `tenantId + key`). `packages.statusReason` guarda la `key` de un motivo activo cuyo `appliesTo` incluye `packages.status`. Los motivos no se borran, se desactivan.

**Unidades de medida.** Son de plataforma, no de tenant, y se registran en el dominio `MeasurementUnit` de `master_domains` (solo lectura; `key` = unidad, `category` = magnitud): peso `g`, volumen `cm3`, dimensiones `cm`, distancia `m`, duración `s`. Todos los campos numéricos de peso (`packages.weight`, `resource_types.capacity.weight`, `restriction.*Weight`, `routes.weightUsed`, `waypoints.weight*`, `journey_metrics.weightAccum`), volumen, dimensiones (`measure.*`), distancia (`distance*`) y duración (`duration*`, `durationStay`, `lengthOfStay`, `*Sec`) se guardan en esas unidades. Las fechas son `ISODate` UTC. `GET /api/v1/units` las expone.

**Invitaciones (F4).** `invitations` registra las invitaciones enviadas por un TENANT_ADMIN para que agentes y conductores se registren en su tenant. Cada invitación tiene un `token` único con expiración de 7 días. Índice unique parcial `(tenantId, email)` con filtro `status: "pending"` impide dos pendientes al mismo email pero conserva el histórico aceptado/revocado/expirado. El filtro depende de que `status` se persista en lowercase, garantizado por los converters BSON `InvitationStatus{Read,Write}Converter` registrados en `MongoConfig` (post-F4-06). El TTL recae sobre `deleteAt` (no sobre `expiresAt`), que se anula al aceptar o revocar para que la invitación quede como auditoría permanente. Al aceptar se crea un `user` (`emailVerified=true`, `invitedBy`, `invitationAcceptedAt`), se vincula vía `acceptedUserId` y se incrementa atómicamente `tenants.seatUsed` vía `SeatEnforcementService`.

**Suscripciones (F4 — per-seat con tiers).** `subscriptions` es mirror local de Stripe Subscriptions (fuente de verdad = Stripe). Una suscripción por tenant (`tenantId` unique). Sincronizada vía webhooks. Almacena `plan`, `quantity` (seats comprados, variable), `unitAmount` (precio por seat), `amount = unitAmount × quantity`, `billingInterval`, período actual y última factura. El `tenant.seatLimit` se mantiene sincronizado con `subscription.quantity` (planes pagos), 2 fijos (FREE/trial) o custom (enterprise).

**Audit trail (F4).** `audit_logs` es write-only (inmutable). Registra acciones CRUD de tenant/user, billing events, invitaciones, logins. Cada entrada captura `actorId`, `action`, `entityType`, `entityId`, `changes` (before/after), IP y user-agent. Post-F4-06: `RoutingUserServiceImpl` emite `auth.login`, `auth.login.failed` (con `reason`), `auth.logout` (revoke de refresh), `user.create`, `user.update` (diff old/new) y `user.delete` (`{seatReleased}`).

**OTP (F4).** `otp_codes` almacena códigos OTP temporales para verificación de teléfono por SMS vía Brevo. Usa TTL index para auto-eliminación tras 5 minutos.

**Trial (F4).** Los campos `trialPlan`, `trialEndsAt`, `trialSeatLimit` y `trialExpired` en `tenants` gestionan el trial de 14 días. Un scheduled job revisa cada hora y hace downgrade automático a FREE al vencer.

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-11-19 | Retiro del legacy. Nuevas `vehicle_positions` (GPS por conductor) y `geocoding_config` (singleton); `refresh_tokens` pasa al modelo vigente. Se quita el diagrama legacy y los runners de corrección (`TenantUnitsCleanupRunner`, `IdentifierTypeNormalizationRunner`, `EnumCatalogCleanupRunner`, `PackageGuideIndexMigrationRunner`): `IndexInitializer` crea `tenant_guide_unique_partial` y el resto lo cubre el script de `LEGACY_DB_CLEANUP.md`. Total: 21 colecciones. |
| 2026-11-18 | Sin campos nuevos. El índice único `packages {tenantId, guideNumber}` pasa de `sparse` a parcial (`tenant_guide_unique_partial`, solo guías string); `PackageGuideIndexMigrationRunner` borra `tenant_guide` y `tenant_guide_unique_sparse`. La carga CSV informa las guías duplicadas como errores de fila. |
| 2026-11-18 | Sin campos nuevos. `users.identifierType` se valida contra `IdentifierType`, que suma `license`; `IdentifierTypeNormalizationRunner` corrige al arrancar los valores guardados fuera del catálogo (alias a su clave, el resto a `code`). `places.type` y `resource_types.osrmProfile` se validan contra `PlaceType` y `OsrmProfile`. |
| 2026-11-18 | Nueva colección `package_status_reasons` (motivos por tenant) y campo `packages.statusReason`. Los doce catálogos de enum salen de `master_domains`. Total: 20 colecciones. |
| 2026-11-18 | Quitados `tenants.config.defaultWeightUnit` y `defaultVolumeUnit` (`TenantUnitsCleanupRunner` los borra al arrancar). Nuevo dominio `MeasurementUnit` en `master_domains` (solo lectura) con las unidades fijas de plataforma: g, cm3, cm, m, s. Unidades anotadas en `packages`. |
| 2026-11-17 | Sin campos nuevos. Documentado: `waypoints.stopType` pasa a `delivery`/`pickup` (antes `service`) y `packageId` se resuelve con ids hexadecimales; la licencia del conductor vive en `users.identifierType = "license"` + `identifierValue` (migrada desde `driver.licenceNumber`); las referencias `resourceTypeId`, `depotId`, `placeStartId`/`placeEndId`, `settingsId`, `zoneId` y `routes.waypoints.packageId` bloquean el borrado del documento referido (409). |
| 2026-04-22 | Post-F4-06 refactor (Bloque B + C + D — `mvn test` 1015/1015 OK): refactor a interfaces (`SeatEnforcementService`, `InvitationService`, `RegistrationService`, `PasswordService`) con `*Impl` en subpaquete `impl/`; converters BSON `InvitationStatus{Read,Write}Converter` para activar el partial unique index pending; `EmailUtils.normalize` aplicado a todos los lookups por email; `AuditService` integrado en login (`auth.login` / `auth.login.failed` / `auth.logout`) y user CRUD (`user.create` / `user.update` / `user.delete`); reset de `loginAttempts` y `lockedUntil` en login OK y en reset/change password; hooks `+1`/`-1` de `tenant.seatUsed` cubriendo register, accept, softDelete, deactivate/activate de user y bulk de tenant; `SeatUsedReconciliationRunner` (ApplicationRunner) reconcilia drift al startup; rate limiter 20/h/`tenantId` en `POST /api/invitations`. |
| 2026-04-22 | Post-F4-06 refactor (per-seat con tiers): `tenants.seatLimit` documentado como `subscription.quantity` (paid) / 2 fijos (free/trial) / custom (enterprise); `tenants.seatUsed` reposicionado como contador operativo crítico mantenido por `SeatEnforcementService` y reconciliación on-startup; `subscriptions` ahora documentado con `quantity` variable (per-seat) y `unitAmount`. |
| 2026-04-22 | F4-06 (User Invitations): añadido campo `invitations.deleteAt` (TTL real); índice unique parcial `(tenantId, email)` filtrado por `status: pending`; prosa actualizada para reflejar lifecycle (aceptación/revocación setean `deleteAt=null`) y `$inc seatUsed`. |
| 2026-04-23 | Post-Fase 4: agregada `stripe_webhook_events` (idempotencia + TTL) y campo `trialReminderSentAt` en `tenants`. Total: 19 colecciones. |
| 2026-04-18 | Fase 4: agregadas 4 colecciones nuevas (invitations, subscriptions, otp_codes, audit_logs), campos F4 en tenants (billing, Stripe, trial, lifecycle) y users (verification, lockout, notifications, deviceTokens), 5 subdocumentos nuevos, relaciones F4, prosa actualizada. Total: 18 colecciones. |
| 2026-04-14 | Reescritura del documento: modelo Fase 1 (12 colecciones) con diagrama ER Mermaid completo; modelo legacy reducido con entidades deprecadas; sección de subdocumentos embebidos; relaciones clave en prosa; eliminación del diccionario campo a campo y volumetría del documento anterior (sustituidos por enfoque ER unificado). |
| 2026-03-30 | Versión anterior: diagrama solo legacy, diccionario detallado por colección y notas de refactorización. |
