# Proposal

## Why

`ng-ruteando` ya tiene la infraestructura de sesión (`AuthService`, `CurrentUser`, guards, interceptores, renovación de sesión), pero **no hay ninguna pantalla para usarla**: `/acceso` es un título provisional, no existe el registro ni la recuperación de contraseña, y la página de inicio es pública porque no hay forma de iniciar sesión. Sin estas pantallas no se puede probar ninguna feature de negocio de las fases siguientes ni proteger el área privada. Además, la revisión del código ya hecho contra el ejemplo real del gateway detectó que `AuthService.logout` envía el cuerpo vacío, mientras que `POST /auth/logout` documenta `{ refreshToken }`: el cierre de sesión no revoca el token en el servidor y, como los errores del cierre se ignoran a propósito, el fallo pasa desapercibido.

## What Changes

- Crear las pantallas de acceso, fuera del layout con menú lateral, sobre el `AuthService` existente: **iniciar sesión**, **crear cuenta** (con panel de "revisa tu correo" y reenvío), **verificar correo** (a partir del enlace con `token`), **recuperar contraseña** y **restablecer contraseña**.
- Añadir a `AuthService` las operaciones que faltan: `register`, `verifyEmail` (el gateway devuelve una sesión: inicia sesión al verificar), `resendVerification`, `forgotPassword` y `resetPassword`, con sus modelos tipados y pruebas contra los ejemplos reales.
- **Corregir `AuthService.logout`** para enviar `{ refreshToken }` a `POST /auth/logout` (si no hay token de refresco, solo limpia el estado local).
- Mensajes de error propios de cada pantalla usando el mecanismo de mensajes personalizables ya existente (p. ej. 401 en el login es "Correo o contraseña incorrectos", no "Tu sesión ha caducado"; 409 al registrar un correo ya usado).
- Redirección segura tras iniciar sesión a `returnUrl`: solo rutas internas de la aplicación (nunca URLs externas ni `//host`).
- Reorganizar las rutas: `AppComponent` pasa a ser solo un `router-outlet`; el shell (barra y menú) se carga por ruta, de forma diferida, para el área privada protegida con `authGuard`; las pantallas de acceso usan un layout propio centrado. La **página de inicio deja de ser pública** y exige sesión.
- Añadir al shell un **menú de usuario** (nombre y correo, "Cerrar sesión") con diálogo de confirmación, como el `logout_confirmation` del legacy.
- Retirar los componentes provisionales `AccessPlaceholderComponent` y el aviso de "pantalla pendiente".
- Todas las pantallas se cargan de forma diferida: el bundle inicial no crece (hoy tiene ~9 kB de margen sobre el aviso de 500 kB).
- No se migra, y queda fuera de alcance: los botones de acceso social del legacy (Facebook, Google, LinkedIn: el gateway no los ofrece), el asistente `registerTwo` (no tiene ruta y pide datos que el registro del gateway no admite), la casilla "recordarme" (no hacía nada), las credenciales de prueba precargadas del login, aceptar invitaciones (`/invitations/accept/*`), cambiar contraseña y editar perfil, y el cambio de la política de contraseñas del gateway.
- **BREAKING**: `/` y el resto del área privada exigen sesión; un usuario anónimo que abra `/` es llevado a `/acceso?returnUrl=%2F`.

## Capabilities

### New Capabilities
- `access-screens`: el usuario puede iniciar sesión, crear una cuenta, verificar su correo y recuperar o restablecer su contraseña desde pantallas propias, con validación, mensajes en español y accesibilidad.

### Modified Capabilities
- `auth-session`: el cierre de sesión envía el token de refresco al gateway, y la sesión incorpora registro de cuenta, verificación de correo con inicio de sesión, reenvío de la verificación y recuperación y restablecimiento de contraseña.
- `frontend-app-shell`: la página de inicio solo se muestra con sesión iniciada; sin ella se redirige al acceso.
- `ui-material-theme`: el layout con barra y menú lateral pertenece solo al área autenticada, las pantallas de acceso tienen su propio layout, y el shell incluye un menú de usuario con cierre de sesión confirmado.

## Impact

- Código nuevo: `ng-ruteando/src/app/features/access/**` (layout, login, registro, verificación, recuperación, restablecimiento, utilidades de formulario y de redirección), menú de usuario en `layout/`.
- Modificado: `app.component.ts`, `app.routes.ts`, `layout/shell.component.*`, `core/auth/auth.service.ts` y su modelo, pruebas existentes de `app`, `shell` y `auth`.
- Eliminado: `features/access/access-placeholder.component.ts` (y su uso en las rutas).
- Dependencias: ninguna nueva (`@angular/forms` y los módulos de Angular Material de formulario, tarjeta, menú y diálogo ya están instalados).
- Requiere: `gateway-api-client-foundation` archivado (ya lo está).
- Riesgos: el margen del bundle inicial es de ~9 kB (obliga a carga diferida y a revisar el prerender, que hoy generaría `/` y tras la guarda redirigiría); el prerender de `/` pasa por la guarda; el enlace del correo de verificación y de restablecimiento lo define el backend y debe apuntar a las rutas de esta aplicación (pregunta abierta en `design.md`); la política de contraseñas del gateway no está documentada.
- Sin impacto en `server/` ni en `master/`.
