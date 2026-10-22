# auth-session Specification

## Purpose
Define el ciclo de vida de la sesión del usuario en el frontend (inicio, restauración, cierre, caducidad) y el control de acceso a las rutas por autenticación y por rol.

## Requirements

### Requirement: Inicio de sesión
La aplicación SHALL iniciar sesión con email y contraseña contra el gateway y SHALL dejar disponible al usuario actual con su rol y su `tenantId`.

#### Scenario: Credenciales correctas
- **WHEN** se inicia sesión con credenciales válidas
- **THEN** se guardan los tokens, el usuario actual queda disponible con `id`, `email`, `role` y `tenantId`, y la sesión se considera iniciada

#### Scenario: Credenciales incorrectas
- **WHEN** el gateway rechaza las credenciales
- **THEN** no se guarda ninguna sesión, el usuario actual sigue vacío y se devuelve el error con su mensaje genérico

#### Scenario: Contraseña fuera de la memoria
- **WHEN** termina el inicio de sesión, con éxito o sin él
- **THEN** la contraseña no queda guardada en ningún almacenamiento ni en el estado de la aplicación

### Requirement: Restauración de la sesión
La aplicación SHALL restaurar la sesión al arrancar cuando exista un token de refresco vigente.

#### Scenario: Recarga con sesión previa
- **WHEN** el usuario recarga la página y hay un token de refresco vigente
- **THEN** antes de resolver las rutas protegidas se renueva el acceso, se carga el perfil con `GET /auth/me` y el usuario actual queda disponible

#### Scenario: Sin sesión previa o refresco rechazado
- **WHEN** no hay token de refresco o el gateway lo rechaza
- **THEN** la aplicación arranca como usuario anónimo, se limpia el almacenamiento y no se muestra ningún error

#### Scenario: Servidor de renderizado
- **WHEN** la aplicación se renderiza en el servidor
- **THEN** el usuario se considera anónimo y no se intenta restaurar la sesión

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

### Requirement: Rutas protegidas por autenticación
La aplicación SHALL impedir el acceso a las rutas protegidas sin sesión y recordar a dónde iba el usuario.

#### Scenario: Acceso sin sesión
- **WHEN** un usuario anónimo abre `/journeys`
- **THEN** es redirigido a `/acceso?returnUrl=%2Fjourneys`

#### Scenario: Acceso con sesión
- **WHEN** un usuario con sesión abre una ruta protegida
- **THEN** la ruta se muestra

#### Scenario: Ruta de acceso para usuarios con sesión
- **WHEN** un usuario con sesión abre `/acceso`
- **THEN** es redirigido a la página de inicio

### Requirement: Rutas restringidas por rol
La aplicación SHALL limitar rutas a los roles que se indiquen y SHALL mostrar un aviso de falta de permiso al resto.

#### Scenario: Rol permitido
- **WHEN** un usuario con rol `tenant_admin` abre una ruta restringida a `tenant_admin` y `super_admin`
- **THEN** la ruta se muestra

#### Scenario: Rol no permitido
- **WHEN** un usuario con rol `driver` abre esa misma ruta
- **THEN** es llevado a `/sin-permiso` y no se carga el contenido de la ruta

#### Scenario: Sin mutación entre sesiones
- **WHEN** se cierra una sesión y se inicia otra con distinto rol
- **THEN** los guards usan el rol de la sesión nueva

### Requirement: Sesión caducada durante el uso
La aplicación SHALL llevar al usuario a iniciar sesión de nuevo cuando no pueda renovar el acceso, sin perder la ruta de origen.

#### Scenario: Caducidad
- **WHEN** el refresco de sesión falla mientras el usuario navega por `/places`
- **THEN** se limpia la sesión, se muestra el mensaje "Tu sesión ha caducado" y se redirige a `/acceso?returnUrl=%2Fplaces`

### Requirement: Tenant del usuario en las peticiones que lo exigen
La aplicación SHALL aportar el `tenantId` del usuario actual en las peticiones del gateway que lo requieran como parámetro.

#### Scenario: Zonas
- **WHEN** se lista `zones` con un usuario de `tenantId` `T1`
- **THEN** la petición lleva `tenantId=T1`

#### Scenario: Sin usuario
- **WHEN** se pide un recurso que exige `tenantId` sin usuario actual
- **THEN** la petición no se envía y se devuelve un error genérico de sesión no válida

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
