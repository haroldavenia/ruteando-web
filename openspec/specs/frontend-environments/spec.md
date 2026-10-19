# frontend-environments Specification

## Purpose
Define cómo la aplicación obtiene su configuración dependiente del entorno, en particular la URL de la API, y cómo se evita CORS en desarrollo, sin secretos ni URLs fijas en el código.

## Requirements

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

### Requirement: Sin URLs literales en el código
El código de `src/app/` SHALL NOT contener URLs absolutas de la API escritas a mano.

#### Scenario: Búsqueda de URLs fijas
- **WHEN** se ejecuta `grep -rnE "https?://" ng-ruteando/src/app --include=*.ts` excluyendo los ficheros de prueba
- **THEN** no aparece ninguna URL de la API

### Requirement: Proxy de desarrollo
El servidor de desarrollo SHALL reenviar las peticiones de `/gateway` hacia el gateway con la clave de API tomada del entorno, de modo que el navegador no haga peticiones de otro origen.

#### Scenario: Petición de API en desarrollo
- **WHEN** el navegador, abierto en `ng serve`, hace una petición a `/gateway/...`
- **THEN** el servidor de desarrollo la reenvía al destino configurado con `X-Api-Key` y la respuesta llega sin error de CORS

#### Scenario: Destino configurable
- **WHEN** se cambia `GATEWAY_URL` y se reinicia `ng serve`
- **THEN** las peticiones se reenvían al nuevo destino sin tocar el código de la aplicación

### Requirement: Sin secretos en el frontend
Los ficheros de entorno y el código de la aplicación SHALL NOT contener secretos de cliente, contraseñas ni credenciales codificadas.

#### Scenario: Búsqueda de credenciales
- **WHEN** se buscan en `ng-ruteando/src` las cadenas `secret`, `Basic ` y `client_secret`
- **THEN** no aparece ninguna credencial real

### Requirement: Variables de entorno del servidor documentadas
El repositorio SHALL documentar las variables de entorno que necesita el proxy sin incluir valores reales.

#### Scenario: Plantilla de variables
- **WHEN** se abre `.env.example`
- **THEN** aparecen `GATEWAY_URL` y `GATEWAY_API_KEY` con valores de ejemplo no reales

#### Scenario: Fichero local ignorado
- **WHEN** se crea un fichero `.env` con valores reales
- **THEN** `git status` no lo muestra y `git check-ignore -v .env` lo reporta como ignorado
