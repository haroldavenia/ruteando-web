> **Estado: Jul 2026** | Superficie canónica `/api/v1/*` (ADR-004). OAuth legacy (`/hanoit/api/v1/user/*`, `/auth/*`, `/oauth/*`) **eliminado** (2026-07-18).
>
> [!IMPORTANT]
> **Usar siempre Fase 4 bajo `/api/v1`:**
> - **Login:** `POST /api/v1/auth/login` con JSON `{ email, password }`
> - **Registro:** `POST /api/v1/auth/register`
> - **Logout:** `POST /api/v1/auth/logout` con `{ refreshToken }`
> - **Recuperación:** `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, `PUT /api/v1/auth/change-password`
> - **Smoke tests:** [`PHASE_4_VALIDATION_REPORT.md`](PHASE_4_VALIDATION_REPORT.md) · Postman `00 _Flows`
>
> Las secciones curl con `/hanoit/api/v1/user/*` son **históricas** (código OAuth eliminado; conservadas solo como referencia de migración).
>
> Catálogo: [`docs/api/endpoints.md`](../api/endpoints.md)

> [!NOTE]
> Swagger: tags por dominio bajo `/api/v1/*`. OAuth legacy oculto o en retiro.

# HanoIT API - Guía Completa de Testing

## 📋 Índice
- [Configuración Inicial](#configuración-inicial)
- [Flujo de Registro y Activación](#flujo-de-registro-y-activación)
- [Autenticación OAuth2](#autenticación-oauth2)
- [Gestión de Tokens](#gestión-de-tokens)
- [Gestión de Perfil](#gestión-de-perfil)
- [Recuperación de Contraseña](#recuperación-de-contraseña)
- [Gestión de Usuarios (Admin)](#gestión-de-usuarios-admin)
- [Flujos Típicos de Uso](#flujos-típicos-de-uso)
- [Configuración en Postman](#configuración-en-postman)

---

## ⚙️ Configuración Inicial

### Variables de Entorno
```bash
# URL base de la API
BASE_URL=http://localhost:8000

# Credenciales de prueba
TEST_USERNAME=usuario@ejemplo.com
TEST_PASSWORD=Password123
```

---

## 🔐 Flujo de Registro y Activación

### 1.1 Registrar nuevo usuario
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'${TEST_USERNAME}'",
    "password": "'${TEST_PASSWORD}'",
    "passwordRepeat": "'${TEST_PASSWORD}'"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Usuario creado con éxito. Revise su email para activar la cuenta."
}
```

### 1.2 Activar cuenta (con token del email)
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DEL_EMAIL"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Cuenta activada exitosamente"
}
```

### 1.3 Reenviar email de verificación
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/resend-verification" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${TEST_USERNAME}'"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Email de verificación reenviado"
}
```

---

## 🔑 Autenticación OAuth2

### 2.1 Login OAuth2 (formato moderno)
```bash
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'${TEST_USERNAME}'",
    "password": "'${TEST_PASSWORD}'"
  }'
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600
}
```

### 2.2 Login Legacy (formato antiguo)
```bash
curl -X POST "${BASE_URL}/auth/login-legacy" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}&password=${TEST_PASSWORD}"
```

### 2.3 OAuth2 Token Endpoint
```bash
curl -X POST "${BASE_URL}/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&username=${TEST_USERNAME}&password=${TEST_PASSWORD}"
```

---

## 🔄 Gestión de Tokens

### 3.1 Refresh Token (formato JSON)
```bash
curl -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN_AQUI"
  }'
```

### 3.2 Refresh Token Legacy (formato query)
```bash
curl -X POST "${BASE_URL}/auth/refresh-legacy?refresh_token=REFRESH_TOKEN_AQUI"
```

### 3.3 Refresh Token (formato legacy alternativo)
```bash
curl -X POST "${BASE_URL}/auth/refresh-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "refresh_token=REFRESH_TOKEN_AQUI"
```

### 3.4 Logout (revoca refresh token)
```bash
curl -X POST "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"
```

---

## 👤 Gestión de Perfil

### 4.1 Obtener perfil del usuario autenticado
```bash
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"
```

**Respuesta esperada:**
```json
{
  "id": "123",
  "username": "usuario@ejemplo.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "active": true,
  "roles": ["ROLE_USER"]
}
```

### 4.2 Actualizar perfil del usuario autenticado
```bash
curl -X PUT "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "+573001234567"
  }'
```

### 4.3 Cambiar contraseña del usuario autenticado
```bash
curl -X POST "${BASE_URL}/auth/change-password" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "Password123",
    "newPassword": "NuevaPassword456"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Contraseña cambiada exitosamente"
}
```

---

## 🔒 Recuperación de Contraseña

### 5.1 Solicitar recuperación de contraseña
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${TEST_USERNAME}'"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Se ha enviado un email con instrucciones para recuperar su contraseña"
}
```

### 5.2 Restablecer contraseña con token
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword/reset" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DE_RECUPERACION",
    "password": "NuevaPassword456",
    "passwordRepeat": "NuevaPassword456"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Contraseña restablecida exitosamente"
}
```

---

## 👥 Gestión de Usuarios (Admin)

### 6.1 Obtener todos los usuarios
```bash
curl -X GET "${BASE_URL}/hanoit/api/v1/user/users" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

### 6.2 Obtener usuario por ID
```bash
curl -X GET "${BASE_URL}/hanoit/api/v1/user/users/123" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

### 6.3 Obtener usuario por username
```bash
curl -X GET "${BASE_URL}/hanoit/api/v1/user/users/username/${TEST_USERNAME}" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

### 6.4 Actualizar usuario
```bash
curl -X PUT "${BASE_URL}/hanoit/api/v1/user/users/123" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "active": true
  }'
```

### 6.5 Eliminar usuario
```bash
curl -X DELETE "${BASE_URL}/hanoit/api/v1/user/users/123" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

**Respuesta esperada:**
```json
{
  "message": "Usuario eliminado exitosamente"
}
```

### 6.6 Asignar roles a usuario
```bash
curl -X PUT "${BASE_URL}/hanoit/api/v1/user/users/123/roles" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '["ROLE_ADMIN", "ROLE_BASIC"]'
```

### 6.7 Pre-cargar roles del sistema
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/loadRole" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

---

## 🔄 Flujos Típicos de Uso

### Flujo 1: Registro y Primer Login
```bash
# 1. Registrar usuario
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'${TEST_USERNAME}'",
    "password": "'${TEST_PASSWORD}'",
    "passwordRepeat": "'${TEST_PASSWORD}'"
  }'

# 2. Activar cuenta (con token del email)
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DEL_EMAIL"
  }'

# 3. Login
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'${TEST_USERNAME}'",
    "password": "'${TEST_PASSWORD}'"
  }'

# 4. Obtener perfil
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"
```

### Flujo 2: Uso Diario
```bash
# 1. Login
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'${TEST_USERNAME}'",
    "password": "'${TEST_PASSWORD}'"
  }'

# 2. Usar API protegida
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"

# 3. Refresh token (cuando expire)
curl -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN_AQUI"
  }'

# 4. Logout
curl -X POST "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"
```

### Flujo 3: Recuperación de Contraseña
```bash
# 1. Solicitar recuperación
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${TEST_USERNAME}'"
  }'

# 2. Restablecer contraseña
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword/reset" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DE_RECUPERACION",
    "password": "NuevaPassword456",
    "passwordRepeat": "NuevaPassword456"
  }'

# 3. Login con nueva contraseña
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'${TEST_USERNAME}'",
    "password": "NuevaPassword456"
  }'
```

---

## 🛠️ Configuración en Postman

> [!IMPORTANT]
> Ya existe una **colección oficial versionada** que mapea el 100% de los endpoints canónicos `/api/*`
> (Fase 1/2/4), organizada por dominio + flujos E2E, con auth a nivel de colección, environments y
> captura automática de tokens/IDs. **Úsala en lugar de configurar Postman a mano.**
>
> - Colección: [`postman/Hanoit-API.postman_collection.json`](../../postman/Hanoit-API.postman_collection.json)
> - Environment local: [`postman/environments/Hanoit-Local.postman_environment.json`](../../postman/environments/Hanoit-Local.postman_environment.json)
> - Guía de uso y Newman: [`postman/README.md`](../../postman/README.md)
>
> Los apartados manuales de más abajo se conservan solo como referencia histórica.

### Variables de Entorno
Crea un environment en Postman con las siguientes variables:

| Variable | Valor Inicial | Descripción |
|----------|---------------|-------------|
| `base_url` | `http://localhost:8000` | URL base de la API |
| `access_token` | (vacío) | Token de acceso (se llena automáticamente) |
| `refresh_token` | (vacío) | Token de refresh (se llena automáticamente) |
| `test_username` | `usuario@ejemplo.com` | Usuario de prueba |
| `test_password` | `Password123` | Contraseña de prueba |

### Headers Comunes

#### Para endpoints JSON:
```
Content-Type: application/json
```

#### Para endpoints protegidos:
```
Authorization: Bearer {{access_token}}
```

### Tests Automáticos

#### Test para Login (guardar tokens automáticamente):
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.accessToken);
    pm.environment.set("refresh_token", response.refreshToken);
    
    console.log("Tokens guardados automáticamente");
    console.log("Access Token:", response.accessToken);
    console.log("Refresh Token:", response.refreshToken);
}
```

#### Test para Refresh Token:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.accessToken);
    
    console.log("Nuevo Access Token guardado");
}
```

### Colección de Postman

> Usa la colección versionada en [`postman/Hanoit-API.postman_collection.json`](../../postman/Hanoit-API.postman_collection.json).
> Sus carpetas cubren todos los dominios `/api/*` y una carpeta `00 _Flows` con escenarios E2E ordenados.

Estructura de carpetas de la colección oficial:

- `00 _Flows` — escenarios E2E (Onboarding, Team & Seats, Billing, OTP, Logistics)
- `01 Auth & Session`, `02 Account & Profile`
- `03 Tenants`, `04 Users & Team`, `05 Invitations`, `06 Billing & Subscriptions`
- `07 Notifications`, `08 Audit Logs`
- `09 Journeys & Routing`, `10 Driver`, `11 Packages`, `12 Places & Zones`
- `13 Resources & Resource Types`, `14 Settings & Master Domains`, `15 Geocoding`
- `16 Admin` (geocoding-config), `17 Webhooks`

### Scripts de Pre-request

Para endpoints que requieren tokens, puedes agregar un script de pre-request que verifique si el token existe:

```javascript
if (!pm.environment.get("access_token")) {
    console.warn("No hay access token configurado. Ejecuta el login primero.");
}
```

---

## 📊 Códigos de Respuesta

### Respuestas Exitosas
- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `204 No Content` - Operación exitosa sin contenido

### Respuestas de Error
- `400 Bad Request` - Datos inválidos
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - No autorizado
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto (ej: usuario ya existe)
- `500 Internal Server Error` - Error del servidor

---

## 🔍 Debugging

### Verificar tokens en logs
```bash
# Verificar que el token es válido
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -v
```

### Verificar respuesta completa
```bash
# Agregar -v para ver headers y detalles
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "test@example.com", "password": "password"}' \
  -v
```

---

## 📝 Notas Importantes

1. **JSON Standard**: Todos los endpoints ahora usan JSON como formato estándar
2. **Tokens**: Los access tokens tienen una duración limitada (típicamente 1 hora)
3. **Refresh**: Usa refresh tokens para obtener nuevos access tokens
4. **Logout**: Siempre haz logout para revocar refresh tokens
5. **Seguridad**: Nunca compartas tokens en logs o código
6. **Testing**: Usa usuarios de prueba, no cuentas reales
7. **Validación**: Todos los endpoints incluyen validación de datos de entrada

---

## 🆘 Troubleshooting

### Error 401 Unauthorized
- Verifica que el token no haya expirado
- Usa el refresh token para obtener un nuevo access token
- Verifica que el usuario esté activo

### Error 400 Bad Request
- Verifica el formato JSON de los datos enviados
- Asegúrate de usar el Content-Type correcto
- Revisa que todos los campos requeridos estén presentes

### Error 500 Internal Server Error
- Revisa los logs del servidor
- Verifica que la base de datos esté funcionando
- Contacta al equipo de desarrollo

---

*Última actualización: Junio 2024*

---

## API v2 — Plataforma de Ruteo (Fase 1)

Base URL: `http://localhost:8000`

### Autenticacion

```bash
# Login
curl -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Password123"}'

# Response
# {"accessToken": "eyJ...", "refreshToken": "uuid-...", "expiresIn": 3600, "user": {...}}

# Guardar el token
TOKEN="eyJ..."

# Refresh
curl -X POST "${BASE_URL}/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "uuid-..."}'

# Logout
curl -X POST "${BASE_URL}/api/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "uuid-..."}'
```

### Tenants (SUPER_ADMIN)

```bash
# Crear tenant
curl -X POST "${BASE_URL}/api/v1/tenants" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Mi Empresa", "slug": "mi-empresa", "country": "CO", "timezone": "America/Bogota", "plan": "premium", "config": {"maxDrivers": 50, "maxAddressesPerFile": 5000}}'
# config.defaultWeightUnit / defaultVolumeUnit -> 400 VALIDATION_ERROR (unidades fijas de plataforma)

# Unidades de medida de la plataforma (cualquier rol autenticado)
curl -X GET "${BASE_URL}/api/v1/units" -H "Authorization: Bearer ${TOKEN}"

# Listar tenants
curl -X GET "${BASE_URL}/api/v1/tenants" -H "Authorization: Bearer ${TOKEN}"

# Obtener por ID
curl -X GET "${BASE_URL}/api/v1/tenants/{id}" -H "Authorization: Bearer ${TOKEN}"

# Obtener por slug
curl -X GET "${BASE_URL}/api/v1/tenants/slug/mi-empresa" -H "Authorization: Bearer ${TOKEN}"

# Toggle activo
curl -X PATCH "${BASE_URL}/api/v1/tenants/{id}/toggle-active" -H "Authorization: Bearer ${TOKEN}"
```

### Usuarios (TENANT_ADMIN)

```bash
# Crear usuario
curl -X POST "${BASE_URL}/api/v1/users" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"email": "driver@example.com", "password": "Password123", "firstName": "Juan", "lastName": "Perez", "role": "driver", "phone": "+573001234567"}'

# Listar usuarios
curl -X GET "${BASE_URL}/api/v1/users?page=0&size=20" -H "Authorization: Bearer ${TOKEN}"

# Listar drivers
curl -X GET "${BASE_URL}/api/v1/users/drivers" -H "Authorization: Bearer ${TOKEN}"

# Soft delete
curl -X DELETE "${BASE_URL}/api/v1/users/{id}" -H "Authorization: Bearer ${TOKEN}"
```

### Tipos de Recurso

```bash
# Crear tipo de recurso
curl -X POST "${BASE_URL}/api/resource-types" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Camion 3.5T", "category": "vehicle", "osrmProfile": "driving", "capacity": {"weight": 3500000, "volume": 15000000}, "restriction": {"minWeight": 0, "maxWeight": 50000}}'
# capacity/restriction: peso en gramos, volumen en cm3

# Listar activos
curl -X GET "${BASE_URL}/api/resource-types/active" -H "Authorization: Bearer ${TOKEN}"
```

### Lugares (Places)

```bash
# Crear lugar (deposito)
curl -X POST "${BASE_URL}/api/places" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bodega Central", "type": "depot", "address": "Cra 7 #32-16, Bogota", "longitude": -74.0721, "latitude": 4.6097, "phoneNumber": "+571234567"}'

# Buscar cercanos
curl -X GET "${BASE_URL}/api/places/nearby?lon=-74.07&lat=4.61&maxDistance=5000" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Recursos (Vehiculos)

```bash
# Crear recurso
curl -X POST "${BASE_URL}/api/resources" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Vehiculo 001", "resourceTypeId": "RESOURCE_TYPE_ID", "depotId": "PLACE_ID", "licensePlate": "ABC-123", "shiftDurationSec": 28800, "breakDurationSec": 1800, "quantity": 1}'

# Asignar conductor
curl -X PUT "${BASE_URL}/api/resources/{id}/driver/{driverId}" -H "Authorization: Bearer ${TOKEN}"

# Desasignar conductor
curl -X DELETE "${BASE_URL}/api/resources/{id}/driver" -H "Authorization: Bearer ${TOKEN}"
```

### Configuraciones (Settings)

```bash
# Crear configuracion
curl -X POST "${BASE_URL}/api/settings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"description": "Reparto diario", "routeTopology": "round_trip", "restrictionType": "resource_vs_time", "placeStartId": "PLACE_ID", "evaluateWeight": true, "evaluateVolume": false, "shiftDurationSec": 28800, "resourceIds": ["RESOURCE_ID_1", "RESOURCE_ID_2"]}'
```

### Paquetes

```bash
# Crear paquete
curl -X POST "${BASE_URL}/api/packages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Envio #001", "guideNumber": "GN-001", "serviceType": "delivery", "address": "Calle 100 #15-20", "longitude": -74.0489, "latitude": 4.6836, "weight": 5000, "volume": 20000, "pieceNumber": 1, "receiver": {"name": "Maria Lopez", "phone": "+573009876543"}}'

# Cambiar estado
curl -X PATCH "${BASE_URL}/api/packages/{id}/status/attended" -H "Authorization: Bearer ${TOKEN}"

# Filtrar por estado
curl -X GET "${BASE_URL}/api/packages/status/pending" -H "Authorization: Bearer ${TOKEN}"
```

### Jornadas (Journeys) — Planificacion de Rutas

```bash
# Planificar jornada (ejecuta algoritmo de optimizacion)
curl -X POST "${BASE_URL}/api/journeys/plan" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"settingsId": "SETTINGS_ID", "packageIds": ["PKG_ID_1", "PKG_ID_2", "PKG_ID_3"], "name": "Jornada 2026-04-14"}'

# Listar jornadas
curl -X GET "${BASE_URL}/api/journeys?page=0&size=10" -H "Authorization: Bearer ${TOKEN}"

# Obtener detalle con rutas embebidas
curl -X GET "${BASE_URL}/api/journeys/{id}" -H "Authorization: Bearer ${TOKEN}"

# Navegacion turn-by-turn de todas las rutas
curl -X GET "${BASE_URL}/api/journeys/{journeyId}/navigations" -H "Authorization: Bearer ${TOKEN}"

# Navegacion de una ruta especifica
curl -X GET "${BASE_URL}/api/journeys/{journeyId}/navigations/0" -H "Authorization: Bearer ${TOKEN}"

# Metricas KPI
curl -X GET "${BASE_URL}/api/journeys/{journeyId}/metrics" -H "Authorization: Bearer ${TOKEN}"

# Soft delete
curl -X DELETE "${BASE_URL}/api/journeys/{id}" -H "Authorization: Bearer ${TOKEN}"
```

### Zonas

```bash
# Crear zona
curl -X POST "${BASE_URL}/api/zones?tenantId=TENANT_ID" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Zona Norte", "code": "ZN-01", "color": "#FF5733"}'

# Buscar zonas que contienen un punto
curl -X GET "${BASE_URL}/api/zones/containing?longitude=-74.07&latitude=4.61" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Master Domains (Catalogos)

```bash
# Listar todos los catalogos
curl -X GET "${BASE_URL}/api/master-domains" -H "Authorization: Bearer ${TOKEN}"

# Obtener valores de un catalogo
curl -X GET "${BASE_URL}/api/master-domains/package_status/values" -H "Authorization: Bearer ${TOKEN}"

# Agregar valor a un catalogo (solo tenant_admin / super_admin; PackageStatus, Role,
# JourneyStatus y StopType son de solo lectura porque el backend valida contra enums)
curl -X POST "${BASE_URL}/api/v1/master-domains/PlaceType/values" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"key": "hub", "label": "Hub", "description": "Centro de cross-docking"}'
```

### Rutas del Conductor (DRIVER)

```bash
# Listar mis rutas asignadas
curl -X GET "${BASE_URL}/api/driver/routes" -H "Authorization: Bearer ${DRIVER_TOKEN}"

# Detalle de una ruta
curl -X GET "${BASE_URL}/api/driver/routes/{journeyId}/0" -H "Authorization: Bearer ${DRIVER_TOKEN}"
```

### Configuracion de geocodificacion (SUPER_ADMIN)

```bash
# Leer la configuracion global (valores por defecto si no se ha guardado)
curl -X GET "${BASE_URL}/api/v1/admin/geocoding-config" -H "Authorization: Bearer ${TOKEN}"

# Reemplazar la configuracion completa (PUT sustituye todos los campos)
curl -X PUT "${BASE_URL}/api/v1/admin/geocoding-config" -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"geocodingStrategyClassName": "com.hanoit.service.geocoding.strategy.v2.spi.provider.BatchSecuentialMultiThreadStrategy",
       "arcGisMaxAddressesPerRequest": 1000, "arcGisMaxThreads": 4,
       "geocentrixMaxAddressesPerRequest": 1000, "geocentrixMaxThreads": 4}'
```

No hay endpoints de migracion: el sistema arranca en limpio (ver `docs/operations/LEGACY_DB_CLEANUP.md`).

### Swagger UI

Acceder a la documentacion interactiva: `http://localhost:8000/swagger-ui.html`

Documento unificado con tags por modulo. Controllers legacy ocultos con `@Hidden`.

---

### Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-14 | Agregada seccion completa API v2 con ejemplos curl para 13 controllers (~60 endpoints) |
| 2026-03-30 | Version original con endpoints legacy |
