# frontend-environments Specification

## Purpose
Define cómo la aplicación obtiene su configuración dependiente del entorno, en particular la URL de la API, y cómo se evita CORS en desarrollo, sin secretos ni URLs fijas en el código.

## Requirements

### Requirement: URL de la API por entorno
La aplicación SHALL leer la URL base de la API de la configuración del entorno y SHALL usar valores distintos en desarrollo y en producción.

#### Scenario: Valor de desarrollo
- **WHEN** se compila con la configuración de desarrollo
- **THEN** la URL base de la API es la definida en el entorno de desarrollo

#### Scenario: Valor de producción
- **WHEN** se compila con la configuración de producción
- **THEN** la URL base de la API es la definida en el entorno de producción

### Requirement: Sin URLs literales en el código
El código de `src/app/` SHALL NOT contener URLs absolutas de la API escritas a mano.

#### Scenario: Búsqueda de URLs fijas
- **WHEN** se ejecuta `grep -rnE "https?://" ng-ruteando/src/app --include=*.ts` excluyendo los ficheros de prueba
- **THEN** no aparece ninguna URL de la API

### Requirement: Proxy de desarrollo
El servidor de desarrollo SHALL reenviar las peticiones a la API hacia el destino configurado, de modo que el navegador no haga peticiones de otro origen.

#### Scenario: Petición de API en desarrollo
- **WHEN** el navegador, abierto en `ng serve`, hace una petición a la ruta de la API
- **THEN** el servidor de desarrollo la reenvía al destino del proxy y la respuesta llega sin error de CORS

#### Scenario: Destino configurable
- **WHEN** se cambia el destino en la configuración del proxy y se reinicia `ng serve`
- **THEN** las peticiones se reenvían al nuevo destino sin tocar el código de la aplicación

### Requirement: Sin secretos en el frontend
Los ficheros de entorno y el código de la aplicación SHALL NOT contener secretos de cliente, contraseñas ni credenciales codificadas.

#### Scenario: Búsqueda de credenciales
- **WHEN** se buscan en `ng-ruteando/src` las cadenas `secret`, `Basic ` y `client_secret`
- **THEN** no aparece ninguna credencial real
