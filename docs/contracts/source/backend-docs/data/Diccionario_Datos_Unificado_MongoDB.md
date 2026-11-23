> **Estado: Actualizado** | Implementacion Fase 1 completada | 2026-04-15

# Diccionario de Datos Unificado — Plataforma de Enrutamiento MongoDB

## 1. Decisiones de Arquitectura

| Aspecto | Decisión | Justificación |
| --- | --- | --- |
| Motor de BD | MongoDB 7.x+ | Modelo flexible, soporte nativo JSON, sharding horizontal, transacciones multi-documento |
| Estrategia Multitenancy | Discriminador por campo tenantId (colección compartida) | Menor overhead operativo, permite escalar con índices compuestos {tenantId, ...}. Migrable a DB-per-tenant si crece |
| Partición por Tenant | Índice compuesto con tenantId como primer campo en todas las colecciones operativas | Permite query isolation eficiente. MongoDB usa prefix matching en índices compuestos |
| Autenticación | JWT + refresh token. Colección users con bcrypt hash | Stateless, compatible móvil (conductores) y web (agentes) |
| Roles | RBAC embebido en users: SUPER_ADMIN, TENANT_ADMIN, AGENT, DRIVER | Roles simples, permisos derivados en middleware. No se necesita colección de permisos separada inicialmente |
| Colecciones de Dominio | master_domains unificada con code como discriminador | Evita proliferación de colecciones para catálogos (OsrmProfile, RouteTopology, etc.) |
| Waypoints | Embebidos dentro de Route (subdocumento). Sin instructions/viaPoints | Siempre se consultan con la ruta. Evita joins. Navegación pesada va en route_navigations |
| Packages (servicios) | Colección separada, referenciados por ObjectId en Route.waypointPackageIds[] | Pueden pertenecer a múltiples journeys/rutas. Búsqueda independiente por guía/cliente |
| Resources | Colección separada con referencia a TypeResource | Reutilizables entre journeys. Estado de flota independiente |
| Journey ↔ Routes | Routes embebidas en Journey (subdocumento array) | Una ruta solo existe en contexto de un journey. Consulta atómica del resultado completo |
| Métricas | journey_metrics como colección separada con FK a journey | Permite análisis independiente sin cargar el journey completo. Optimiza dashboards |
| Auditoría | Campos createdAt, updatedAt, createdBy en todas las colecciones | Trazabilidad estándar. createdBy almacena userId |
| Campos _class | ELIMINADOS | Específicos de Spring Data. El nuevo modelo es agnóstico al framework |
| Campos deprecados | ELIMINADOS (backToStartPoint, maxWeight/maxVolume en Route, distanceArrival, timeArrival en Package) | Funcionalidad cubierta por routeTopology, recurso asignado, y waypoints respectivamente |
| Soft Delete | Campo deletedAt (Date o null) en colecciones principales | Permite recuperación. Queries filtran deletedAt:null por defecto |
| Zona horaria | Todos los timestamps en UTC (ISODate). Conversión a local en frontend | Consistencia global, evita ambigüedades en operaciones multi-zona |
| Navegación (instructions, viaPoints, legs) | Colección separada route_navigations con soporte dual OSRM v4/v5 | Datos pesados (~100KB+ por ruta). Solo necesarios para navegación móvil o detalle. Separar reduce I/O en queries de listado ~100x. Campo osrmVersion discrimina estructura v4 (legacy Java) vs v5 (CVRPTW) |
| Coordenadas normalizadas | Orden [longitude, latitude] (GeoJSON/OSRM v5) en todo el modelo | OSRM v4 usa [lat,lon], v5 usa [lon,lat]. Se normaliza a [lon,lat] en coordinates, location, snappedWaypoints. Datos v4 legacy preservan orden original en instructionsLegacy/viaPointsLegacy |

---

## 2. Colecciones

### 2.1 Colección: tenants

> Empresa/organización. Raíz del multitenancy. Cada tenant agrupa usuarios, configuraciones, recursos y operaciones.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único del tenant | Clave primaria | Auto-generado | NUEVO |
| name | String | Sí | — | Nombre comercial de la empresa | Identificación del tenant | Min 2 chars, max 100 | NUEVO |
| slug | String | Sí | UK | Slug URL-safe del tenant. Ej: 'acme-logistics' | Subdominio o ruta en URL | Lowercase, alfanumérico + guión | NUEVO |
| taxId | String | No | — | NIT / Tax ID de la empresa | Facturación y compliance | Formato según país | NUEVO |
| country | String | Sí | — | Código ISO 3166-1 alpha-2. Ej: 'CO' | Localización y formatos | 2 caracteres uppercase | NUEVO |
| timezone | String | Sí | — | Zona horaria IANA. Ej: 'America/Bogota' | Conversión de horarios en UI | IANA timezone válida | NUEVO |
| plan | String | No | — | Plan de suscripción. Ej: 'free', 'pro', 'enterprise' | Control de features y límites | Enum controlado | NUEVO |
| ~~config.defaultWeightUnit~~ | — | — | — | **ELIMINADO (2026-11-18).** Las unidades son fijas de plataforma (dominio `MeasurementUnit`, `GET /api/v1/units`) | — | Enviarlo a la API da 400 | ELIMINADO |
| ~~config.defaultVolumeUnit~~ | — | — | — | **ELIMINADO (2026-11-18).** Ver `MeasurementUnit` | — | Enviarlo a la API da 400 | ELIMINADO |
| config.maxDeposits | Int32 | No | — | Límite de depósitos por tenant | Control de plan | Default: 100 | NUEVO — de TenantConfig |
| config.maxDrivers | Int32 | No | — | Límite de conductores | Control de plan | Default: 50 | NUEVO — de TenantConfig |
| config.maxRoutes | Int32 | No | — | Límite de rutas por jornada | Control de plan | Default: 100 | NUEVO — de TenantConfig |
| config.maxAdmins | Int32 | No | — | Límite de administradores | Control de plan | Default: 10 | NUEVO — de TenantConfig |
| config.maxAddressesPerFile | Int32 | No | — | Direcciones máximas por archivo CSV | Control de carga masiva | Default: 5000 | NUEVO — de TenantConfig |
| config.maxGeocodedAddresses | Int32 | No | — | Direcciones geocodificadas máximas | Control de geocodificación | Default: 10000 | NUEVO — de TenantConfig |
| config.maxDefaultResources | Int32 | No | — | Recursos predeterminados máximos | Control de flota | Default: 50 | NUEVO — de TenantConfig |
| isActive | Boolean | Sí | — | Tenant activo/suspendido | Control de acceso global | Default: true | NUEVO |
| createdAt | Date | Sí | IDX | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |

**Índices recomendados:**

- `{ slug: 1 } — unique: true — Búsqueda por slug`
- `{ taxId: 1 } — unique: true, sparse: true — Búsqueda por NIT`
- `{ isActive: 1, createdAt: -1 } — Listado de tenants activos`

> **Notas:** Colección nueva. Reemplaza la lógica implícita de userId (email) como discriminador de tenant.

---

### 2.2 Colección: users

> Usuarios de la plataforma. Cada usuario pertenece a un tenant y tiene un rol que define sus permisos. Los conductores acceden desde móvil.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único del usuario | Clave primaria | Auto-generado | NUEVO |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant al que pertenece | Aislamiento multitenancy | Debe existir en tenants | Reemplaza userId (email) |
| email | String | Sí | UK compuesto | Email del usuario. Único dentro del tenant | Login y comunicación | Email válido, lowercase | Era userId en modelo anterior |
| passwordHash | String | Sí | — | Hash bcrypt de la contraseña | Autenticación | Nunca exponer en API. bcrypt rounds >= 12 | Renombrado de password (User.java) |
| firstName | String | Sí | — | Nombre del usuario | Identificación | Max 50 chars | Existente en User.java |
| lastName | String | Sí | — | Apellido del usuario | Identificación | Max 50 chars | Existente en User.java |
| phone | String | No | — | Teléfono con código país. Ej: '+573001234567' | Contacto y notificaciones push | Formato E.164 | NUEVO (driver.phoneNumber para DRIVER) |
| role | String | Sí | IDX | Rol del usuario en el tenant | Autorización RBAC | Enum: SUPER_ADMIN \| TENANT_ADMIN \| AGENT \| DRIVER | NUEVO (reemplaza colección roles) |
| identifierType | String | No | — | Tipo de documento. Solo aplica a DRIVER | Registro de conductor | Dominio: citizen_id\|itin\|plate\|code\|license (validado contra `IdentifierType`) | NUEVO (driver.identificationNumber como fuente parcial) |
| identifierValue | String | No | — | Número de documento o placa. Solo DRIVER | Registro de conductor | Depende de identifierType | NUEVO (driver.identificationNumber como fuente parcial) |
| avatar | String | No | — | URL de la foto de perfil | UI móvil/web | URL válida o null | NUEVO |
| fcmToken | String | No | — | Firebase Cloud Messaging token para push notifications | Notificaciones al conductor | Actualizado desde app móvil | NUEVO |
| lastLoginAt | Date | No | — | Último login exitoso UTC | Seguridad y actividad | ISODate | NUEVO |
| isActive | Boolean | Sí | — | Usuario activo/deshabilitado | Control de acceso | Default: true | NUEVO |
| deletedAt | Date | No | — | Soft delete timestamp. null = activo | Recuperación de datos | ISODate o null | NUEVO |
| createdAt | Date | Sí | — | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |
| createdBy | ObjectId | No | FK → users._id | Usuario que creó este registro | Auditoría | null para auto-registro | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, email: 1 } — unique: true — Login y búsqueda por email dentro del tenant`
- `{ tenantId: 1, role: 1, isActive: 1 } — Listar agentes/conductores activos de un tenant`
- `{ email: 1 } — Para login global (buscar tenant del email)`
- `{ tenantId: 1, deletedAt: 1 } — Filtrar usuarios no eliminados`

> **Notas:** TRANSFORMACIÓN de colección `users` existente (OAuth). La colección actual tiene: username, password, active, accountLocked, userId, firstName, lastName, tokenActivation. Se renombran campos (username→email, password→passwordHash, active→isActive) y se eliminan campos obsoletos (accountLocked, userId, tokenActivation). Se agrega tenantId, role (absorbe colección `roles` de 7 docs), y campos de driver. Los datos de `driver` (1 doc) migran como user con role=DRIVER. Código a adaptar: UserRepository, CustomUserDetailsService, JwtTokenProvider, JwtAuthenticationFilter, SecurityConfig, AuthController.

---

### 2.3 Colección: master_domains

> Catálogo maestro de dominios. **Desde el 2026-11-18 solo guarda `audit_actions` (editable) y `MeasurementUnit` (solo lectura).** Los doce catálogos respaldados por enums (RestrictionType, TypeLengthOfStay, IdentifierType, OsrmProfile, RouteTopology, ServiceType, PackageStatus, GeocodingStatus, Role, JourneyStatus, PlaceType, StopType) ya no se guardan: `GET /api/v1/master-domains` los arma desde el enum (`id = null`, solo lectura) y `EnumCatalogCleanupRunner` borra sus copias al arrancar. La tabla de valores de abajo sigue siendo válida como referencia: refleja el contenido de cada enum.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único | Clave primaria | Auto-generado | NUEVO |
| code | String | Sí | UK | Código del dominio. Ej: 'OsrmProfile', 'RouteTopology', 'RestrictionType' | Discriminador de catálogo | Único, PascalCase | NUEVO |
| description | String | No | — | Descripción del catálogo | Documentación | Max 200 chars | NUEVO |
| isSystem | Boolean | Sí | — | Si es un catálogo del sistema (no editable por tenant) | Control de edición | Default: true | NUEVO |
| values | Array[Document] | Sí | — | Lista de valores del dominio | Catálogo enum | No vacío | NUEVO |
| values[].key | String | Sí | — | Clave técnica. Ej: 'driving', 'round_trip', 'fixed' | Referencia en código | snake_case, único dentro del array | NUEVO (reemplaza hardcoded strings/ordinales) |
| values[].label | String | Sí | — | Etiqueta para UI. Ej: 'Driving', 'Round Trip' | Display en frontend | Localizable | NUEVO |
| values[].description | String | No | — | Descripción funcional del valor | Tooltip/ayuda en UI | Max 500 chars | NUEVO |
| values[].isActive | Boolean | Sí | — | Si el valor está habilitado | Deprecar valores sin borrar | Default: true | NUEVO |
| values[].sortOrder | Number (Int) | No | — | Orden de presentación en UI | Ordenamiento | Entero >= 0 | NUEVO |

**Índices recomendados:**

- `{ code: 1 } — unique: true — Búsqueda por código de dominio`

> **Notas:** Colección NUEVA. Centraliza valores que antes estaban hardcoded como strings en código Java (no existían como documentos MongoDB). Existe una clase Catalog.java con estructura jerárquica (name, ancestors, parent) que NO es el mismo concepto — evaluar si se fusiona o se mantiene separada.

#### Catálogos de dominio y sus valores

| Código (code) | key | label | Descripción funcional |
| --- | --- | --- | --- |
| OsrmProfile | driving | Driving | Motor OSRM para vehículos motorizados |
| OsrmProfile | cycling | Cycling | Motor OSRM para bicicletas |
| OsrmProfile | walking | Walking | Motor OSRM para peatones |
| RouteTopology | depot_to_depot | Depot To Depot | Ruta entre dos depósitos (A→B) |
| RouteTopology | round_trip | Round Trip | Ruta circular con retorno a base (A→A) |
| RouteTopology | open_delivery | Open Delivery | Última milla sin retorno (A→último) |
| RouteTopology | open_pickup | Open Pickup | Consolidación hacia hub (primero→B) |
| RouteTopology | flexible | Flexible | Sin depósitos obligatorios |
| RestrictionType | fixed_routes | Fixed Routes | Planificación con número fijo de rutas |
| RestrictionType | resource_vs_time | Resource Vs Time | Planificación por capacidad y jornada |
| RestrictionType | time_windows | Time Windows | Planificación CVRPTW completa |
| TypeLengthOfStay | fixed | Fixed | Tiempo de estadía fijo por configuración |
| TypeLengthOfStay | define_itinerary | Define Of Itinerary | Tiempo definido por cada paquete/servicio |
| IdentifierType | citizen_id | Citizen Identifier | Documento de identidad/ciudadanía |
| IdentifierType | itin | ITIN | Identificador tributario |
| IdentifierType | plate | Plate | Placa de vehículo |
| IdentifierType | code | Code | Código interno/aleatorio |
| IdentifierType | license | Driver License | Licencia de conducción |
| ServiceType | pickup | Pickup | Recogida de paquete |
| ServiceType | delivery | Delivery | Entrega de paquete |
| ServiceType | mixed | Mixed | Servicio mixto recogida/entrega |
| PackageStatus | pending | Pending | Paquete pendiente de atención. Migrado de PENDIENTE |
| PackageStatus | attended | Attended | Paquete entregado/atendido. Migrado de ENTREGADO |
| PackageStatus | unattended | Unattended | Paquete rechazado/no atendido. Migrado de RECHAZADO |
| PackageStatus | cancelled | Cancelled | Paquete cancelado. Estado nuevo (no existía en sistema anterior) |
| GeocodingStatus | match | Match | Geocodificación exitosa con alta confianza. Migrado de StatusGeocoding.MATCH |
| GeocodingStatus | mean | Mean | Geocodificación aproximada (promedio de candidatos) |
| GeocodingStatus | unmatch | Unmatch | Geocodificación sin resultado confiable |
| GeocodingStatus | manual | Manual | Coordenadas ingresadas manualmente por el usuario |
| GeocodingStatus | unprocessed | Unprocessed | Dirección no procesada por el geocodificador |
| JourneyStatus | planning | Planning | Planificación en progreso, pendiente de ejecución |
| JourneyStatus | in_progress | In Progress | Journey en ejecución |
| JourneyStatus | completed | Completed | Planificación completada exitosamente |
| JourneyStatus | failed | Failed | Error durante la planificación |
| JourneyStatus | cancelled | Cancelled | Planificación cancelada por el usuario |
| PlaceType | depot | Depot | Depósito principal o centro de distribución |
| PlaceType | warehouse | Warehouse | Bodega secundaria de almacenamiento |
| PlaceType | store | Store | Tienda o punto de venta |
| PlaceType | office | Office | Oficina o ubicación administrativa |
| PlaceType | custom | Custom | Tipo de lugar definido por el usuario |
| StopType | depot | Depot | Parada en depósito (inicio/fin de ruta) |
| StopType | delivery | Delivery | Parada de entrega de paquete |
| StopType | pickup | Pickup | Parada de recogida de paquete |
| StopType | service | Service | Parada de servicio o mantenimiento |
| AuditActions | tenant.register | Tenant Register | Registro de nuevo tenant (self-service). Categoría: admin |
| AuditActions | tenant.update | Tenant Update | Actualización de datos del tenant. Categoría: admin |
| AuditActions | tenant.deactivate | Tenant Deactivate | Desactivación de tenant por SUPER_ADMIN. Categoría: admin |
| AuditActions | tenant.activate | Tenant Activate | Reactivación de tenant por SUPER_ADMIN. Categoría: admin |
| AuditActions | user.create | User Create | Creación de usuario. Categoría: admin |
| AuditActions | user.update | User Update | Actualización de perfil de usuario. Categoría: admin |
| AuditActions | user.deactivate | User Deactivate | Desactivación de usuario. Categoría: admin |
| AuditActions | user.activate | User Activate | Reactivación de usuario. Categoría: admin |
| AuditActions | user.invite | User Invite | Envío de invitación a nuevo usuario. Categoría: admin |
| AuditActions | user.invite.accept | User Invite Accept | Aceptación de invitación. Categoría: admin |
| AuditActions | user.invite.revoke | User Invite Revoke | Revocación de invitación pendiente. Categoría: admin |
| AuditActions | user.invite.resend | User Invite Resend | Reenvío de invitación. Categoría: admin |
| AuditActions | user.password.reset | User Password Reset | Restablecimiento de contraseña. Categoría: admin |
| AuditActions | user.password.change | User Password Change | Cambio de contraseña por el usuario. Categoría: admin |
| AuditActions | auth.login | Auth Login | Inicio de sesión exitoso. Categoría: auth |
| AuditActions | auth.login.failed | Auth Login Failed | Intento de login fallido. Categoría: auth |
| AuditActions | auth.logout | Auth Logout | Cierre de sesión. Categoría: auth |
| AuditActions | auth.token.refresh | Auth Token Refresh | Renovación de access token. Categoría: auth |
| AuditActions | auth.email.verify | Auth Email Verify | Verificación de email exitosa. Categoría: auth |
| AuditActions | auth.account.locked | Auth Account Locked | Cuenta bloqueada por intentos fallidos. Categoría: auth |
| AuditActions | billing.subscription.create | Billing Subscription Create | Creación de suscripción en Stripe. Categoría: billing |
| AuditActions | billing.subscription.update | Billing Subscription Update | Actualización de suscripción (upgrade/downgrade). Categoría: billing |
| AuditActions | billing.subscription.cancel | Billing Subscription Cancel | Cancelación de suscripción. Categoría: billing |
| AuditActions | billing.payment.success | Billing Payment Success | Pago exitoso (invoice.paid). Categoría: billing |
| AuditActions | billing.payment.failed | Billing Payment Failed | Pago fallido (invoice.payment_failed). Categoría: billing |
| AuditActions | billing.trial.start | Billing Trial Start | Inicio de período de prueba. Categoría: billing |
| AuditActions | billing.trial.expired | Billing Trial Expired | Expiración de trial sin pago. Categoría: billing |
| AuditActions | billing.plan.change | Billing Plan Change | Cambio de plan (upgrade/downgrade). Categoría: billing |
| AuditActions | notification.email.sent | Notification Email Sent | Email transaccional enviado. Categoría: notification |
| AuditActions | notification.email.failed | Notification Email Failed | Error al enviar email. Categoría: notification |
| AuditActions | notification.sms.sent | Notification SMS Sent | SMS OTP enviado. Categoría: notification |
| AuditActions | notification.sms.failed | Notification SMS Failed | Error al enviar SMS. Categoría: notification |
| AuditActions | notification.push.sent | Notification Push Sent | Push notification enviada. Categoría: notification |
| AuditActions | notification.otp.verify | Notification OTP Verify | Verificación OTP exitosa. Categoría: notification |
| AuditActions | notification.otp.max_attempts | Notification OTP Max Attempts | OTP bloqueado por máximo de intentos. Categoría: notification |
| AuditActions | journey.plan | Journey Plan | Planificación de rutas. Categoría: operation |
| AuditActions | journey.dispatch | Journey Dispatch | Despacho de rutas a conductores. Categoría: operation |
| AuditActions | journey.cancel | Journey Cancel | Cancelación de planificación. Categoría: operation |
| AuditActions | package.upload | Package Upload | Carga de CSV con paquetes. Categoría: operation |
| AuditActions | package.geocode | Package Geocode | Geocodificación de direcciones. Categoría: operation |
| AuditActions | package.update | Package Update | Actualización de paquete individual. Categoría: operation |
| AuditActions | package.delete | Package Delete | Eliminación de paquete. Categoría: operation |
| AuditActions | settings.create | Settings Create | Creación de configuración de ruteo. Categoría: operation |
| AuditActions | settings.update | Settings Update | Actualización de configuración. Categoría: operation |
| AuditActions | settings.delete | Settings Delete | Eliminación de configuración. Categoría: operation |
| AuditActions | resource.create | Resource Create | Creación de recurso (vehículo/conductor). Categoría: operation |
| AuditActions | resource.update | Resource Update | Actualización de recurso. Categoría: operation |
| AuditActions | resource.delete | Resource Delete | Eliminación de recurso. Categoría: operation |
| AuditActions | place.create | Place Create | Creación de lugar (depósito, etc.). Categoría: operation |
| AuditActions | place.update | Place Update | Actualización de lugar. Categoría: operation |
| AuditActions | place.delete | Place Delete | Eliminación de lugar. Categoría: operation |
| MeasurementUnit | g | Gramos | Peso de paquetes, capacidades y restricciones. Categoría (magnitud): weight. Solo lectura |
| MeasurementUnit | cm3 | Centímetros cúbicos | Volumen de paquetes, capacidades y restricciones. Categoría: volume. Solo lectura |
| MeasurementUnit | cm | Centímetros | Dimensiones (`measure.*`). Categoría: length. Solo lectura |
| MeasurementUnit | m | Metros | Distancias de rutas, tramos y navegación. Categoría: distance. Solo lectura |
| MeasurementUnit | s | Segundos | Duraciones, estadías, turnos y descansos. Categoría: duration. Solo lectura |

---

### 2.4 Colección: places

> Ubicaciones: depósitos, puntos de entrega, hubs. Incluye coordenadas GeoJSON para consultas geoespaciales. Antes 'Place' y 'depot'.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único del lugar | Clave primaria | Auto-generado | Existente |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | Reemplaza userId |
| name | String | Sí | — | Nombre del lugar. Ej: 'Bodega Norte' | Identificación en UI | Max 100 chars | Existente |
| type | String | Sí | IDX | Tipo de lugar | Clasificación operativa | Enum: depot\|hub\|customer\|other | NUEVO |
| address | String | No | — | Dirección textual. Ej: 'Carrera 65A #67F-15' | Referencia de localización | Max 200 chars | Existente |
| location | Document (GeoJSON) | Sí | 2dsphere IDX | Coordenadas GeoJSON: { type: 'Point', coordinates: [lon, lat] } | Geolocalización y queries espaciales | WGS84. coordinates: [longitude, latitude] | Migrado de lat/lon separados |
| phoneNumber | String | No | — | Teléfono de contacto | Contacto | Formato E.164 preferido | Existente |
| contactName | String | No | — | Nombre del contacto en el lugar | Comunicación | Max 100 chars | NUEVO |
| ~~operatingHours~~ | ~~Document~~ | ~~No~~ | ~~—~~ | ~~Horarios de operación embebido~~ | ~~Ventanas de disponibilidad~~ | ~~{ mon: {open, close}, ... }~~ | **PLANIFICADO — no implementado en Fase 1.** `RoutingPlace` no incluye este campo. Se evaluará en fases posteriores |
| zoneId | ObjectId | No | FK → zones._id | Zona geográfica asignada | Agrupación territorial | Referencia a zones | NUEVO |
| isActive | Boolean | Sí | — | Lugar activo/inactivo | Control de vigencia | Default: true | NUEVO |
| deletedAt | Date | No | — | Soft delete timestamp | Recuperación | null = activo | NUEVO |
| createdAt | Date | Sí | — | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |
| createdBy | ObjectId | No | FK → users._id | Usuario que creó el registro | Auditoría | — | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, type: 1, isActive: 1 } — Listar depósitos/hubs activos del tenant` (IndexInitializer + @CompoundIndexes)
- `{ location: '2dsphere' } — Queries geoespaciales ($near, $geoWithin)` (IndexInitializer + @GeoSpatialIndexed)
- `{ tenantId: 1, zoneId: 1 } — Filtrar por zona` (IndexInitializer + @CompoundIndexes)
- ~~`{ tenantId: 1, name: 'text' } — Búsqueda de lugares por nombre`~~ **PENDIENTE — no implementado.** Ni en `@CompoundIndexes` ni en `IndexInitializer`. Evaluar si se necesita full-text search en places.

> **Notas:** Unifica Place y depot. Se migra a GeoJSON Point para aprovechar índices 2dsphere de MongoDB.

---

### 2.5 Colección: zones

> Zonas geográficas para agrupación de servicios y restricciones de asignación de recursos.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único | Clave primaria | Auto-generado | NUEVO |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | NUEVO |
| name | String | Sí | — | Nombre de la zona. Ej: 'Zona Norte' | Identificación en UI | Max 100 chars | Derivado de package.zone (String) |
| code | String | No | UK compuesto | Código corto. Ej: 'ZN' | Referencia rápida | Alfanumérico, max 10 chars | NUEVO |
| boundary | Document (GeoJSON) | No | 2dsphere IDX | Polígono GeoJSON: { type: 'Polygon', coordinates: [[[lon,lat],...]] } | Determinar pertenencia de un punto a zona | GeoJSON Polygon válido | NUEVO |
| color | String | No | — | Color hex para mapas. Ej: '#FF5733' | Visualización en mapa | Hex color válido | NUEVO |
| isActive | Boolean | Sí | — | Zona activa/inactiva | Control de vigencia | Default: true | NUEVO |
| createdAt | Date | Sí | — | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, code: 1 } — unique: true, sparse: true — Código único por tenant`
- `{ tenantId: 1, isActive: 1 } — Listar zonas activas`
- `{ boundary: '2dsphere' } — Queries geoespaciales para determinar zona de un punto`

> **Notas:** Colección NUEVA. No existe Zone.java ni colección zone en MongoDB actualmente. `zone` es solo un campo String en Package.java. Se extraen valores únicos de package.zone para crear documentos. Se enriquece con GeoJSON Polygon para asignación automática de zona a paquetes ($geoWithin).

---

### 2.6 Colección: resource_types

> Tipos de recurso/vehículo con capacidades y restricciones. Antes 'TypeResources/TypeVehicle'.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único del tipo de recurso | Clave primaria | Auto-generado | Existente |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | Reemplaza userId |
| category | String | Sí | — | Categoría nominal. Ej: 'Moto', 'Van', 'Camión' | Clasificación de flota | Max 50 chars | NUEVO (TypeVehicle no tiene campo 'type') |
| name | String | Sí | — | Nombre específico. Ej: 'NHR REWARD EURO IV' | Identificación en UI y flota | Max 100 chars | Existente |
| osrmProfile | String | Sí | — | Perfil OSRM del tipo. Ej: 'driving' | Motor de ruteo a usar | Dominio: driving\|cycling\|walking | NUEVO (TypeVehicle no tiene campo 'profile') |
| capacity.weight | Number (Double) | No | — | Capacidad máxima de peso (gramos). Ej: 4100000 | Restricción CVRP de peso | >= 0 | Existente |
| capacity.volume | Number (Double) | No | — | Capacidad máxima de volumen (cm³). Ej: 8200000 | Restricción CVRP de volumen | >= 0 | Existente |
| measure.height | Number (Double) | No | — | Alto del área de carga (cm) | Dimensionamiento | >= 0 | Existente |
| measure.width | Number (Double) | No | — | Ancho del área de carga (cm) | Dimensionamiento | >= 0 | Existente |
| measure.depth | Number (Double) | No | — | Profundidad del área de carga (cm) | Dimensionamiento | >= 0 | Existente |
| restriction.minWeight | Number (Double) | No | — | Peso mínimo aceptado por paquete | Restricción inferior | >= 0 | Existente |
| restriction.maxWeight | Number (Double) | No | — | Peso máximo aceptado por paquete | Restricción superior | >= 0, >= minWeight | Existente |
| restriction.minVolume | Number (Double) | No | — | Volumen mínimo aceptado por paquete | Restricción inferior | >= 0 | Existente |
| restriction.maxVolume | Number (Double) | No | — | Volumen máximo aceptado por paquete | Restricción superior | >= 0, >= minVolume | Existente |
| gasMileage | Number (Double) | No | — | Rendimiento km/galón. Ej: 32 | Cálculo de costo combustible | >= 0 | NUEVO (no existe en código actual) |
| isActive | Boolean | Sí | — | Tipo activo/inactivo | Control de vigencia | Default: true | NUEVO |
| createdAt | Date | Sí | — | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, category: 1 } — Listar tipos por categoría`
- `{ tenantId: 1, isActive: 1 } — Tipos activos del tenant`

> **Notas:** Migrado de TypeVehicle.java (colección `typeVehicle`). Campos existentes: name, weight, volume, measure, restriction, capability. Se agrupan weight/volume bajo 'capacity'. Se ELIMINA capability. Campos NUEVOS: category, osrmProfile, gasMileage (no existían en TypeVehicle). Default osrmProfile="driving" para migración.

---

### 2.7 Colección: resources

> Recurso operativo (vehículo + conductor asignado). Representa la unidad de trabajo que ejecuta una ruta.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único del recurso | Clave primaria | Auto-generado | NUEVO |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | NUEVO (derivar de vehicle.userId) |
| resourceTypeId | ObjectId | Sí | FK → resource_types._id | Tipo de recurso/vehículo | Clasificación operativa | Debe existir | Migrado de vehicle.typeVehicle (@DBRef) |
| driverId | ObjectId | No | FK → users._id | Conductor asignado (role=DRIVER) | Asociar conductor a recurso | users.role debe ser DRIVER | NUEVO (vincular driver migrado a users) |
| name | String | No | — | Nombre del recurso/vehículo | Identificación | Max 100 chars | Migrado de vehicle.name |
| licensePlate | String | No | — | Placa del vehículo | Identificación legal | Max 20 chars | Migrado de vehicle.licencePlate |
| depotId | ObjectId | Sí | FK → places._id | Depósito base asignado | Ubicación base del recurso | places.type debe ser 'depot' | NUEVO (derivar de settingResource[].place) |
| shiftStartUtc | Date | Sí | — | Inicio de turno UTC | Inicio de jornada laboral | ISODate | NUEVO (derivar de settingResource[].initTime) |
| shiftDurationSec | Number (Int) | Sí | — | Duración del turno en segundos. Ej: 28800 (8h) | Ventana temporal de operación | > 0 | NUEVO (calcular de initTime/finishTime) |
| breakDurationSec | Number (Int) | Sí | — | Duración del descanso en segundos. Ej: 3600 (1h) | Pausa incluida en turno | >= 0, < shiftDurationSec | NUEVO |
| quantity | Number (Int) | No | — | Cantidad de vehículos de este tipo. Ej: 5 | Disponibilidad de flota | > 0, default: 1 | Migrado de settingResource.quantity o DTO |
| isDefault | Boolean | No | — | Recurso por defecto si no hay otros disponibles | Fallback operativo | Default: false | NUEVO |
| allowedRestrictions.packageTypes | Array[String] | No | — | Tipos de paquete permitidos | Compatibilidad por tipo de paquete | Claves de goods_tags | NUEVO |
| allowedRestrictions.customerIds | Array[ObjectId] | No | — | IDs de clientes permitidos | Compatibilidad por cliente | Referencias válidas | NUEVO |
| allowedRestrictions.zoneIds | Array[ObjectId] | No | FK → zones._id | IDs de zonas permitidas | Compatibilidad por zona | Referencias a zones | NUEVO |
| isActive | Boolean | Sí | — | Recurso activo/inactivo | Control de vigencia | Default: true | NUEVO |
| deletedAt | Date | No | — | Soft delete timestamp | Recuperación | null = activo | NUEVO |
| createdAt | Date | Sí | — | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, isActive: 1, resourceTypeId: 1 } — Recursos activos por tipo`
- `{ tenantId: 1, depotId: 1 } — Recursos por depósito`
- `{ tenantId: 1, driverId: 1 } — Buscar recurso de un conductor`
- `{ tenantId: 1, 'allowedRestrictions.zoneIds': 1 } — Recursos compatibles con una zona`

> **Notas:** Colección NUEVA — fusiona datos de `vehicle` (65 docs: name, licencePlate, typeVehicle) + `driver` (1 doc: migra a users role=DRIVER) + campos de settingResource (quantity, initTime/finishTime) + campos nuevos. No existía colección "Resource" en MongoDB (solo un DTO de algoritmo). Código a deprecar: VehicleController, VehicleServiceMongo, VehicleRepository, DriverController, DriverServiceMongo, DriverRepository.

---

### 2.8 Colección: settings

> Configuración de planificación de rutas. Define parámetros del algoritmo: topología, restricciones, recursos disponibles.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único de la configuración | Clave primaria | Auto-generado | Existente |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | Reemplaza userId |
| createdBy | ObjectId | Sí | FK → users._id | Agente que creó la configuración | Auditoría y ownership | users.role in [AGENT, TENANT_ADMIN] | Reemplaza userId |
| description | String | No | — | Nombre descriptivo. Ej: 'Config CVRPTW Zona Norte' | Identificación en UI | Max 200 chars | Existente |
| routeTopology | String | Sí | — | Topología de ruta. Ej: 'round_trip' | Estructura de origen/destino | Dominio RouteTopology keys | Existente (ahora usa key) |
| restrictionType | String | Sí | — | Modo de enrutamiento. Ej: 'time_windows' | Algoritmo a ejecutar | Dominio RestrictionType keys | Renombrado de roadRestrictionType + transformación a key |
| placeStartId | ObjectId | No | FK → places._id | Depósito de origen | Punto de partida de rutas | places.type='depot' | NUEVO (derivar de settingResource[].place) |
| placeEndId | ObjectId | No | FK → places._id | Depósito de destino | Punto de llegada de rutas | places.type='depot' | NUEVO (derivar del contexto) |
| evaluateWeight | Boolean | No | — | Si se evalúa capacidad de peso | Activar restricción CVRP peso | Default: false | Existente |
| evaluateVolume | Boolean | No | — | Si se evalúa capacidad de volumen | Activar restricción volumétrica | Default: false | Existente |
| evaluateItineraryZone | Boolean | No | — | Si se evalúa zona del itinerario | Restricción por zona | Default: false | Existente |
| fixedRoutes | Number (Int) | No | — | Número fijo de rutas. Solo para restrictionType='fixed_routes' | Modo FIXED_ROUTES | > 0 si aplica | Existente |
| lengthOfStay | Number (Int) | No | — | Tiempo de estadía por defecto (segundos). Ej: 600 | Tiempo de servicio por parada | >= 0 | Existente |
| typeLengthOfStay | String | No | — | Tipo de estadía. Ej: 'fixed', 'define_itinerary' | Lógica de cálculo de tiempos | Dominio TypeLengthOfStay keys | Existente (ahora usa key) |
| shiftStartUtc | Date | No | — | Inicio de turno global UTC. Si tiene valor → aplica a todos los recursos. Si null → usar por recurso | Jornada global de flota | ISODate o null | NUEVO (dual-mode: global en settings O individual en resources) |
| shiftDurationSec | Number (Int) | No | — | Duración de turno global (segundos). Si >= 0 → aplica a todos. Si < 0 o null → usar por recurso | Ventana temporal global | Entero. Convención: >= 0 aplica, < 0 ignora | NUEVO (dual-mode) |
| breakDurationSec | Number (Int) | No | — | Duración de descanso global (segundos). Si >= 0 → aplica a todos. Si < 0 o null → usar por recurso | Pausa global de flota | Entero. Convención: >= 0 aplica, < 0 ignora | NUEVO (dual-mode) |
| resourceIds | Array[ObjectId] | No | FK → resources._id | Recursos disponibles para esta planificación | Flota asignada | Array de ObjectIds válidos | Reestructurado de settingResource[] (subdocs complejos → solo IDs) |
| isActive | Boolean | Sí | — | Configuración activa/archivada | Control de vigencia | Default: true | Renombrado de state |
| createdAt | Date | Sí | — | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, isActive: 1 } — Configuraciones activas del tenant`
- `{ tenantId: 1, createdBy: 1 } — Configuraciones por agente`
- `{ tenantId: 1, restrictionType: 1 } — Filtrar por tipo de algoritmo`

> **Notas:** Se eliminan campos deprecados (backToStartPoint, travelMode, initTime, _class). state migra a isActive. roadRestrictionType se renombra a restrictionType + transformación de ordinal a key. settingResource[] (subdocs con quantity, place, typeVehicle, initTime, finishTime) se reestructura a resourceIds[] (solo IDs). placeStartId/placeEndId son NUEVOS (antes la lógica estaba distribuida en settingResource[].place).
>
> **Modo dual turno/descanso:** Los parámetros `shiftStartUtc`, `shiftDurationSec` y `breakDurationSec` pueden definirse a nivel global (settings) O individual (resources). La lógica de prioridad es: si settings tiene valor válido (>= 0 para durations, no null para shiftStartUtc) → aplica a TODA la flota. Si settings es null o < 0 → se usa el valor individual de cada resource. Esto permite configuraciones mixtas: turno global pero descanso por recurso.
>
> **Relación routeTopology ↔ depósitos:**
>
> | routeTopology | placeStartId | placeEndId | Waypoints depot en ruta |
> | --- | --- | --- | --- |
> | depot_to_depot | Requerido | Requerido | Inicio + Fin |
> | round_trip | Requerido | = placeStartId | Inicio + Fin (mismo) |
> | open_delivery | Requerido | null | Solo Inicio |
> | open_pickup | null | Requerido | Solo Fin |
> | flexible | null | null | Ninguno |

---

### 2.9 Colección: packages

> Paquete/servicio a entregar o recoger. Unidad atómica de demanda. Referenciado por rutas/journeys.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único del paquete | Clave primaria | Auto-generado | Existente |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | Reemplaza userId |
| guideNumber | String | No | IDX compuesto | Número de guía del envío. Ej: 'G010' | Trazabilidad logística | Único por tenant si no null | Existente |
| name | String | No | — | Nombre/descripción del paquete | Identificación en UI | Max 200 chars | Existente |
| serviceType | String | Sí | IDX | Tipo de servicio: 'pickup', 'delivery', 'mixed' | Naturaleza del servicio | Dominio ServiceType keys | NUEVO (no existe en Package.java) |
| address | String | No | — | Dirección de entrega | Instrucción para repartidor | Max 300 chars | Existente |
| standardizedAddress | String | No | — | Dirección normalizada por geocodificador | Geocodificación | Auto-generado | Existente (corregido typo) |
| location | Document (GeoJSON) | No | 2dsphere IDX | Coordenadas GeoJSON: { type: 'Point', coordinates: [lon, lat] } | Geolocalización | WGS84 | Migrado de lat/lon separados |
| geocodingScore | Number (Double) | No | — | Score de confianza del geocodificador. Rango 0-1 | Calidad de geocodificación | 0.0 - 1.0 | Renombrado de score |
| geocodingStatus | String | No | — | Estado de geocodificación | Control de calidad | Dominio GeocodingStatus keys: match\|mean\|unmatch\|manual\|unprocessed | Renombrado de statusGeocoding. Valores mapeados del legacy `StatusGeocoding` enum (MATCH→match, MEAN→mean, UNMATCH→unmatch, MANUAL→manual, UNPROCESSED→unprocessed) |
| city | String | No | — | Ciudad | Información geográfica | Max 100 chars | Existente |
| country | String | No | — | País (ISO 3166-1 alpha-2) | Información geográfica | 2 chars | Existente |
| postalCode | String | No | — | Código postal | Localización | Max 20 chars | Existente |
| zoneId | ObjectId | No | FK → zones._id | Zona asignada (auto o manual) | Agrupación geográfica | Referencia a zones | Migrado de zone (String) |
| weight | Number (Double) | No | — | Peso del paquete (gramos, unidad de plataforma) | Restricción de capacidad | >= 0 | Existente |
| volume | Number (Double) | No | — | Volumen del paquete (cm³, unidad de plataforma) | Restricción volumétrica | >= 0 | Existente |
| pieceNumber | Number (Int) | No | — | Cantidad de piezas del envío | Items del paquete | >= 1, default: 1 | Existente |
| measure.height | Number (Double) | No | — | Alto del paquete (cm) | Restricciones dimensionales | >= 0 | Existente |
| measure.width | Number (Double) | No | — | Ancho del paquete (cm) | Restricciones dimensionales | >= 0 | Existente |
| measure.depth | Number (Double) | No | — | Profundidad del paquete (cm) | Restricciones dimensionales | >= 0 | Existente |
| durationStay | Number (Int) | No | — | Tiempo de estadía en parada (segundos) | Duración de servicio | >= 0 | Renombrado de timeState (Package.java) |
| timeWindow.startUtc | Date | No | — | Inicio de ventana de tiempo UTC | Restricción temporal CVRPTW | ISODate | NUEVO (tw_start_utc no existe en código) |
| timeWindow.endUtc | Date | No | — | Fin de ventana de tiempo UTC | Restricción temporal CVRPTW | ISODate, >= startUtc | NUEVO (tw_end_utc no existe en código) |
| category | String | No | — | Categoría del paquete | Clasificación | Max 50 chars | Existente |
| goodsTags | Array[String] | No | — | Tags de mercancía. Ej: ['perishable','fragile'] | Compatibilidad con recursos | Strings válidos | NUEVO (goods_tags no existe en código) |
| customerId | ObjectId | No | FK → customers._id (futura) | ID del cliente/destinatario | Trazabilidad de cliente | Referencia futura | NUEVO |
| receiver | Document | No | — | Destinatario: { name, phone, email } | Datos del cliente | Subdocumento | Existente |
| sender | Document | No | — | Remitente: { name, phone, email } | Datos del remitente | Subdocumento | Existente |
| observation | String | No | — | Observaciones o notas | Notas del servicio | Max 500 chars | Existente |
| status | String | No | — | Estado post-algoritmo | Ciclo de vida | Enum: pending\|attended\|unattended\|cancelled | Existente (ampliado) |
| statusReason | String | No | → package_status_reasons (tenantId + key) | Motivo del estado. Ej: 'customer_absent' | Explicar por qué un paquete quedó en su estado | Motivo activo del tenant con `status` en `appliesTo` (422 si no) | NUEVO (2026-11-18) |
| createdAt | Date | Sí | — | Fecha de creación UTC | Auditoría | ISODate auto | NUEVO |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |
| createdBy | ObjectId | No | FK → users._id | Usuario que creó el registro | Auditoría | — | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, guideNumber: 1 } — unique: true, partialFilterExpression: { guideNumber: { $type: "string" } } (`tenant_guide_unique_partial`) — Búsqueda por guía; los paquetes sin guía no chocan`
- `{ tenantId: 1, serviceType: 1, status: 1, createdAt: -1 } — Filtrar servicios pendientes`
- `{ tenantId: 1, zoneId: 1 } — Paquetes por zona`
- `{ tenantId: 1, customerId: 1 } — Paquetes por cliente`
- `{ location: '2dsphere' } — Queries geoespaciales`
- `{ tenantId: 1, 'timeWindow.startUtc': 1 } — Servicios con ventana de tiempo`

> **Notas:** Se eliminan campos deprecados (distanceArrival, timeArrival, visitOrder). Coordenadas migran a GeoJSON. Time windows migran de epoch a ISODate. zone String migra a zoneId ObjectId.

---

### 2.9.1 Colección: package_status_reasons

> Motivos de estado de paquete **por tenant** (NUEVO 2026-11-18). Los gestiona el `tenant_admin` en `/api/v1/package-status-reasons`; no se borran, se desactivan.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único | Clave primaria | Auto-generado | NUEVO |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Del JWT | NUEVO |
| key | String | Sí | UK con tenantId | Clave del motivo. Ej: 'customer_absent' | Referencia desde packages.statusReason | `^[a-z0-9_]{1,50}$`, inmutable | NUEVO |
| label | String | Sí | — | Etiqueta para UI | Display | Max 100 chars | NUEVO |
| description | String | No | — | Descripción | Ayuda en UI | Max 500 chars | NUEVO |
| appliesTo | Array[String] | Sí | IDX | Estados donde aplica | Filtrar el select por status | Claves de PackageStatus, no vacío | NUEVO |
| isActive | Boolean | Sí | IDX | Si se puede asignar | Retirar sin borrar | Default: true | NUEVO |
| sortOrder | Number (Int) | No | — | Orden de presentación | Ordenamiento | Default: 0 | NUEVO |
| createdAt / updatedAt | Date | Sí | — | Auditoría UTC | Auditoría | ISODate auto | NUEVO |
| createdBy | ObjectId | No | FK → users._id | Quién lo creó | Auditoría | — | NUEVO |

**Índices:**

- `{ tenantId: 1, key: 1 } — unique: true — tenant_key_unique`
- `{ tenantId: 1, appliesTo: 1, isActive: 1 } — tenant_appliesTo_active`

---

### 2.10 Colección: journeys

> Planificación/itinerario. Resultado de ejecutar el algoritmo de ruteo. Contiene las rutas generadas como subdocumentos embebidos.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único del journey | Clave primaria | Auto-generado | Existente |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | Reemplaza userId |
| createdBy | ObjectId | Sí | FK → users._id | Agente que ejecutó la planificación | Auditoría | users.role in [AGENT, TENANT_ADMIN] | Reemplaza userId |
| settingsId | ObjectId | Sí | FK → settings._id | Configuración usada | Reproducibilidad | Debe existir en settings | NUEVO (no existe en Journey.java) |
| name | String | No | — | Nombre descriptivo | Identificación en UI | Max 200 chars | NUEVO |
| status | String | Sí | IDX | Estado de la planificación | Ciclo de vida del proceso | Enum: planning\|in_progress\|completed\|failed\|cancelled | NUEVO (no existe en Journey.java) |
| totalServices | Number (Int) | Sí | — | Total de servicios en el input | KPI tamaño del problema | >= 0 | NUEVO (no existe en Journey.java) |
| totalResources | Number (Int) | Sí | — | Total de recursos disponibles | KPI flota disponible | >= 0 | NUEVO (no existe en Journey.java) |
| totalZones | Number (Int) | No | — | Total de zonas activas | Complejidad geográfica | >= 0 | NUEVO |
| stats.minTime | Number (Int) | No | — | Duración mínima entre rutas (segundos) | KPI variabilidad | >= 0 | Reestructurado (era campo raíz minTime en Journey.java) |
| stats.avgTime | Number (Int) | No | — | Duración promedio entre rutas (segundos) | KPI promedio | >= 0 | Reestructurado (era campo raíz avgTime en Journey.java) |
| stats.maxTime | Number (Int) | No | — | Duración máxima entre rutas (segundos) | KPI ruta más larga | >= 0 | Reestructurado (era campo raíz maxTime en Journey.java) |
| invalidPackageIds | Array[ObjectId] | No | FK → packages._id | Paquetes no geocodificados/ruteados | Trazabilidad de fallos | Array de ObjectIds | Migrado de embedded a refs |
| routes | Array[Document] | Sí | — | Rutas generadas (subdocumentos). Ver sección 2.11 | Resultado del algoritmo | Ver routes_embedded | Existente (ahora embebido) |
| resourceSummary | Array[Document] | No | — | Resumen de flota: [{typeId, typeName, available, used, usagePercent, routeIndexes}] | KPI de utilización | Subdocumento | Existente (refinado) |
| createdAt | Date | Sí | IDX | Timestamp de creación UTC | Auditoría y orden cronológico | ISODate auto | Renombrado de date (LocalDate en Journey.java) |
| updatedAt | Date | Sí | — | Última modificación UTC | Auditoría | ISODate auto | NUEVO |
| deletedAt | Date | No | — | Soft delete timestamp | Recuperación | null = activo | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, status: 1, createdAt: -1 } — Journeys recientes por estado`
- `{ tenantId: 1, createdBy: 1, createdAt: -1 } — Journeys por agente`
- `{ tenantId: 1, settingsId: 1 } — Journeys por configuración`
- `{ tenantId: 1, deletedAt: 1, createdAt: -1 } — Filtrar no eliminados`

> **Notas:** Actualmente hay DUPLICIDAD: Journey.java tiene List<Route> embebido (sin @DBRef) Y existe colección `route` separada (739 docs) con RouteRepository/RouteController. La migración mantiene embebido y ELIMINA colección route separada. fleetUsageSummary migra a journey_metrics. Campos NUEVOS: settingsId, name, status, totalServices, totalResources, totalZones. Se deprecan: RouteController, RouteServiceMongo, RouteRepository.
>
> **Campos ELIMINADOS de Journey.java:**
>
> | Campo eliminado | Razón | Alternativa |
> | --- | --- | --- |
> | `place` (Place embebido) | Redundante. El depósito se define en settings según routeTopology | settingsId → settings.placeStartId / placeEndId |
> | `routeRestrictionType` (String) | Redundante. El tipo de restricción se define en settings | settingsId → settings.restrictionType |
> | `countRoutes` (Integer) | Calculado. Es simplemente la longitud del array routes | routes.length |

---

### 2.11 journeys.routes[] (subdocumento embebido)

> Estructura de cada ruta dentro de journeys.routes[]. NO es colección independiente. instructions y viaPoints REMOVIDOS (van en route_navigations). Solo data operativa y KPIs.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| routeIndex | Number (Int) | Sí | — | Índice de la ruta dentro del journey (0-based) | Identificación ordinal | >= 0 | Reemplaza _id de Route |
| name | String | No | — | Nombre/alias de la ruta | Identificación en UI | Max 100 chars | Existente |
| resourceId | ObjectId | No | FK → resources._id | Recurso/vehículo asignado | Trazabilidad ruta-flota | Referencia a resources | Existente (ahora ObjectId) |
| geoJson | String | No | — | Geometría codificada (Encoded Polyline). De route_geometry (v4) o routes[].geometry (v5) | Render del trayecto en mapa | Encoded polyline string | Existente |
| startRouteUtc | Date | No | — | Hora de inicio de ruta UTC | Horario de operación | ISODate | Migrar: Route.startRouteDate (LocalTime) + Route.date (LocalDate) → combinar en ISODate UTC |
| finishRouteUtc | Date | No | — | Hora de finalización de ruta UTC | Horario de cierre | ISODate | Migrar: Route.finishRouteDate (LocalTime) + Route.date (LocalDate) → combinar en ISODate UTC |
| distanceTraveled | Number (Double) | No | — | Distancia total (metros) | KPI km recorridos | >= 0 | Existente |
| duration | Number (Int) | No | — | Duración total (segundos) | KPI de tiempo | >= 0 | Existente |
| weightUsed | Number (Double) | No | — | Peso total cargado (gramos) | Utilización de carga | >= 0 | Existente |
| volumeUsed | Number (Double) | No | — | Volumen total cargado (cm³) | Utilización volumétrica | >= 0 | Existente |
| weightUsagePercent | Number (Double) | No | — | (weightUsed / recurso capacity.weight) * 100 | % uso de peso | 0-100 | Existente |
| volumeUsagePercent | Number (Double) | No | — | (volumeUsed / recurso capacity.volume) * 100 | % uso de volumen | 0-100 | Existente |
| fuelCost | Number (Double) | No | — | Costo estimado de combustible | KPI económico | >= 0 | Existente |
| avgStayTime | Number (Double) | No | — | Tiempo promedio estadía por parada (seg) | KPI productividad | >= 0 | Existente |
| legsCount | Number (Int) | No | — | Cantidad de legs en la ruta | Metadata de estructura | >= 1 | NUEVO |
| badPackageIds | Array[ObjectId] | No | FK → packages._id | Paquetes no ruteables en esta ruta | Trazabilidad de fallos | Array de ObjectIds | Migrado de embedded a refs |
| waypoints | Array[Document] | Sí | — | Paradas ordenadas (embebidas). Ver estructura abajo | Secuencia de visita | Ver sección waypoints | Migrado de colección separada |

> **Notas:** Se ELIMINAN instructions y viaPoints → movidos a colección route_navigations. geoJson se conserva aquí porque es necesario para render de mapa en listados.
>
> **Campos ELIMINADOS de Route:**
>
> | Campo eliminado | Razón | Alternativa |
> | --- | --- | --- |
> | `vehicleTypeName` (String) | Redundante. Se duplicaba el nombre del tipo de vehículo | resourceId → resources.resourceTypeId → resource_types.name |
> | `date` (Date) | Redundante con startRouteUtc. `EmbeddedRoute` no incluye este campo | Usar startRouteUtc para filtros por fecha |
> | `instructions` (Array) | Performance. Datos pesados de navegación | Migrados a route_navigations |
> | `viaPoints` (Array) | Performance. Datos pesados de navegación | Migrados a route_navigations |
>
> **Migración de campos de tiempo:** `startRouteDate` y `finishRouteDate` en Route.java son `LocalTime` (solo hora, sin fecha). Se deben combinar con `Route.date` (LocalDate) para generar un `ISODate` UTC completo: `startRouteUtc = date + startRouteDate - offset_zona`. Ejemplo: si date=2024-01-15, startRouteDate=08:30, zona=America/Bogota (UTC-5) → startRouteUtc = 2024-01-15T13:30:00Z.

#### Estructura de waypoints[] (subdocumento dentro de cada ruta)

| Campo | Tipo BSON | Req | PK/FK | Descripción | Objetivo | Validación | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sequence | Number (Int) | Sí | — | Orden 0-based del waypoint en la ruta | Secuencia de visita | >= 0, único en ruta | Existente |
| stopType | String | Sí | — | Tipo: 'depot' o 'service' | Clasificar parada | Enum: depot\|service | Unificado |
| packageId | ObjectId | No | FK → packages._id | Paquete si stopType='service'. Null para depots | Trazabilidad parada→servicio | Condicional a stopType | Existente (ObjectId) |
| placeId | ObjectId | No | FK → places._id | Lugar si stopType='depot'. Null para services | Referencia al depósito | Condicional a stopType | Renombrado de depotId |
| coordinates | Array[Number] | Sí | — | [longitude, latitude] WGS84. Normalizado a [lon,lat]. Migrar de [lat,lon] si v4 | Posición geográfica | 2 elementos, orden [lon,lat] | Normalizar orden |
| arrivalUtc | Date | No | — | ETA UTC | Ventana de llegada | ISODate | Migrado de String |
| departureUtc | Date | No | — | ETD UTC | Ventana de salida | ISODate | Migrado de String |
| distance | Number (Double) | Sí | — | Distancia tramo anterior → este waypoint (metros) | Distancia incremental | >= 0 | Existente |
| distanceAccum | Number (Double) | Sí | — | Distancia acumulada desde inicio (metros) | Odómetro de ruta | >= 0 | Existente |
| duration | Number (Double) | Sí | — | Duración tramo anterior → este waypoint (seg) | Tiempo incremental | >= 0 | Existente |
| durationAccum | Number (Double) | Sí | — | Duración acumulada desde inicio (seg) | Tiempo total transcurrido | >= 0 | Existente |
| weight | Number (Double) | No | — | Peso cargado/descargado en parada | Demanda satisfecha | >= 0 | Existente |
| weightAccum | Number (Double) | No | — | Peso acumulado en vehículo | Estado de carga | >= 0 | Existente |
| volume | Number (Double) | No | — | Volumen cargado/descargado en parada | Demanda volumétrica | >= 0 | Existente |
| volumeAccum | Number (Double) | No | — | Volumen acumulado en vehículo | Estado volumétrico | >= 0 | Existente |

---

### 2.12 Colección: route_navigations

> Datos de navegación turn-by-turn por ruta. Colección SEPARADA para mantener journeys livianos. 1 documento por ruta (journeyId + routeIndex). Solo se consulta para navegación en móvil o detalle de ruta. Soporta OSRM v4 (legacy /viaroute) y v5 (/route con legs).

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único | Clave primaria | Auto-generado | NUEVO |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | NUEVO |
| journeyId | ObjectId | Sí | FK → journeys._id, IDX compuesto | Journey al que pertenece | Vínculo con planificación | Debe existir | Extraído de Route |
| routeIndex | Number (Int) | Sí | IDX compuesto | Índice de la ruta (0-based). Con journeyId forma UK | Identificar ruta específica | >= 0 | NUEVO |
| osrmVersion | String | Sí | — | Versión API OSRM: 'v4' o 'v5' | Interpretar estructura correcta | Enum: v4\|v5 | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, journeyId: 1, routeIndex: 1 } — unique: true — Navegación de ruta específica`
- `{ journeyId: 1 } — Toda la navegación de un journey`
- `{ tenantId: 1, createdAt: -1 } — Limpieza por antigüedad / TTL`

> **Notas:** COLECCIÓN NUEVA — Performance: un journey con 50 rutas puede tener >5MB solo en instructions. Al separar: (1) queries de listado/dashboard ~100x más rápidos, (2) navegación on-demand para app móvil, (3) TTL/archivado independiente. osrmVersion discrimina estructura v4 vs v5.

#### ESTRUCTURA OSRM v5 — legs[].steps[] (CVRPTW - modelo preferido para nuevos journeys)

| Campo | Tipo BSON | Req | PK/FK | Descripción | Origen OSRM v5 | Validación | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| legs | Array[Document] | Cond. | — | Segmentos waypoint-a-waypoint. Solo si osrmVersion='v5'. N legs = N waypoints - 1 | routes[0].legs[] | Array de leg docs | NUEVO (CVRPTW) |
| legs[].distance | Number (Double) | Sí | — | Distancia del leg (metros) | legs[].distance | >= 0 | NUEVO |
| legs[].duration | Number (Double) | Sí | — | Duración del leg (segundos) | legs[].duration | >= 0 | NUEVO |
| legs[].summary | String | No | — | Calles principales del segmento | legs[].summary | Max 200 chars | NUEVO |
| legs[].steps | Array[Document] | No | — | Instrucciones turn-by-turn del leg | legs[].steps[] | Array de step docs | NUEVO |
| legs[].steps[].maneuver | Document | Sí | — | Maniobra: { type, modifier, location:[lon,lat], bearing_before, bearing_after } | steps[].maneuver | Subdocumento | NUEVO |
| legs[].steps[].maneuver.type | String | Sí | — | Tipo: depart, arrive, turn, new name, merge, fork, roundabout, etc. | maneuver.type | Enum OSRM v5 | NUEVO |
| legs[].steps[].maneuver.modifier | String | No | — | Modificador: left, right, slight left, straight, uturn, etc. | maneuver.modifier | Enum OSRM v5 | NUEVO |
| legs[].steps[].maneuver.location | Array[Number] | Sí | — | Coordenada de la maniobra [lon, lat] | maneuver.location | [lon,lat] WGS84 | NUEVO |
| legs[].steps[].name | String | No | — | Nombre de calle/vía | steps[].name | Max 200 chars | NUEVO |
| legs[].steps[].distance | Number (Double) | Sí | — | Distancia del step (metros) | steps[].distance | >= 0 | NUEVO |
| legs[].steps[].duration | Number (Double) | Sí | — | Duración del step (segundos) | steps[].duration | >= 0 | NUEVO |
| legs[].steps[].geometry | String | No | — | Polyline codificada del step | steps[].geometry | Encoded polyline | NUEVO |
| legs[].steps[].mode | String | No | — | Modo de transporte del step | steps[].mode | driving\|cycling\|walking\|ferry | NUEVO |

#### ESTRUCTURA OSRM v4 — legacy /viaroute (datos migrados del proyecto Java)

| Campo | Tipo BSON | Req | PK/FK | Descripción | Origen OSRM v4 | Estructura interna | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| instructionsLegacy | Array[Array] | Cond. | — | Instrucciones raw v4. Solo si osrmVersion='v4'. Cada sub-array: 8-9 elementos posicionales | route_instructions | [code,street,len,locIdx,time,fmtLen,dir,azimuth,mode?] | Migrado de Route.instructions |
| ↳ [0] code | String | — | — | Código de maniobra: 10=depart, 1=straight, 2=slight right, 3=right, 4=sharp right, 5=uturn, 6=sharp left, 7=left, 8=slight left, 15=arrive | route_instructions[][0] | Código numérico como String | — |
| ↳ [1] streetName | String | — | — | Nombre de la calle | route_instructions[][1] | String | — |
| ↳ [2] length | Number | — | — | Distancia del tramo (metros) | route_instructions[][2] | Entero | — |
| ↳ [3] locationIndex | Number | — | — | Índice del via_point asociado | route_instructions[][3] | Entero (0-based) | — |
| ↳ [4] time | Number | — | — | Tiempo del tramo (segundos) | route_instructions[][4] | Entero | — |
| ↳ [5] formattedLength | String | — | — | Distancia legible. Ej: '1.2km' | route_instructions[][5] | String | — |
| ↳ [6] postTurnDirection | String | — | — | Dirección cardinal post-giro: N, NE, E, SE, S, SW, W, NW | route_instructions[][6] | String | — |
| ↳ [7] postTurnAzimuth | Number | — | — | Azimut en grados (0-360) post-giro | route_instructions[][7] | Entero | — |
| ↳ [8] mode (opcional) | String | — | — | Modo de transporte. Solo en arrays de 9 elementos | route_instructions[][8] | String (ej: 'driving') | — |
| viaPointsLegacy | Array[Array[Number]] | Cond. | — | Coordenadas snapped v4. Solo si osrmVersion='v4'. Formato: [[lat, lon], ...] (NOTA: orden v4 = [lat,lon]) | via_points | [[lat,lon], ...] | Migrado de Route.viaPoints |

#### CAMPOS COMUNES (ambas versiones OSRM)

| Campo | Tipo BSON | Req | PK/FK | Descripción | Objetivo | Validación | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| snappedWaypoints | Array[Document] | No | — | Coordenadas snapped normalizadas a [lon,lat]. Unifica via_points (v4, invertido) y waypoints[].location (v5) | Puntos ajustados a red vial | Orden siempre [lon,lat] | NUEVO (normaliza v4/v5) |
| snappedWaypoints[].location | Array[Number] | Sí | — | [longitude, latitude] — orden GeoJSON estándar | Coordenada snapped | 2 elementos numéricos | — |
| snappedWaypoints[].name | String | No | — | Nombre del punto snapped (si disponible) | Referencia | Max 200 chars | De v5 waypoints[].name |
| createdAt | Date | Sí | — | Timestamp de creación UTC | Auditoría | ISODate auto | NUEVO |

#### Análisis de performance: navegación embebida en Journey vs colección separada

| Escenario | Si estuviera embebido en Journey | Con route_navigations separado | Ganancia |
| --- | --- | --- | --- |
| Listar journeys (dashboard) | Lee ~5MB/journey (incluye instructions de todas las rutas) | Lee ~50KB/journey (solo KPIs y waypoints) | ~100x menos I/O |
| Conductor abre 1 ruta en móvil | Descarga todo el journey (~5MB) para extraer 1 ruta | 1 query puntual: ~100KB | ~50x menos bandwidth |
| Tamaño documento (50 rutas) | Riesgo de acercarse al límite BSON 16MB | Journey <1MB. 50 docs de ~100KB en route_navigations | Sin riesgo BSON limit |
| Archivado de navegación antigua | $unset en cada journey (update pesado) | TTL index o drop por rango de fechas | Operación O(1) vs O(n) |
| Escritura post-algoritmo | 1 insert atómico grande (simple) | 1 insert journey + N inserts nav (más complejo) | Trade-off: +código, +resiliencia |
| Detalle de ruta en web (agente) | Necesita $project para excluir instructions | Journey siempre liviano. Nav: 1 query extra | Queries más simples |

#### Mapeo OSRM v4 → v5 → MongoDB (referencia rápida)

| Concepto | OSRM v4 (/viaroute) | OSRM v5 (/route) | Campo en MongoDB |
| --- | --- | --- | --- |
| Geometría ruta completa | route_geometry | routes[0].geometry | journeys.routes[].geoJson (en journey) |
| Instrucciones turn-by-turn | route_instructions (arrays posicionales) | legs[].steps[] (objetos con keys) | v4→instructionsLegacy \| v5→legs[].steps[] |
| Puntos snapped | via_points [[lat,lon]] | waypoints[].location [[lon,lat]] | v4→viaPointsLegacy \| ambos→snappedWaypoints [lon,lat] |
| Distancia total | route_summary.total_distance | routes[0].distance | journeys.routes[].distanceTraveled |
| Duración total | route_summary.total_time | routes[0].duration | journeys.routes[].duration |
| Maniobra/giro | [0] código numérico | steps[].maneuver.type + modifier | v4: código en array \| v5: objeto estructurado |
| Nombre de calle | [1] streetName | steps[].name | v4: posición 1 \| v5: campo name |
| Orden coordenadas | [lat, lon] | [lon, lat] (GeoJSON) | Normalizar siempre a [lon, lat] |

---

### 2.13 Colección: journey_metrics

> Métricas agregadas de una planificación. Relación 1:1 con journeys. Colección separada para optimizar dashboards sin cargar el journey completo.

| Campo | Tipo BSON | Requerido | PK/FK/IDX | Descripción | Objetivo de Negocio | Validación/Dominio | Notas Migración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _id | ObjectId | Sí | PK | Identificador único | Clave primaria | Auto-generado | NUEVO |
| tenantId | ObjectId | Sí | FK → tenants._id, IDX | Tenant propietario | Aislamiento multitenancy | Debe existir en tenants | NUEVO |
| journeyId | ObjectId | Sí | FK-UK → journeys._id | Journey asociado (relación 1:1) | Vínculo con planificación | Único | NUEVO |
| distance | Number (Double) | Sí | — | Distancia total agregada (metros) | KPI global km | >= 0 | NUEVO (derivable de routes) |
| efficiency | Number (Double) | Sí | — | Tasa de nivel de servicio normalizada (0-1) | Eficiencia global | 0.0 - 1.0 | NUEVO |
| weightAccum | Number (Double) | Sí | — | Peso total distribuido | KPI carga distribuida | >= 0 | NUEVO (derivable de routes) |
| volumeAccum | Number (Double) | Sí | — | Volumen total distribuido | KPI volumen distribuido | >= 0 | NUEVO (derivable de routes) |
| avgAttendWeightPct | Number (Double) | Sí | — | % demanda de peso satisfecha (0-100) | KPI peso atendido | 0 - 100 | NUEVO |
| avgAttendVolumePct | Number (Double) | Sí | — | % demanda volumétrica satisfecha (0-100) | KPI volumen atendido | 0 - 100 | NUEVO |
| attendServicesPct | Number (Double) | Sí | — | Nivel de servicio % (0-100) | KPI principal | 0 - 100 | NUEVO |
| attendedRoutes | Number (Int) | Sí | — | Rutas con al menos 1 servicio asignado | Flota activa | >= 0 | NUEVO |
| attendedServices | Number (Int) | Sí | — | Servicios con status 'attended' | KPI producción | >= 0 | NUEVO |
| totalServices | Number (Int) | Sí | — | Total servicios en input | Tamaño del problema | >= 0 | NUEVO |
| usedResources | Number (Int) | Sí | — | Recursos con status 'assigned' | Vehículos en uso | >= 0 | NUEVO |
| totalResources | Number (Int) | Sí | — | Total recursos disponibles | Flota disponible | >= 0 | NUEVO |
| attendedCustomers | Number (Int) | Sí | — | Clientes distintos atendidos | Cobertura de clientes | >= 0 | NUEVO |
| attendedZones | Array[{zoneId, count}] | No | — | Desglose por zona atendida | Análisis geográfico | zoneId: ObjectId | NUEVO |
| serviceTypes | Array[{serviceType, count}] | No | — | Desglose por tipo de servicio | Mix operativo | serviceType: String enum | NUEVO |
| packageTags | Array[{tag, count}] | No | — | Desglose por tag de paquete | Control de mercancías | tag: String | NUEVO |
| usedResourceTypes | Array[Document] | No | — | KPIs por tipo de recurso (detallado) | Eficiencia por flota | ResourceTypeMetrics subdoc | NUEVO (conceptualmente de FleetUsageSummary) |
| createdAt | Date | Sí | — | Timestamp de creación UTC | Auditoría | ISODate auto | NUEVO |

**Índices recomendados:**

- `{ tenantId: 1, journeyId: 1 } — unique: true — Relación 1:1 con journey`
- `{ tenantId: 1, createdAt: -1 } — Métricas recientes del tenant`
- `{ tenantId: 1, efficiency: -1 } — Ranking de eficiencia`
- `{ tenantId: 1, attendServicesPct: -1 } — Ranking de nivel de servicio`

> **Notas:** Colección NUEVA. No existe JourneyMetrics.java ni colección equivalente. Fuentes conceptuales: Journey.minTime/avgTime/maxTime (campos directos), FleetUsageSummary (subdoc embebido en Journey), y valores calculados en servicios. Colección separada para queries de dashboard sin cargar journey completo con rutas embebidas.

---

## 3. Mapa de Migración

| Entidad Original | Campo Original | Colección Nueva | Campo Nuevo | Tipo de Cambio | Detalle |
| --- | --- | --- | --- | --- | --- |
| Todas | userId (String/email) | Todas | tenantId (ObjectId) | Transformación | Crear tenant por cada email único. Reemplazar email por tenantId del tenant correspondiente |
| Todas | _class | — | ELIMINADO | Eliminación | Discriminador Spring Data. No se necesita en nuevo modelo |
| Settings | backToStartPoint | — | ELIMINADO | Eliminación | Deprecado. Cubierto por routeTopology |
| Settings | travelMode | — | ELIMINADO | Eliminación | Deprecado. El perfil se define en resource_types.osrmProfile |
| Settings | state (Int) | settings | isActive (Boolean) | Transformación | state=1 → isActive=true, otros → false |
| Settings | settingResource[] (ArrayList<SettingResource>) | settings | resourceIds[] (ObjectId[]) | Reestructuración | settingResource[].quantity/place/typeVehicle/initTime/finishTime → solo IDs. Subcampos migran a resources y settings |
| Settings | routeTopology (enum string) | settings | routeTopology (key string) | Transformación | Mapear de nombre display a key snake_case |
| Driver | identificationNumber, licenceNumber | users (role=DRIVER) | identifierValue | Migración | Driver migra a users. phoneNumber → phone |
| Vehicle | name, licencePlate, typeVehicle | resources | name, licensePlate, resourceTypeId | Migración | 65 docs de vehicle → resources. typeVehicle @DBRef → resourceTypeId ObjectId |
| SettingResource | quantity, initTime, finishTime | resources | quantity, shiftStartUtc, shiftDurationSec | Migración | Subcampos de settingResource migran a resources |
| SettingResource | place | settings | placeStartId (ObjectId) | Derivación | place del primer settingResource → placeStartId del settings |
| — (no existe) | — | resource_types | category | NUEVO | TypeVehicle no tenía campo 'type'. Derivar de name o asignar manualmente |
| — (no existe) | — | resource_types | osrmProfile | NUEVO | TypeVehicle no tenía campo 'profile'. Default: "driving" |
| TypeResources | weight/volume (raíz) | resource_types | capacity.weight/volume | Reestructuración | Agrupados bajo subdocumento 'capacity' |
| Place | latitude/longitude | places | location (GeoJSON Point) | Transformación | Dos campos → GeoJSON { type: 'Point', coordinates: [lon, lat] } |
| Package.zone (String) | zone (nombre) | zones | (colección nueva) | Creación | No existe Zone.java ni colección zone. Extraer valores únicos de package.zone → crear docs. Enriquecer con boundary, code, color, tenantId |
| Package | latitude/longitude | packages | location (GeoJSON Point) | Transformación | Igual que places |
| — (no existe) | — | packages | timeWindow.startUtc/endUtc (Date) | NUEVO | tw_start_utc/tw_end_utc NO existen en Package.java. Campos nuevos para Fase 2 CVRPTW |
| Package | zone (String) | packages | zoneId (ObjectId) | Transformación | String name → ObjectId referencia a zones |
| Package | distanceArrival/timeArrival | — | ELIMINADO | Eliminación | Deprecado. Datos en waypoints |
| Package | visitOrder (String) | — | ELIMINADO | Eliminación | Reemplazado por waypoint.sequence |
| Package | score | packages | geocodingScore | Renombrado | Nombre más descriptivo |
| Package | statusGeocoding | packages | geocodingStatus | Renombrado | camelCase consistente |
| Package | standarizedAddress | packages | standardizedAddress | Corrección typo | Corregido typo en nombre |
| — (no existe) | — | packages | serviceType | NUEVO | service_type NO existe en Package.java. Campo nuevo para clasificar pickup/delivery/mixed |
| Route (colección) | — | journeys.routes[] | — | Embebido | Route deja de ser colección independiente. Se embebe como subdocumento en journeys.routes[] |
| Route | maxWeight/maxVolume | — | ELIMINADO | Eliminación | Deprecado. Se obtiene del recurso asignado (resources → resource_types.capacity) |
| waypoint (colección) | — | journeys.routes[].waypoints[] | — | Embebido | Waypoint deja de ser colección independiente. Se embebe dentro de cada ruta |
| waypoint | serviceType + stopType | waypoints[] | stopType | Unificación | Campos redundantes unificados en uno solo |
| waypoint | arrivalUTC/departureUTC (String) | waypoints[] | arrivalUtc/departureUtc (Date) | Transformación | String → ISODate |
| waypoint | waypointId (GUID) | — | ELIMINADO | Eliminación | No necesario. sequence + routeIndex es suficiente para identificar |
| Journey | date (LocalDate) | journeys | createdAt (Date) | Renombrado + tipo | Journey.java tiene 'date' (LocalDate), no 'created_at'. Transformar a ISODate |
| Journey | invalidPackages (embedded) | journeys | invalidPackageIds (ObjectId[]) | Reestructuración | De subdocumentos embebidos a array de ObjectIds |
| master_domains | types[].name | master_domains | values[].key + values[].label | Reestructuración | Se separa en key técnico (snake_case) + label display |
| master_domains | ordinal numérico (0,1,2...) | master_domains | values[].key (string) | Transformación | Reemplazar código numérico por key descriptivo |
| — (nuevo) | — | tenants | (toda la colección) | Creación | Colección nueva para multitenancy |
| users (OAuth) | username, password, active, etc. | users | email, passwordHash, isActive, role, tenantId | Transformación | Colección existente transformada in-place. Eliminar: accountLocked, tokenActivation. Absorber colección roles |
| — (nuevo) | — | resources | (toda la colección) | Creación | Fusión de vehicle (65 docs) + driver (1 doc) + settingResource subcampos + nuevos campos |
| — (nuevo) | — | zones | (toda la colección) | Creación | Extraer de package.zone (String). No existía Zone.java |
| — (nuevo) | — | journey_metrics | (toda la colección) | Creación | No existía JourneyMetrics.java. Derivar de Journey.minTime/avgTime/maxTime y FleetUsageSummary |
| AssignedService | vehicle, route, driver (@DBRef) | — | Rediseñar | Migración crítica | @DBRef a Vehicle, Route, Driver se rompen. Actualizar a resourceId, journeyId+routeIndex |
| VehiclePosition | driver, vehicle refs | — | Actualizar refs | Migración | Cambiar refs a User (role=DRIVER) y Resource |
| PlanConfig | travelMode ref | — | Actualizar | Migración | TravelMode se elimina → usar resource_types.osrmProfile |
| TravelMode | (colección) | — | ELIMINAR | Eliminación | Reemplazado por resource_types.osrmProfile |
| Route | instructions (Array[Array]) | route_navigations | instructionsLegacy (Array[Array]) | Extracción | Se extrae de Route → doc separado con osrmVersion='v4'. Formato raw v4 preservado |
| Route | viaPoints (Array[Array[Number]]) | route_navigations | viaPointsLegacy + snappedWaypoints | Extracción + transformación | Se extrae y además se genera snappedWaypoints con orden [lon,lat] normalizado |
| — (CVRPTW) | OSRM v5 legs[].steps[] | route_navigations | legs[] (Array[Document]) | Creación | Nuevo para datos OSRM v5. Estructura legs → steps → maneuver |
| Route | instructions + viaPoints | routes_embedded | ELIMINADOS | Eliminación | Ya no en journeys.routes[]. Se consultan desde route_navigations on-demand |
| Route | vehicleTypeName (String) | — | ELIMINADO | Eliminación | Redundante. Se obtiene vía resourceId → resources.resourceTypeId → resource_types.name |
| Route | startRouteDate (LocalTime) + date (LocalDate) | routes_embedded | startRouteUtc (ISODate) | Transformación | Combinar LocalTime + LocalDate → ISODate UTC. Aplicar offset de zona horaria del tenant |
| Route | finishRouteDate (LocalTime) + date (LocalDate) | routes_embedded | finishRouteUtc (ISODate) | Transformación | Combinar LocalTime + LocalDate → ISODate UTC. Aplicar offset de zona horaria del tenant |
| Journey | place (Place embebido) | — | ELIMINADO | Eliminación | Redundante. Depósitos se definen en settings.placeStartId/placeEndId según routeTopology |
| Journey | routeRestrictionType (String) | — | ELIMINADO | Eliminación | Redundante. Se obtiene de settingsId → settings.restrictionType |
| Journey | countRoutes (Integer) | — | ELIMINADO | Eliminación | Calculado. Es routes.length |
| — (hardcoded) | PENDIENTE/ENTREGADO/RECHAZADO | master_domains | PackageStatus values[] | Creación | Mapeo: PENDIENTE→pending, ENTREGADO→attended, RECHAZADO→unattended. Nuevo: cancelled |
| Settings | — | settings | shiftStartUtc, shiftDurationSec, breakDurationSec | NUEVO | Dual-mode: si settings tiene valor → global. Si null/< 0 → usar valor individual del resource |
| waypoint | coordinates [lat,lon] (v4) | waypoints[] | coordinates [lon,lat] | Transformación | Invertir orden a [lon,lat] (GeoJSON/v5) durante migración |

---

## 4. Recomendaciones

| Área | Recomendación | Prioridad | Impacto |
| --- | --- | --- | --- |
| Índices | Crear todos los índices compuestos con tenantId como primer campo para garantizar query isolation | Alta | Rendimiento y seguridad de datos entre tenants |
| Índices | Usar índices 2dsphere en campos GeoJSON (places.location, packages.location, zones.boundary) | Alta | Habilita $near, $geoWithin, $geoIntersects |
| Índices | Considerar índices parciales (partialFilterExpression: {deletedAt: null}) en colecciones con soft delete | Media | Reduce tamaño del índice, mejora rendimiento |
| Middleware | Implementar middleware de tenant que inyecte tenantId en todas las queries automáticamente | Alta | Previene data leaks entre tenants |
| Middleware | Validar que el usuario autenticado pertenece al tenantId de cada request | Alta | Seguridad multitenancy |
| Validación | Usar JSON Schema Validation de MongoDB en cada colección para campos requeridos y tipos | Media | Integridad de datos a nivel de BD |
| Validación | Implementar validación de dominios (enums) referenciando master_domains en la capa de aplicación | Media | Consistencia de valores permitidos |
| Auditoría | Usar middleware pre-save para actualizar updatedAt automáticamente | Alta | Consistencia de auditoría |
| Auditoría | Considerar Change Streams para log de auditoría detallado en producción | Baja | Trazabilidad completa de cambios |
| Performance | Para journeys con muchas rutas (>50), considerar paginación de waypoints o lazy loading | Media | Evita documentos >16MB y mejora tiempos de lectura |
| Performance | Usar proyecciones ($project) en queries de listado para no traer waypoints/instructions completos | Alta | Reduce bandwidth y tiempo de deserialización |
| Performance | Considerar read replicas para dashboards/métricas para no impactar operaciones de escritura | Baja | Escalabilidad de lectura |
| Multitenancy | Si un tenant crece significativamente, evaluar migración a database-per-tenant | Baja | Escalabilidad a largo plazo |
| Multitenancy | Implementar rate limiting por tenant para prevenir noisy neighbor | Media | Fairness entre tenants |
| Seguridad | Nunca exponer _id internos en APIs públicas. Usar slugs o UUIDs en URLs | Media | Seguridad y estética de URLs |
| Seguridad | Implementar bcrypt con >= 12 rounds para passwordHash | Alta | Seguridad de credenciales |
| Seguridad | Rotar JWT secrets periódicamente. Usar refresh tokens con expiración corta | Alta | Seguridad de sesiones |
| Migración | Ejecutar migración en modo dual-write durante transición para evitar downtime | Alta | Continuidad operativa |
| Migración | Crear script de migración que: 1) cree tenants, 2) cree users, 3) actualice FKs, 4) transforme coordenadas a GeoJSON | Alta | Orden correcto de migración |
| Mobile (DRIVER) | Implementar endpoint optimizado para conductores que retorne solo rutas asignadas con waypoints | Alta | Experiencia móvil |
| Mobile (DRIVER) | Considerar WebSocket/SSE para actualizaciones en tiempo real de asignación de rutas | Media | Notificación instantánea al conductor |
| Navegación | Cargar route_navigations SOLO cuando el conductor abre la ruta en app móvil, nunca en listados | Alta | Reduce bandwidth móvil ~50x |
| Navegación | Para journeys nuevos (CVRPTW): siempre guardar en formato v5 (legs). instructionsLegacy solo para datos históricos v4 | Alta | Estandarización progresiva hacia v5 |
| Navegación | Considerar TTL index en route_navigations.createdAt para auto-expirar navegación >90 días | Media | Limpieza automática sin impactar journeys |
| Navegación | Escritura post-algoritmo: insertar journey primero, luego route_navigations con bulkWrite. Si falla nav, journey queda usable sin turn-by-turn | Alta | Journey no depende de navegación |
| Navegación | Endpoint móvil: GET /routes/{journeyId}/{routeIndex}/navigation → consulta route_navigations | Alta | API optimizada para DRIVER |
| Migración OSRM | Al migrar viaPoints v4 a snappedWaypoints: invertir [lat,lon] → [lon,lat] para normalizar con GeoJSON | Alta | Consistencia de coordenadas |

---

## 8. Estado de Implementación

Todas las colecciones del modelo Fase 1 han sido implementadas con CRUD completo, tests unitarios y migración de datos.

| Colección | Java Entity | Repository | Service | Controller | Tests | Migración |
|-----------|-------------|------------|---------|------------|-------|-----------|
| `tenants` | `Tenant` | `TenantRepository` | `TenantServiceImpl` | `TenantController` | 9 | Step 1 |
| `users` | `RoutingUser` | `RoutingUserRepository` | `RoutingUserServiceImpl` | `RoutingUserController` | 18 | Step 2-3 |
| `master_domains` | `MasterDomain` | `MasterDomainRepository` | `MasterDomainServiceImpl` | `MasterDomainController` | 8 | Seeder |
| `zones` | `Zone` | `ZoneRepository` | `ZoneServiceImpl` | `ZoneController` | 7 | Step 5 |
| `resource_types` | `ResourceType` | `ResourceTypeRepository` | `ResourceTypeServiceImpl` | `ResourceTypeController` | 11 | Step 6 |
| `places` | `RoutingPlace` | `RoutingPlaceRepository` | `PlaceServiceImpl` | `PlaceController` | 18 | Step 4 |
| `resources` | `Resource` | `ResourceRepository` | `ResourceServiceImpl` | `ResourceController` | 16 | Step 7 |
| `settings` | `RoutingSettings` | `SettingsRepository` | `SettingsServiceImpl` | `SettingsController` | 28 | Step 8 |
| `packages` | `RoutingPackage` | `PackageRepository` | `PackageServiceImpl` | `PackageController` | 21 | Step 9 |
| `journeys` | `RoutingJourney` | `JourneyRepository` ¹ | `JourneyServiceImpl` | `JourneyController` ² | 11 | Step 10 |
| `route_navigations` | `RouteNavigation` | `RouteNavigationRepository` | — (via JourneyService) | `JourneyController` ² | — | Step 10 |
| `journey_metrics` | `JourneyMetrics` | `JourneyMetricsRepository` | — (via JourneyService) | `JourneyController` ² | — | — |

> **¹ Bean naming — `JourneyRepository`:** Requiere `@Repository("routingJourneyRepository")` para evitar `ConflictingBeanDefinitionException` con el legacy `com.hanoit.repository.mongo.journey.JourneyRepository`. Spring Data autowire por tipo, el bean name explícito solo resuelve el conflicto de registro.
>
> **² Bean naming — `JourneyController`:** Requiere `@RestController("routingJourneyController")` para evitar conflicto con el legacy `com.hanoit.controller.api.rest.v1.JourneyController`.

#### Flujo de planificación de rutas

El `JourneyController` de Fase 1 (`com.hanoit.routing.controller`) es **solo consulta** (GET / DELETE). No expone POST para planificación.

La planificación se ejecuta a través de los endpoints legacy adaptados:

```
DeliveryControllerJNI (/hanoit/v2/delivery/)
  ├── POST /optimisationForPackages → JourneyPlanningService.createJourney()
  └── POST /optimisationForMessenger → JourneyPlanningService.createMessengerJourney()
```

Ambos endpoints reciben `CreateJourneyRequest`, ejecutan el algoritmo JNI internamente, y retornan `JourneyResponse` con la planificación completa (rutas embebidas, waypoints, métricas). Los datos de navegación se persisten en `route_navigations` de forma separada.

### Pasos de Migración (DataMigrationService) — retirado

> **Histórico (2026-11-19).** `DataMigrationService` y `/api/v1/admin/migrate*` se eliminaron: la plataforma arranca en limpio y no migra datos legacy. Las colecciones legacy se borran con [`../operations/LEGACY_DB_CLEANUP.md`](../operations/LEGACY_DB_CLEANUP.md). La tabla queda como referencia.

| Paso | Método | Descripción | Idempotente |
|------|--------|-------------|-------------|
| 1 | `migrateTenants()` | Crear tenants desde dominios de email únicos | Sí |
| 2 | `migrateUsers()` | OAuth → RBAC: username→email, password→passwordHash, agregar tenantId+role | Sí |
| 3 | `migrateDriversToUsers()` | Crear registros de usuario con role=DRIVER desde colección driver | Sí |
| 4 | `migratePlaces()` | Agregar tenantId, convertir lat/lon a GeoJSON location | Sí |
| 5 | `migrateZones()` | Extraer zonas únicas de packages, crear Zone documents, backfill zoneId | Sí |
| 6 | `migrateResourceTypes()` | typeVehicle → resource_types con capacity y measure | Sí |
| 7 | `migrateResources()` | vehicle → resources con resourceTypeId y tenantId | Sí |
| 8 | `migrateSettings()` | roadRestrictionType→restrictionType, routeTopology, place refs, shift times | Sí |
| 9 | `migratePackages()` | GeoJSON location, status mapping, field renames | Sí |
| 10 | `migrateJourneys()` | Rutas embebidas, route_navigations separadas | Sí |
| 11 | `migrateUserControlToTenantConfig()` | Límites userControl → TenantConfig | Sí |

---

### Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-11-18 | Unidades fijas de plataforma: eliminados `tenants.config.defaultWeightUnit`/`defaultVolumeUnit`; nuevo dominio `MeasurementUnit` (g, cm3, cm, m, s) de solo lectura; `packages.weight`/`volume` documentados en g y cm³. |
| 2026-04-23 | **Adicción §F4** abajo: documenta deltas Fase 4 sobre `tenants`/`users` y nuevas colecciones (`invitations`, `subscriptions`, `otp_codes`, `audit_logs`, `stripe_webhook_events`). |
| 2026-04-15 | Sincronización con código implementado: corregidos valores de `geocodingStatus` (match/mean/unmatch/manual/unprocessed), eliminado campo `date` de routes[] (redundante con startRouteUtc), marcado `operatingHours` como PLANIFICADO (no implementado en Fase 1), marcado índice text de places como PENDIENTE, agregados catálogos GeocodingStatus/JourneyStatus/PlaceType/StopType a master_domains, corregidos nombres de repositorios (SettingsRepository, PackageRepository, JourneyRepository), documentado bean naming explícito para evitar ConflictingBeanDefinitionException, documentado flujo de planificación via DeliveryControllerJNI |
| 2026-04-14 | Agregados campos TenantConfig (maxDeposits, maxDrivers, etc.), tabla de estado de implementación, pasos de migración detallados |
| 2026-03-30 | Versión original del diccionario unificado |

---

## §F4. Adicción Fase 4 — Subscriptions, Trial, OTP, Auditoría, Lockout

> **Estado:** Implementada (F4-01 .. F4-11) | **Verificación:** 2026-04-23
>
> Esta sección complementa §2.1 (`tenants`) y §2.2 (`users`) sin reescribirlas. Para los detalles funcionales, consultar:
> - [`docs/flows/TENANT_ONBOARDING_FLOW.md`](../flows/TENANT_ONBOARDING_FLOW.md) — onboarding self-service, invitaciones, seats, lifecycle
> - [`docs/flows/BILLING_SUBSCRIPTIONS_FLOW.md`](../flows/BILLING_SUBSCRIPTIONS_FLOW.md) — Stripe checkout/portal/upgrade/cancel, planes, webhooks
> - [`docs/flows/NOTIFICATIONS_OTP_FLOW.md`](../flows/NOTIFICATIONS_OTP_FLOW.md) — OTP, push, preferencias
> - [`docs/flows/AUDIT_LOG_FLOW.md`](../flows/AUDIT_LOG_FLOW.md) — modelo de auditoría, 54 acciones, privacidad
> - [`docs/data/DATABASE_DATA_DICTIONARY.md` (Parte C)](DATABASE_DATA_DICTIONARY.md#parte-c--adicción-fase-4-subscriptions-billing-otp-auditoría-lockout) — diccionario campo a campo, índices y enums

### F4.1 Tenants — campos nuevos

`billingEmail`, `billingAddress`, `companySize`, `industry`, `stripeCustomerId`, `stripeSubscriptionId`, `seatLimit`, `seatUsed`, `trialPlan`, `trialStartedAt`, `trialEndsAt`, `trialSeatLimit`, `trialExpired`, `trialReminderSentAt`, `subscriptionStatus`, `canceledAt`, `deactivatedAt`, `deactivatedBy`, `deactivationReason`. Ver Parte C.1 del Data Dictionary.

> **Nota:** durante el trial, `tenants.plan` permanece `free` (string libre) mientras los **límites operativos** se aplican vía `TenantConfig` alimentado por `PlanDefaults` con el `trialPlan` elegido. La fuente de verdad de cuotas durante el trial es `TenantConfig`, no `plan`.

### F4.2 Users — campos nuevos

`emailVerified`, `emailVerificationToken`, `emailVerificationExpiresAt`, `passwordResetToken`, `passwordResetExpiresAt`, `invitedBy`, `invitationAcceptedAt`, `lastPasswordChangedAt`, `loginAttempts`, `lockedUntil`, `phoneVerified`, `notificationPreferences` (embebido), `deviceTokens[]` (embebido). Ver Parte C.2.

> **No existe** `RoutingUser.status` (PENDING/SUSPENDED) ni MFA. El estado se infiere de `active` + `emailVerified` + `lockedUntil > now`. Tampoco hay colecciones separadas para verification/reset tokens, device tokens, o notification preferences: están embebidos.

### F4.3 Colecciones nuevas

| Colección | Función | Notas clave |
|-----------|---------|-------------|
| `invitations` | Invitaciones pendientes/aceptadas/revocadas | Reserva asiento al crear; libera al revocar/expirar; `tokenHash` SHA-256 |
| `subscriptions` | Estado canónico de suscripción Stripe (1:1 con tenant) | Sincronizado por webhook events |
| `otp_codes` | OTPs temporales (sin `tenantId`) | TTL 5 min; `recipientHash` con pepper; `codeHash` BCrypt |
| `audit_logs` | Bitácora inmutable del sistema | 54 acciones, 5 categorías; persistencia `@Async`; `/me` omite `ipAddress` |
| `stripe_webhook_events` | Idempotencia y replay de webhooks Stripe | TTL 30 días; estado `RECEIVED/PROCESSED/FAILED/IGNORED` |

### F4.4 Total de colecciones activas

**12 (Fase 1) + 5 (Fase 4) + 2 catálogos globales (`master_domains`, `roles` legacy si aplica) = 19 colecciones operativas** en producción Fase 4.
