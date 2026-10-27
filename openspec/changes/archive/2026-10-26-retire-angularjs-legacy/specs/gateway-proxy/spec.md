# Spec Delta

## ADDED Requirements

### Requirement: Ruta única del proxy
La ruta `/gateway/**` SHALL ser atendida por el proxy antes que por los analizadores de cuerpo, el contenido estático y la página de la aplicación, y SHALL ser la única ruta de API que atiende el servidor.

#### Scenario: Recurso inexistente del gateway
- **WHEN** el gateway responde 404 a `GET /gateway/recurso-que-no-existe`
- **THEN** el navegador recibe ese 404 y no el HTML de la aplicación

#### Scenario: Rutas propias retiradas
- **WHEN** se piden `GET /api/me` o `POST /auth/login`
- **THEN** el servidor responde 404 en JSON y no las reenvía al gateway

## REMOVED Requirements

### Requirement: Precedencia de la ruta del proxy
**Reason**: Su escenario «Rutas propias intactas» exigía que `/api/*` y `/auth/*` los atendieran manejadores del servidor, que se retiran con el backend de ejemplo.
**Migration**: Ver «Ruta única del proxy», que conserva la precedencia del proxy y el escenario del recurso inexistente.
