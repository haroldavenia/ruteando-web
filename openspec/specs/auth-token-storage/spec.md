# auth-token-storage Specification

## Purpose
Define cómo la aplicación conserva los tokens de sesión: el de acceso solo en memoria, el de refresco en el almacenamiento del navegador con su caducidad, y sin acceder al navegador cuando se renderiza en el servidor.

## Requirements

### Requirement: Token de acceso en memoria
La aplicación SHALL conservar el token de acceso únicamente en memoria y SHALL NOT escribirlo en ningún almacenamiento persistente.

#### Scenario: Guardar sesión
- **WHEN** se guarda una sesión con `access_token`, `refresh_token` y `expires_in`
- **THEN** el token de acceso se puede leer mientras la aplicación siga abierta y no aparece en `localStorage` ni en `sessionStorage`

#### Scenario: Recarga de la página
- **WHEN** el usuario recarga la página tras guardar una sesión
- **THEN** el token de acceso ya no está disponible y el de refresco sigue disponible

### Requirement: Token de refresco persistente con caducidad
La aplicación SHALL persistir el token de refresco y su fecha de caducidad en `localStorage`, y SHALL descartarlo cuando haya caducado.

#### Scenario: Caducidad calculada desde el momento actual
- **WHEN** se guarda una sesión con `expires_in` de 3600 segundos a las 10:00:30
- **THEN** la caducidad guardada es las 11:00:30 del mismo día

#### Scenario: Token vigente
- **WHEN** se pide el token de refresco antes de su caducidad
- **THEN** se devuelve el valor guardado

#### Scenario: Token caducado
- **WHEN** se pide el token de refresco después de su caducidad
- **THEN** se devuelve nulo y se borran el token y la caducidad guardados

#### Scenario: Sesión previa del AngularJS
- **WHEN** `localStorage` contiene las claves `hanoitToken` y `hanoitTokenExpiresDate` escritas por la aplicación anterior, con la fecha en el formato que esta usaba
- **THEN** el token de refresco se lee y su caducidad se interpreta correctamente

### Requirement: Cierre de sesión
La aplicación SHALL poder borrar toda la sesión de una vez.

#### Scenario: Reiniciar sesión
- **WHEN** se reinicia la sesión
- **THEN** el token de acceso queda vacío y desaparecen del almacenamiento el token de refresco y su caducidad

### Requirement: Seguro en renderizado de servidor
El servicio de tokens SHALL NOT acceder a APIs del navegador cuando se ejecuta en el servidor.

#### Scenario: Lectura en el servidor
- **WHEN** el servicio se usa durante el render SSR
- **THEN** no lanza ninguna excepción y devuelve que no hay sesión

#### Scenario: Escritura en el servidor
- **WHEN** se intenta guardar una sesión durante el render SSR
- **THEN** no lanza ninguna excepción y no persiste nada

### Requirement: Caducidad del acceso consultable
La aplicación SHALL exponer el instante de caducidad del token de acceso para que otras partes decidan si renovarlo.

#### Scenario: Instante de caducidad
- **WHEN** se guarda una sesión con `expires_in` de 3599 segundos a las 10:00:00
- **THEN** la caducidad consultable es las 10:59:59 del mismo día

#### Scenario: Sin sesión
- **WHEN** no hay sesión guardada
- **THEN** la caducidad consultable es nula

#### Scenario: Tras reiniciar la sesión
- **WHEN** se reinicia la sesión
- **THEN** la caducidad consultable pasa a ser nula

### Requirement: Sesión sustituida al refrescar
La aplicación SHALL reemplazar completamente tokens y caducidad cuando el refresco devuelve una sesión nueva.

#### Scenario: Refresco con rotación
- **WHEN** se guarda la sesión recibida de `POST /auth/refresh`, con un token de refresco distinto
- **THEN** el token de refresco anterior deja de estar disponible y se usa el nuevo
