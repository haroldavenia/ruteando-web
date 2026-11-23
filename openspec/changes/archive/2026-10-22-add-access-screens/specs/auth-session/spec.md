# Spec Delta

## MODIFIED Requirements

### Requirement: Cierre de sesión
La aplicación SHALL cerrar la sesión notificándolo al gateway con el token de refresco y limpiando siempre el estado local.

#### Scenario: Cierre correcto
- **WHEN** el usuario cierra sesión
- **THEN** se llama a `POST /auth/logout` con el token de refresco en el cuerpo, se borran tokens y usuario actual, y se redirige a `/acceso`

#### Scenario: Fallo del gateway al cerrar
- **WHEN** `POST /auth/logout` falla
- **THEN** la sesión local se limpia igualmente y el usuario llega a `/acceso`

#### Scenario: Sin token de refresco
- **WHEN** el usuario cierra sesión y no hay token de refresco guardado
- **THEN** no se llama al gateway, la sesión local se limpia y el usuario llega a `/acceso`

## ADDED Requirements

### Requirement: Registro de cuenta
La aplicación SHALL poder crear una cuenta y un tenant con `POST /auth/register` sin iniciar sesión.

#### Scenario: Registro correcto
- **WHEN** se registra una cuenta con correo, contraseña, nombre, apellidos y nombre de empresa
- **THEN** se envían esos cinco datos, se devuelve el usuario y el tenant creados y no se guardan tokens ni usuario actual

#### Scenario: Correo duplicado
- **WHEN** el gateway responde 409 porque el correo ya existe
- **THEN** el error lleva el mensaje "Ya existe una cuenta con ese correo"

### Requirement: Verificación del correo con inicio de sesión
La aplicación SHALL verificar el correo con `POST /auth/verify-email` y, como el gateway devuelve una sesión, iniciar sesión igual que con el login.

#### Scenario: Token válido
- **WHEN** se verifica el correo con un token válido
- **THEN** se guardan los tokens, el usuario actual queda disponible con su rol y su `tenantId` y se programa la renovación de la sesión

#### Scenario: Token no válido
- **WHEN** el gateway rechaza el token
- **THEN** no se guarda ninguna sesión y el error lleva el mensaje "El enlace no es válido o ha caducado"

### Requirement: Reenvío de verificación y recuperación de contraseña
La aplicación SHALL poder reenviar la verificación del correo, solicitar la recuperación de contraseña y restablecerla, sin iniciar sesión en ningún caso.

#### Scenario: Reenvío de la verificación
- **WHEN** se solicita el reenvío para un correo
- **THEN** se llama a `POST /auth/resend-verification` con `{ email }`

#### Scenario: Solicitud de recuperación
- **WHEN** se solicita la recuperación para un correo
- **THEN** se llama a `POST /auth/forgot-password` con `{ email }`

#### Scenario: Restablecimiento
- **WHEN** se restablece la contraseña con un token y una contraseña nueva
- **THEN** se llama a `POST /auth/reset-password` con `{ token, newPassword }` y no se guarda ninguna sesión

#### Scenario: Token de restablecimiento no válido
- **WHEN** el gateway rechaza el token de restablecimiento
- **THEN** el error lleva el mensaje "El enlace no es válido o ha caducado"

### Requirement: Mensaje propio del inicio de sesión rechazado
La aplicación SHALL distinguir un inicio de sesión rechazado de una sesión caducada.

#### Scenario: Credenciales incorrectas
- **WHEN** el gateway responde 401 a `POST /auth/login`
- **THEN** el error lleva el mensaje "Correo o contraseña incorrectos" y no el de sesión caducada

#### Scenario: Otros fallos del login
- **WHEN** `POST /auth/login` falla por falta de conexión o con un error del servidor
- **THEN** el error lleva el mensaje genérico del estado correspondiente

