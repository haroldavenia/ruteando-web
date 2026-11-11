## MODIFIED Requirements

### Requirement: Inicio de sesión
La aplicación SHALL iniciar sesión con email y contraseña contra el gateway y SHALL dejar disponible al usuario actual con su rol y su `tenantId`. Cuando el servidor exige un segundo factor, la sesión SHALL NOT crearse hasta superarlo.

#### Scenario: Credenciales correctas
- **WHEN** se inicia sesión con credenciales válidas y no se exige segundo factor
- **THEN** se guardan los tokens, el usuario actual queda disponible con `id`, `email`, `role` y `tenantId`, y la sesión se considera iniciada

#### Scenario: Credenciales incorrectas
- **WHEN** el gateway rechaza las credenciales
- **THEN** no se guarda ninguna sesión, el usuario actual sigue vacío y se devuelve el error con su mensaje genérico

#### Scenario: Contraseña fuera de la memoria
- **WHEN** termina el inicio de sesión, con éxito o sin él
- **THEN** la contraseña no queda guardada en ningún almacenamiento ni en el estado de la aplicación

#### Scenario: Segundo factor exigido
- **WHEN** las credenciales son válidas y el servidor responde con un reto de segundo factor
- **THEN** no se guarda ningún token ni usuario, el estado de la aplicación sigue anónimo y solo se conserva el identificador del reto hasta completarlo o abandonarlo

#### Scenario: Segundo factor superado
- **WHEN** se verifica el reto con un código válido
- **THEN** se guardan los tokens y el usuario actual queda disponible igual que con credenciales correctas sin segundo factor
