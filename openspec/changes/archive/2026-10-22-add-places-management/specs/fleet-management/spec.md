# Spec Delta

## ADDED Requirements

### Requirement: Enlace a lugares desde el formulario de vehículo
Cuando no exista ningún lugar que elegir como depósito, el formulario de vehículo SHALL explicarlo y SHALL enlazar a la creación de lugares.

#### Scenario: Sin lugares
- **WHEN** el administrador abre el formulario de un vehículo y el tenant no tiene lugares
- **THEN** se muestra "Todavía no hay lugares que usar como depósito" con un enlace a `/lugares/nuevo`

#### Scenario: Con lugares
- **WHEN** el tenant tiene lugares
- **THEN** el depósito se elige entre ellos y no se muestra el enlace
