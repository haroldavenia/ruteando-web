# Spec Delta

## MODIFIED Requirements

### Requirement: Cambio de estado
La aplicación SHALL permitir cambiar el estado de un paquete a cualquier otro valor activo de `PackageStatus` y SHALL pedir confirmación antes de cancelarlo.

#### Scenario: Cambiar el estado
- **WHEN** el usuario elige "Atendido" en la acción de estado de un paquete pendiente
- **THEN** se pide el cambio al gateway, la fila muestra "Atendido" y se avisa del resultado

#### Scenario: Estados ofrecidos
- **WHEN** abre la acción de estado
- **THEN** se ofrecen los valores activos de `PackageStatus` menos el actual, con su etiqueta en español, y ninguno inactivo

#### Scenario: Paquete con un estado inactivo
- **WHEN** un paquete tiene un estado que el gateway marca como inactivo, como «Devuelto»
- **THEN** su fila sigue mostrando ese estado con su etiqueta, y la acción de estado ofrece solo los valores activos

#### Scenario: Cancelar un paquete
- **WHEN** elige "Cancelado"
- **THEN** se pide confirmación y solo se cambia el estado si confirma

#### Scenario: Error al cambiar
- **WHEN** el gateway rechaza el cambio
- **THEN** se muestra el mensaje del error y la fila conserva su estado
