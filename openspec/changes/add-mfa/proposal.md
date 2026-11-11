## Why

El inicio de sesión depende solo de la contraseña: el gateway entrega los tokens en `POST /auth/login` sin pedir un segundo factor, y su OTP (`/notifications/otp/*`) es un servicio aparte que no bloquea nada. Hace falta un segundo factor **que se imponga en el servidor** (si viviera solo en el frontend, se saltaría llamando directo a `/gateway/auth/login`), con tres métodos que cada empresa pueda activar y cada persona elegir: código por correo, código por SMS (Twilio) y aplicación autenticadora (TOTP, Google Authenticator).

## What Changes

- El servidor Express deja de ser un reenviador puro en el login: intercepta `POST /gateway/auth/login`, valida la contraseña con el gateway, **retiene los tokens** y, si la persona (o la política de su empresa) exige segundo factor, responde un reto (`mfaRequired`) en lugar de la sesión. Los tokens solo se entregan tras verificar el código.
- Tres métodos, cada uno activable por empresa y por persona: **OTP por correo** (SMTP propio; en local, Mailpit del Docker), **OTP por SMS** (Twilio Verify desde nuestro servidor; en local, un proveedor de desarrollo que no envía SMS reales) y **TOTP** (RFC 6238, con QR y clave manual).
- **Códigos de recuperación** (10, de un solo uso) para no dejar a nadie fuera si pierde el teléfono; el administrador puede además restablecer el 2FA de una persona de su empresa.
- Módulo **Seguridad** (`/seguridad`), solo `tenant_admin` y `super_admin`: activar o desactivar cada método para la empresa y exigir el 2FA (a todos o por rol).
- Página **Perfil** (`/perfil`), para cualquier persona con sesión: activar o desactivar sus métodos, enlazar el teléfono, escanear el QR y regenerar los códigos de recuperación.
- Segundo paso en la pantalla de acceso: elegir método, escribir el código, reenviar y usar un código de recuperación.
- Persistencia propia con `node:sqlite` (no hay base de datos hoy) y secretos cifrados con una clave del servidor (`MFA_SECRET_KEY`).
- Docker de desarrollo: servicio **Mailpit** (bandeja de correo local, UI en :8025) y variables SMTP/SMS en `compose.yaml` y `.env.example`.
- **BREAKING (entorno)**: el servidor pasa a exigir Node `^22.13 || >=24` (por `node:sqlite` sin indicador); hoy admite 20.19.
- Nueva dependencia del servidor: `nodemailer` (Node no trae cliente SMTP). Dependencia diferida del frontend: `qrcode` (solo en el trozo de `/perfil`).

No se toca: el OTP del gateway (no se usa; ver `design.md`), el flujo de contraseña olvidada ni el registro.

## Capabilities

### New Capabilities
- `two-factor-authentication`: reto de segundo factor en el login impuesto por el servidor, los tres métodos, códigos de recuperación, política por empresa, límites de intentos y almacenamiento de secretos.
- `security-settings`: pantalla de Seguridad para administradores y página de Perfil para cada persona, con el alta y baja de métodos.

### Modified Capabilities
- `auth-session`: el inicio de sesión admite un segundo paso (la sesión no se crea hasta verificarlo).
- `gateway-proxy`: el servidor y el proxy de `ng serve` interceptan el login y atienden `/gateway/mfa/**` antes de reenviar el resto a `/gateway/**`.

## Impact

- **Servidor** (`server/`): módulo nuevo `server/mfa/` (router, almacén SQLite, proveedores de correo y SMS, TOTP, límites), cambios en `server.js`, `gateway-proxy.js` y `ng-ruteando/proxy.conf.js`; `.gitignore` (`data/`), `.env.example`.
- **Frontend** (`ng-ruteando/src/app/`): `core/auth/` (login en dos pasos), `features/access/login/` (segundo paso), `features/security/` y `features/profile/` nuevos (rutas diferidas), menú, traducciones en/es/pt, iconos.
- **Docker y CI**: servicio `mailpit` en `compose.yaml`; pruebas del servidor; auditoría de dependencias (`nodemailer`).
- **Operación**: el almacén SQLite necesita un **volumen persistente** en producción (si el contenedor es efímero, se pierden los factores) y el servidor debe ser **una sola instancia** (los retos viven en memoria). Credenciales de Twilio (Account SID, Auth Token, Verify Service SID) y SMTP solo en `.env`, nunca en git.
- **Sin verificar contra el gateway real**: que `GET /auth/me` y el listado de usuarios sirvan para validar sesión, rol y empresa desde el servidor (hoy solo probado con el simulado).
