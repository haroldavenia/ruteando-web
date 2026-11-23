> [!WARNING]
> **Documento histórico (2026-11-17).** Describe rutas retiradas y sus ejemplos **no son ejecutables**:
> la superficie real es `/api/v1/auth/*` y `/api/v1/users/*`. Para el contrato vigente usar
> [`AUTHENTICATION_ENDPOINTS.md`](AUTHENTICATION_ENDPOINTS.md) y [`../api/endpoints.md`](../api/endpoints.md).

> **Estado: DEPRECADO** | Reemplazado por `/api/auth/*` y `/api/users/*` | Última revisión: 2026-04-23 (post-F4)

> [!CAUTION]
> Este documento describe el flujo de autenticacion y gestion de usuarios **legacy**. Los endpoints documentados aqui estan **deprecados** y ocultos en Swagger (`@Hidden`).
>
> **Para la API actual (Fase 4), consultar:**
> - [`docs/api/endpoints.md`](../api/endpoints.md) — Referencia completa de endpoints `/api/*` (incluye Fase 4)
> - [`AUTHENTICATION_ENDPOINTS.md`](AUTHENTICATION_ENDPOINTS.md) — Auth v2 multitenant + hardening F4-08
> - [`docs/flows/TENANT_ONBOARDING_FLOW.md`](../flows/TENANT_ONBOARDING_FLOW.md) — Onboarding self-service end-to-end
> - [`docs/frontend/migration-guide.md`](../frontend/migration-guide.md) — Guia de migracion + error codes F4
>
> **Endpoints documentados aqui que NO existen en codigo:**
> - `PUT /auth/me` — Migrado a `PUT /api/auth/me` (F4)
> - `POST /auth/change-password` — Migrado a `PUT /api/auth/change-password` (F4-08)
> - `GET /auth/token-info` — Ruta real es `GET /oauth/token/info`
>
> **Migración Fase 4 reintrodujo en `/api/auth/*`:** `register`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password`, `change-password`, `me`. La tabla de "Migración a API v2" en este doc (sección final) **subestima** la cobertura actual: prácticamente todo el lifecycle de auth y users tiene equivalente nativo en Fase 4. Usar `endpoints.md` como referencia canónica.

# 🚀 HanoIT API - Guía Completa de Testing (Legacy)

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
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}&password=${TEST_PASSWORD}&password-repeat=${TEST_PASSWORD}"
```

**Respuesta esperada:**
```json
{
  "message": "Usuario registrado exitosamente. Verifique su email para activar la cuenta."
}
```

### 1.2 Activar cuenta (con token del email)
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup/activate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DEL_EMAIL"
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
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}"
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
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN_AQUI"
  }'
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
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}"
```

**Respuesta esperada:**
```json
{
  "message": "Email de recuperación enviado"
}
```

### 5.2 Restablecer contraseña con token
```bash
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword/reset" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DE_RECUPERACION&password=NuevaPassword456&password-repeat=NuevaPassword456"
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
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}&password=${TEST_PASSWORD}&password-repeat=${TEST_PASSWORD}"

# 2. Activar cuenta (con token del email)
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup/activate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DEL_EMAIL"

# 3. Login
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "'${TEST_USERNAME}'", "password": "'${TEST_PASSWORD}'"}'

# 4. Obtener perfil
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"
```

### Flujo 2: Uso Diario
```bash
# 1. Login
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "'${TEST_USERNAME}'", "password": "'${TEST_PASSWORD}'"}'

# 2. Usar API protegida
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"

# 3. Refresh token (cuando expire)
curl -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "REFRESH_TOKEN_AQUI"}'

# 4. Logout
curl -X POST "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "REFRESH_TOKEN_AQUI"}'
```

### Flujo 3: Recuperación de Contraseña
```bash
# 1. Solicitar recuperación
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}"

# 2. Restablecer contraseña
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword/reset" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DE_RECUPERACION&password=NuevaPassword456&password-repeat=NuevaPassword456"

# 3. Login con nueva contraseña
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "'${TEST_USERNAME}'", "password": "NuevaPassword456"}'
```

---

## 🛠️ Configuración en Postman

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

#### Para endpoints form:
```
Content-Type: application/x-www-form-urlencoded
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

Crea una colección con las siguientes carpetas:

1. **Auth** - Endpoints de autenticación
2. **User Management** - Gestión de usuarios
3. **Profile** - Gestión de perfil
4. **Password Recovery** - Recuperación de contraseña
5. **Admin** - Endpoints de administración

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

1. **Tokens**: Los access tokens tienen una duración limitada (típicamente 1 hora)
2. **Refresh**: Usa refresh tokens para obtener nuevos access tokens
3. **Logout**: Siempre haz logout para revocar refresh tokens
4. **Seguridad**: Nunca compartas tokens en logs o código
5. **Testing**: Usa usuarios de prueba, no cuentas reales

---

## 🆘 Troubleshooting

### Error 401 Unauthorized
- Verifica que el token no haya expirado
- Usa el refresh token para obtener un nuevo access token
- Verifica que el usuario esté activo

### Error 400 Bad Request
- Verifica el formato de los datos enviados
- Asegúrate de usar el Content-Type correcto
- Revisa que todos los campos requeridos estén presentes

### Error 500 Internal Server Error
- Revisa los logs del servidor
- Verifica que la base de datos esté funcionando
- Contacta al equipo de desarrollo

---

*Última actualización: Junio 2024*

---

## 📁 Estructura del Archivo

Crea el archivo `API_TESTING_GUIDE.md` en la raíz de tu proyecto junto con los otros archivos de documentación:

```
hanoit-api/
├── README.md
├── AUTHENTICATION_ENDPOINTS.md
├── API_TESTING_GUIDE.md  ← Nuevo archivo
├── pom.xml
└── src/
```

Esta guía te proporcionará todo lo necesario para probar la API tanto con curl como con Postman, incluyendo todos los flujos de autenticación y gestión de usuarios que hemos implementado.

```shellscript
# URL base de la API
BASE_URL=http://localhost:8000

# Credenciales de prueba
TEST_USERNAME=usuario@ejemplo.com
TEST_PASSWORD=Password123
```

```shellscript
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}&password=${TEST_PASSWORD}&password-repeat=${TEST_PASSWORD}"
```

```json
{
  "message": "Usuario registrado exitosamente. Verifique su email para activar la cuenta."
}
```

```shellscript
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup/activate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DEL_EMAIL"
```

```json
{
  "message": "Cuenta activada exitosamente"
}
```

```shellscript
curl -X POST "${BASE_URL}/hanoit/api/v1/user/resend-verification" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}"
```

```json
{
  "message": "Email de verificación reenviado"
}
```

```shellscript
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'${TEST_USERNAME}'",
    "password": "'${TEST_PASSWORD}'"
  }'
```

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600
}
```

```shellscript
curl -X POST "${BASE_URL}/auth/login-legacy" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}&password=${TEST_PASSWORD}"
```

```shellscript
curl -X POST "${BASE_URL}/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&username=${TEST_USERNAME}&password=${TEST_PASSWORD}"
```

```shellscript
curl -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN_AQUI"
  }'
```

```shellscript
curl -X POST "${BASE_URL}/auth/refresh-legacy?refresh_token=REFRESH_TOKEN_AQUI"
```

```shellscript
curl -X POST "${BASE_URL}/auth/refresh-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "refresh_token=REFRESH_TOKEN_AQUI"
```

```shellscript
curl -X POST "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN_AQUI"
  }'
```

```shellscript
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"
```

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

```shellscript
curl -X PUT "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "+573001234567"
  }'
```

```shellscript
curl -X POST "${BASE_URL}/auth/change-password" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "Password123",
    "newPassword": "NuevaPassword456"
  }'
```

```json
{
  "message": "Contraseña cambiada exitosamente"
}
```

```shellscript
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}"
```

```json
{
  "message": "Email de recuperación enviado"
}
```

```shellscript
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword/reset" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DE_RECUPERACION&password=NuevaPassword456&password-repeat=NuevaPassword456"
```

```json
{
  "message": "Contraseña restablecida exitosamente"
}
```

```shellscript
curl -X GET "${BASE_URL}/hanoit/api/v1/user/users" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

```shellscript
curl -X GET "${BASE_URL}/hanoit/api/v1/user/users/123" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

```shellscript
curl -X GET "${BASE_URL}/hanoit/api/v1/user/users/username/${TEST_USERNAME}" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

```shellscript
curl -X PUT "${BASE_URL}/hanoit/api/v1/user/users/123" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "active": true
  }'
```

```shellscript
curl -X DELETE "${BASE_URL}/hanoit/api/v1/user/users/123" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

```json
{
  "message": "Usuario eliminado exitosamente"
}
```

```shellscript
curl -X PUT "${BASE_URL}/hanoit/api/v1/user/users/123/roles" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '["ROLE_ADMIN", "ROLE_BASIC"]'
```

```shellscript
curl -X POST "${BASE_URL}/hanoit/api/v1/user/loadRole" \
  -H "Authorization: Bearer ACCESS_TOKEN_ADMIN"
```

```shellscript
# 1. Registrar usuario
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}&password=${TEST_PASSWORD}&password-repeat=${TEST_PASSWORD}"

# 2. Activar cuenta (con token del email)
curl -X POST "${BASE_URL}/hanoit/api/v1/user/signup/activate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DEL_EMAIL"

# 3. Login
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "'${TEST_USERNAME}'", "password": "'${TEST_PASSWORD}'"}'

# 4. Obtener perfil
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"
```

```shellscript
# 1. Login
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "'${TEST_USERNAME}'", "password": "'${TEST_PASSWORD}'"}'

# 2. Usar API protegida
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI"

# 3. Refresh token (cuando expire)
curl -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "REFRESH_TOKEN_AQUI"}'

# 4. Logout
curl -X POST "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ACCESS_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "REFRESH_TOKEN_AQUI"}'
```

```shellscript
# 1. Solicitar recuperación
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${TEST_USERNAME}"

# 2. Restablecer contraseña
curl -X POST "${BASE_URL}/hanoit/api/v1/user/forgotPassword/reset" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=TOKEN_DE_RECUPERACION&password=NuevaPassword456&password-repeat=NuevaPassword456"

# 3. Login con nueva contraseña
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "'${TEST_USERNAME}'", "password": "NuevaPassword456"}'
```

```plaintext
Content-Type: application/json
```

```plaintext
Content-Type: application/x-www-form-urlencoded
```

```plaintext
Authorization: Bearer {{access_token}}
```

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

```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.accessToken);
    
    console.log("Nuevo Access Token guardado");
}
```

```javascript
if (!pm.environment.get("access_token")) {
    console.warn("No hay access token configurado. Ejecuta el login primero.");
}
```

```shellscript
# Verificar que el token es válido
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -v
```

```shellscript
# Agregar -v para ver headers y detalles
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "test@example.com", "password": "password"}' \
  -v
```

---

## Migración a API v2 — Tabla Comparativa

Los endpoints legacy documentados arriba están siendo reemplazados por la nueva API multitenant (Fase 1).

| Funcionalidad | Endpoint Legacy | Endpoint v2 (Fase 1) | Notas |
|--------------|----------------|----------------------|-------|
| Registro | `POST /hanoit/api/v1/user/signup` | `POST /api/users` | v2 requiere TENANT_ADMIN, sin activación por email |
| Activar cuenta | `POST /hanoit/api/v1/user/signup/activate` | — | Eliminado en v2 |
| Login | `POST /auth/login` | `POST /api/auth/login` | v2 retorna JWT con tenantId + role |
| Refresh token | `POST /auth/refresh` | `POST /api/auth/refresh` | Mismo concepto, distinto contrato |
| Logout | `POST /auth/logout` | `POST /api/auth/logout` | v2 revoca refresh token |
| Token info | `GET /auth/token-info` | — | Claims disponibles en JWT (sin endpoint) |
| Perfil | `GET /auth/me` | — | Info del usuario via JWT claims |
| Cambiar password | `PATCH /auth/change-password` | `PUT /api/users/{id}` | v2 via update de usuario |
| Listar usuarios | `GET /hanoit/api/v1/user/users` | `GET /api/users?page=0&size=20` | v2 paginado con scope de tenant |
| Crear usuario | `POST /hanoit/api/v1/user/signup` | `POST /api/users` | v2 con role y tenantId |
| Multi-tenant | No soportado | Sí (tenantId en JWT) | Cambio arquitectónico |
| RBAC | ROLE_FREE/BASIC/PREMIUM | SUPER_ADMIN/TENANT_ADMIN/AGENT/DRIVER | 4 roles funcionales |

---

### Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-14 | Marcado como legacy, agregada tabla comparativa endpoints, redirección a docs v2 |
| 2024-06-01 | Versión original |