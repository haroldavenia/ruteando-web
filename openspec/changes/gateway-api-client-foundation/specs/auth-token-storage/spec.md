# Spec Delta

## ADDED Requirements

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
