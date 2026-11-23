# Spec Delta

## ADDED Requirements

### Requirement: Rutas de API y autenticación desconocidas
El servidor SHALL responder 404 en JSON a cualquier petición bajo `/api/*` o `/auth/*` y nunca con la página de la aplicación, porque esas rutas no son del cliente.

#### Scenario: GET a una ruta de API
- **WHEN** se pide `GET /api/me` con cabecera `Accept: text/html`
- **THEN** la respuesta es 404 con un cuerpo JSON de mensaje y no el HTML de la aplicación

#### Scenario: POST de autenticación
- **WHEN** se envía `POST /auth/login`
- **THEN** la respuesta es 404 con un cuerpo JSON de mensaje, sin esperar a ninguna base de datos

#### Scenario: Sin base de datos
- **WHEN** se ejecuta `npm start` sin MongoDB ni `MONGO_URI`
- **THEN** el servidor arranca sin errores de conexión en el registro

### Requirement: Repositorio sin la aplicación anterior
El repositorio SHALL contener un único frontend, `ng-ruteando`, y ningún código, dependencia ni configuración de la aplicación AngularJS ni del backend de ejemplo de Satellizer.

#### Scenario: Directorios retirados
- **WHEN** se inspecciona la raíz del repositorio
- **THEN** no existen `master/`, `externModules/`, `json/`, `build/` ni un `index.html` en la raíz

#### Scenario: Sin credenciales incrustadas
- **WHEN** se buscan claves de API o secretos en los ficheros versionados
- **THEN** no hay ninguna clave de Google Maps ni valores por defecto de secretos OAuth, y el servidor solo lee `GATEWAY_URL`, `GATEWAY_API_KEY`, `GATEWAY_TIMEOUT_MS`, `PORT` y `WEB_DIST`

#### Scenario: Dependencias del servidor
- **WHEN** se lee el `package.json` de la raíz
- **THEN** no declara `mongoose`, `jwt-simple`, `bcryptjs`, `request`, `multer`, `faker`, `karma` ni `protractor`

## REMOVED Requirements

### Requirement: Las rutas de API tienen prioridad
**Reason**: Las rutas propias `/api/*` y `/auth/*` eran el backend de ejemplo de Satellizer; el frontend usa el gateway por `/gateway` y ninguna pantalla las llama.
**Migration**: La autenticación y los datos se piden a `/gateway/**`; las rutas `/api/*` y `/auth/*` responden 404 en JSON (ver «Rutas de API y autenticación desconocidas»).
