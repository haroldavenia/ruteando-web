## ADDED Requirements

### Requirement: Rutas propias antes del reenvío
El servidor y el servidor de desarrollo (`ng serve`) SHALL atender `POST /gateway/auth/login` y todas las rutas `/gateway/mfa/**` con el módulo de segundo factor antes de reenviar el resto de `/gateway/**` al gateway, y SHALL conservar para esas rutas la clave de API en el servidor.

#### Scenario: Orden de las rutas
- **WHEN** llega `POST /gateway/auth/login`
- **THEN** lo atiende el módulo de segundo factor, que habla con el gateway desde el servidor, y no el reenvío directo

#### Scenario: Otras rutas del gateway
- **WHEN** llega cualquier otra ruta bajo `/gateway/**`
- **THEN** se reenvía como hasta ahora, con la misma clave de API añadida por el servidor

#### Scenario: Módulo desactivado
- **WHEN** no hay clave de cifrado del segundo factor
- **THEN** `POST /gateway/auth/login` se reenvía sin intervención y `/gateway/mfa/**` responde `503`

#### Scenario: Ruta `/gateway/mfa` no es del cliente
- **WHEN** se pide una ruta `/gateway/mfa/**` inexistente
- **THEN** la respuesta es siempre JSON (`404`, o `401` si no hay sesión) y nunca la página de la aplicación
