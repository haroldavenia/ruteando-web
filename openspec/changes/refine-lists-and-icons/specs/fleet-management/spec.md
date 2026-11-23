# Spec Delta

## ADDED Requirements

### Requirement: Vehículos como tarjetas
El listado de vehículos SHALL mostrarse por defecto como una tarjeta por vehículo (nombre, tipo, matrícula, y el conductor con sus iniciales o «Sin conductor» con el botón «Asignar»), con un alternador tarjetas/tabla que se recuerda, y cada tarjeta SHALL conservar las acciones de la tabla (editar, retirar y cambiar conductor, eliminar) con los mismos nombres accesibles.

#### Scenario: Con conductor
- **WHEN** un vehículo tiene conductor asignado
- **THEN** su tarjeta muestra las iniciales, el nombre y el correo del conductor y ofrece retirarlo y cambiarlo

#### Scenario: Sin conductor
- **WHEN** un vehículo no tiene conductor
- **THEN** su tarjeta dice «Sin conductor» y ofrece «Asignar»

#### Scenario: Tabla
- **WHEN** se elige la vista de tabla
- **THEN** se ve la tabla de siempre con sus acciones de fila y la elección se recuerda
