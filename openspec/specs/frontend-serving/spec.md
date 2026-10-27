# frontend-serving Specification

## Purpose
Define cómo el servidor Express del repositorio publica la aplicación Angular compilada de `ng-ruteando`, de modo que las rutas del cliente funcionen al recargar y que las rutas de API del propio servidor sigan accesibles.

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

### Requirement: Las rutas de API tienen prioridad
Las rutas de API y de autenticación definidas en el servidor (`/api/*`, `/auth/*`) SHALL ser atendidas por sus manejadores y no por la página de la aplicación.

#### Scenario: GET de API autenticada
- **WHEN** se pide `GET /api/me` sin cabecera `Authorization`
- **THEN** la respuesta es 401 en JSON y no 200 con HTML

#### Scenario: POST de autenticación
- **WHEN** se envía `POST /auth/login`
- **THEN** lo atiende el manejador de login y no la página de la aplicación

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
