# Spec Delta

## MODIFIED Requirements

### Requirement: Registro de cuenta
La aplicación SHALL poder crear una cuenta y un tenant con `POST /auth/register` sin iniciar sesión, e identificar el motivo de un rechazo por el código de error del gateway.

#### Scenario: Registro correcto
- **WHEN** se registra una cuenta con correo, contraseña, nombre, apellidos y nombre de empresa
- **THEN** se envían esos cinco datos, se devuelve el usuario y el tenant creados y no se guardan tokens ni usuario actual

#### Scenario: Correo duplicado
- **WHEN** el gateway responde 409 porque el correo ya existe
- **THEN** el error lleva el mensaje "Ya existe una cuenta con ese correo"

#### Scenario: Contraseña que incumple la política
- **WHEN** el gateway responde 400 con el código `PASSWORD_POLICY_VIOLATION`
- **THEN** el error lleva el mensaje con la regla de la contraseña y no el genérico "Revisa los datos e inténtalo de nuevo"

#### Scenario: Otros datos no válidos
- **WHEN** el gateway responde 400 con otro código, como `VALIDATION_ERROR`
- **THEN** el error lleva el mensaje "Revisa los datos e inténtalo de nuevo"

### Requirement: Reenvío de verificación y recuperación de contraseña
La aplicación SHALL poder reenviar la verificación del correo, solicitar la recuperación de contraseña y restablecerla, sin iniciar sesión en ningún caso, y SHALL distinguir en el restablecimiento un token no válido de una contraseña rechazada.

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
- **WHEN** el gateway rechaza el token de restablecimiento, con el código `INVALID_TOKEN` o con los estados 401, 404 o 410
- **THEN** el error lleva el mensaje "El enlace no es válido o ha caducado"

#### Scenario: Contraseña de restablecimiento que incumple la política
- **WHEN** el gateway responde 400 con el código `PASSWORD_POLICY_VIOLATION`
- **THEN** el error lleva el mensaje con la regla de la contraseña y no el de enlace no válido

#### Scenario: Otros datos no válidos al restablecer
- **WHEN** el gateway responde 400 con el código `VALIDATION_ERROR`
- **THEN** el error lleva el mensaje "Revisa los datos e inténtalo de nuevo" y no el de enlace no válido
