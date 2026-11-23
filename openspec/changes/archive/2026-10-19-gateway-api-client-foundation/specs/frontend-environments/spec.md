# Spec Delta

## MODIFIED Requirements

### Requirement: URL de la API por entorno
La aplicación SHALL leer la URL base de la API de la configuración del entorno, y esa URL SHALL ser la ruta del proxy del gateway (`/gateway`) en desarrollo y en producción, sin incluir el dominio del gateway.

#### Scenario: Valor de desarrollo
- **WHEN** se compila con la configuración de desarrollo
- **THEN** la URL base de la API es `/gateway`

#### Scenario: Valor de producción
- **WHEN** se compila con la configuración de producción
- **THEN** la URL base de la API es `/gateway`

#### Scenario: Sin dominio del gateway en el bundle
- **WHEN** se inspeccionan los ficheros de `ng-ruteando/dist`
- **THEN** no aparece el dominio del gateway ni su clave de API

### Requirement: Proxy de desarrollo
El servidor de desarrollo SHALL reenviar las peticiones de `/gateway` hacia el gateway con la clave de API tomada del entorno, de modo que el navegador no haga peticiones de otro origen.

#### Scenario: Petición de API en desarrollo
- **WHEN** el navegador, abierto en `ng serve`, hace una petición a `/gateway/...`
- **THEN** el servidor de desarrollo la reenvía al destino configurado con `X-Api-Key` y la respuesta llega sin error de CORS

#### Scenario: Destino configurable
- **WHEN** se cambia `GATEWAY_URL` y se reinicia `ng serve`
- **THEN** las peticiones se reenvían al nuevo destino sin tocar el código de la aplicación

## ADDED Requirements

### Requirement: Variables de entorno del servidor documentadas
El repositorio SHALL documentar las variables de entorno que necesita el proxy sin incluir valores reales.

#### Scenario: Plantilla de variables
- **WHEN** se abre `.env.example`
- **THEN** aparecen `GATEWAY_URL` y `GATEWAY_API_KEY` con valores de ejemplo no reales

#### Scenario: Fichero local ignorado
- **WHEN** se crea un fichero `.env` con valores reales
- **THEN** `git status` no lo muestra y `git check-ignore -v .env` lo reporta como ignorado
