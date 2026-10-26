# frontend-serving Specification

## Purpose
Define cómo el servidor Express del repositorio publica la aplicación Angular compilada de `ng-ruteando`, de modo que las rutas del cliente funcionen al recargar y que las rutas que no son del cliente (`/api/*`, `/auth/*`) no devuelvan la página de la aplicación.

## Requirements

### Requirement: Publicación de la aplicación compilada
El servidor SHALL publicar la salida de navegador compilada de `ng-ruteando` como contenido estático.

#### Scenario: Página principal
- **WHEN** se ejecuta `npm start` en la raíz tras compilar el frontend y se pide `GET /`
- **THEN** la respuesta es 200 y contiene el HTML de la aplicación `ng-ruteando`

#### Scenario: Recurso estático
- **WHEN** se pide un fichero compilado existente, como un `.js` o `.css` de la aplicación
- **THEN** la respuesta es 200 con el tipo de contenido correspondiente

### Requirement: Rutas del cliente
El servidor SHALL responder con la página de la aplicación a cualquier ruta de navegación que no corresponda a un fichero ni a una ruta de API.

#### Scenario: Recarga en ruta profunda
- **WHEN** se pide `GET /rutas/listado` con cabecera `Accept: text/html`
- **THEN** la respuesta es 200 con el HTML de la aplicación y el router del cliente resuelve la ruta

#### Scenario: Fichero inexistente
- **WHEN** se pide una ruta con extensión de fichero que no existe, como `/inexistente.js`
- **THEN** la respuesta es 404 y no el HTML de la aplicación

### Requirement: Compilación ausente
El servidor SHALL indicar con claridad que falta la compilación del frontend en lugar de fallar de forma opaca.

#### Scenario: Directorio de compilación inexistente
- **WHEN** se ejecuta `npm start` sin haber compilado el frontend y se pide `GET /`
- **THEN** el servidor arranca, escribe en el log el comando necesario para compilar y responde 503 con un mensaje que lo indica

### Requirement: Un solo frontend publicado
El repositorio SHALL contener un único proyecto Angular publicable.

#### Scenario: Proyecto anterior eliminado
- **WHEN** se inspecciona el repositorio
- **THEN** no existe el directorio `ruteando-ng/` y ningún fichero versionado de código o configuración lo referencia como destino de compilación

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
