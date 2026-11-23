> Estado: Actualizado | Fase 1 + Fase 4 incluidas | 2026-04-18

Comparativa de columnas por rol (Legacy — Planes de suscripcion)

> [!NOTE]
> En la Fase 1, la logica de planes (FREE/BASIC/PREMIUM/ENTERPRISE) se migro a `TenantConfig`
> dentro de la coleccion `tenants`. Los limites ahora se controlan con campos como `maxDeposits`,
> `maxDrivers`, `maxRoutes`, `maxAdmins`, `maxAddressesPerFile`, `maxGeocodedAddresses`,
> `maxDefaultResources`. Ver `Diccionario_Datos_Unificado_MongoDB.md` para detalles.

Columna	FREE	BASIC	PREMIUM	ENTERPRISE
ID_GUIA	si	si	si	si
LONGITUD	si	si	si	si
LATITUD	si	si	si	si
PAIS	si	si	si	si
CIUDAD	si	si	si	si
DIRECCION	si	si	si	si
ESTADIA	no	si	si	si
NUM_PIEZAS	no	si	si	si
VOLUMEN	no	no	si	si
PESO	no	no	si	si
ZONA	no	no	si	si
CATEGORIA_PAQUETE	no	no	no	si
HORA_MINIMO	no	no	no	si
HORA_MAXIMO	no	no	no	si
REMITENTE	no	si	si	si
TEL_REMITENTE	no	si	si	si
DESTINATARIO	si	si	si	si
TEL_DESTINATARIO	si	si	si	si
OBSERVACIONES	no	si	si	si
CODIGO_POSTAL	si	si	si	si

---

Roles RBAC — Fase 1 (Nuevo sistema de autorizacion)

Los planes de suscripcion legacy fueron reemplazados por un sistema RBAC con 4 roles funcionales:

Rol              Descripcion                         Acceso a endpoints
SUPER_ADMIN      Administrador global del sistema     /api/v1/tenants/**, /api/v1/admin/**, todos
TENANT_ADMIN     Administrador de organizacion        /api/v1/users/**, endpoints de su tenant
AGENT            Operador de ruteo y logistica         Endpoints /api/v1/* autenticados autenticados (su tenant)
DRIVER           Conductor (app movil)                 Solo /api/v1/driver/**

Migracion de permisos por campo:

Campo CSV           Antes (por plan)         Ahora (Fase 1)
ID_GUIA             Todos los planes         Todos los roles
LONGITUD/LATITUD    Todos los planes         Todos los roles
ESTADIA             BASIC+                   Todos los roles (campo durationStay)
VOLUMEN/PESO        PREMIUM+                 Controlado por evaluateWeight/evaluateVolume en Settings
ZONA                PREMIUM+                 Todos los roles (campo zoneId)
CATEGORIA_PAQUETE   ENTERPRISE               Todos los roles (campo category)
HORA_MIN/MAX        ENTERPRISE               Todos los roles (campo timeWindow)

Los limites que antes se controlaban por plan ahora se configuran por tenant en TenantConfig:

Limite legacy              Campo TenantConfig           Default
Max depositos              config.maxDeposits           100
Max conductores            config.maxDrivers            50
Max rutas                  config.maxRoutes             100
Max administradores        config.maxAdmins             10
Max direcciones/archivo    config.maxAddressesPerFile    5000
Max geocodificaciones      config.maxGeocodedAddresses   10000
Max recursos default       config.maxDefaultResources   50

---

Fase 4 — Seats, Trial y Billing (Nuevo modelo de suscripcion)

En Fase 4, la relacion entre planes y limites se gestiona con el siguiente modelo:

Modelo de Seats y Pricing:
- Seats ILIMITADOS en todos los planes pagos (basic, standard, premium, enterprise)
- Solo FREE tiene limite de 2 seats (seatLimit=2)
- Pricing es flat (precio fijo mensual o anual por tenant), NO per-seat
- TENANT_ADMIN invita agents/drivers por email sin restriccion de seats (en planes pagos)
- Enterprise es a medida: sin precio fijo, se cotiza segun necesidades del cliente

Plan        seatLimit    Pricing                           maxRoutes/mes
FREE        2            $0 (gratis)                       5
BASIC       Unlimited    $XX/mes o $XX/año (20% dto)       10,000
STANDARD    Unlimited    $XX/mes o $XX/año (20% dto)       100,000
PREMIUM     Unlimited    $XX/mes o $XX/año (20% dto)       500,000
ENTERPRISE  Unlimited    Cotización a medida               Custom

> Nota: "premium" del modelo anterior ahora es "standard". El nuevo "premium" es un tier superior.
> Enterprise no tiene precio fijo en Stripe — se configura manualmente por SUPER_ADMIN.
> Descuento anual: 20% sobre precio mensual (annual = monthly × 12 × 0.80). Los price IDs en Stripe reflejan estos montos.

Defaults por plan (TenantConfig):

Campo                      FREE    BASIC    STANDARD   PREMIUM    ENTERPRISE
seatLimit                  2       Unlim    Unlim      Unlim      Unlim
maxDeposits                1       10       50         100        custom
maxDrivers                 1       100      300        1000       custom
maxRoutesMonthly           5       10000    100000     500000     custom
maxAdmins                  1       3        10         30         custom
maxAddressesPerFile        100     5000     10000      20000      custom
Campos CSV habilitados     basicos +peso,vol,zona  todos   todos      todos

> maxRoutesMonthly es cuota mensual (se resetea al inicio de cada billing cycle)

Trial de 14 dias:
- Al registrarse, el usuario puede elegir plan (basic/standard/premium/enterprise) con trial gratuito
- Duracion: 14 dias desde registro
- Seats durante trial: 2 (TENANT_ADMIN + 1 invitado: agent O driver)
- Funcionalidades: todas las del plan elegido, sin restriccion
- Limites: los del plan elegido, NO los de FREE
- Al vencer sin pagar: downgrade automatico a FREE (seatLimit=2, config=FREE defaults)
- Al pagar antes de vencer: trial termina, subscriptionStatus → active, seats ilimitados
- Solo 1 trial por tenant (campo trialPlan != null indica que ya uso trial)

Acceso a endpoints por rol (Fase 4 — ampliado):

Rol              Endpoints Fase 1                    Endpoints Fase 4 nuevos
SUPER_ADMIN      /api/v1/tenants/**, /api/v1/admin/**      /api/admin/audit-logs, /api/v1/tenants/{id}/deactivate, /api/v1/tenants/{id}/activate
TENANT_ADMIN     /api/v1/users/**, su tenant             /api/v1/tenants/me, /api/v1/invitations, /api/v1/billing/**, /api/v1/audit-logs, /api/v1/users/{id}/deactivate
AGENT            /api/* autenticados (su tenant)      /api/v1/auth/me, /api/v1/auth/change-password, /api/v1/notifications/**, /api/v1/audit-logs/me
DRIVER           /api/v1/driver/**                       /api/v1/auth/me, /api/v1/auth/change-password, /api/v1/notifications/push/**, /api/v1/audit-logs/me

Catalogos y motivos de estado (2026-11-18):
- GET /api/v1/master-domains/** : los 4 roles. Escritura solo TENANT_ADMIN y SUPER_ADMIN, y solo en audit_actions; los 12 catalogos de enum y MeasurementUnit responden 422.
- GET /api/v1/package-status-reasons : los 4 roles (motivos de su tenant).
- POST /api/v1/package-status-reasons, PUT /{key}, PATCH /{key}/toggle : TENANT_ADMIN y SUPER_ADMIN. AGENT y DRIVER reciben 403.
- PATCH /api/v1/packages/{id}/status/{status}?reason= : cualquier rol autenticado del tenant.

Flota y conductor (2026-11-19):
- POST /api/v1/driver/positions, PUT /api/v1/driver/packages/report : solo DRIVER (el conductor sale del JWT). Los demas roles reciben 403.
- GET /api/v1/positions, /api/v1/positions/{driverId} : cualquier rol autenticado del tenant.
- GET/PUT /api/v1/admin/geocoding-config : solo SUPER_ADMIN.
- Retirados (404): /api/v1/assigned-services/**, /api/v1/driver/assignments, /api/v1/admin/migrate/**.

Endpoints publicos (sin autenticacion):
- POST /api/v1/auth/register, /api/v1/auth/verify-email, /api/v1/auth/resend-verification
- POST /api/v1/auth/forgot-password, /api/v1/auth/reset-password
- GET/POST /api/v1/invitations/accept/{token}
- POST /api/v1/notifications/otp/send, /api/v1/notifications/otp/resend, /api/v1/notifications/otp/verify
- POST /api/v1/webhooks/stripe (verificado con signature)

---

Changelog

Fecha         Cambio
2026-11-19    Retiro del legacy: sin assigned-services, driver/assignments ni admin/migrate; permisos de posiciones, reporte de entrega y geocoding-config
2026-11-18    Catalogos de enum de solo lectura; motivos de estado de paquete por tenant (/api/v1/package-status-reasons) con escritura TENANT_ADMIN/SUPER_ADMIN
2026-04-20    Reestructuracion de planes: premium→standard, nuevo premium, enterprise a medida, seats ilimitados para pagos, pricing flat (no per-seat), maxRoutesMonthly, 20% descuento anual, OTP dual-channel (SMS+email), audit operativo (/me), endpoints publicos actualizados
2026-04-18    Agregado modelo de seats, precios por plan, defaults TenantConfig por plan, trial 14 dias, endpoints F4 por rol, endpoints publicos
2026-04-14    Agregada tabla RBAC (4 roles), migracion de permisos por campo, TenantConfig
Original      Tabla comparativa columnas por plan (FREE/BASIC/PREMIUM/ENTERPRISE)