# Spec Delta

## MODIFIED Requirements

### Requirement: Filtro de visitas
La aplicación SHALL permitir filtrar las visitas por estado y por texto.

#### Scenario: Por estado
- **WHEN** elige un estado en el filtro
- **THEN** solo se muestran las visitas con ese estado y se indica cuántas hay

#### Scenario: Estado inactivo presente en la ruta
- **WHEN** algún paquete de la ruta tiene un estado inactivo, como «Devuelto»
- **THEN** ese estado aparece también en el filtro mientras haya visitas con él, aunque no se pueda elegir como destino de un cambio

#### Scenario: Por texto
- **WHEN** escribe parte del nombre o de la dirección de un paquete
- **THEN** solo se muestran las visitas que coinciden, sin distinguir mayúsculas ni acentos

#### Scenario: Sin coincidencias
- **WHEN** ningún filtro da resultados
- **THEN** se muestra un mensaje y una acción para limpiar los filtros

### Requirement: Cambio de estado de una visita
La aplicación SHALL permitir cambiar el estado del paquete de una visita a otro valor activo de `PackageStatus` y SHALL pedir confirmación antes de cancelarlo.

#### Scenario: Cambiar el estado
- **WHEN** elige "Atendido" en la acción de una visita pendiente
- **THEN** se pide el cambio al gateway, la fila muestra "Atendido" y se avisa del resultado

#### Scenario: Estados ofrecidos
- **WHEN** abre la acción de estado
- **THEN** se ofrecen los valores activos de `PackageStatus` menos el actual, con su etiqueta en español, y ninguno inactivo

#### Scenario: Cancelar
- **WHEN** elige "Cancelado"
- **THEN** se pide confirmación y solo se cambia el estado si confirma

#### Scenario: Error al cambiar
- **WHEN** el gateway rechaza el cambio
- **THEN** se muestra el mensaje del error y la fila conserva su estado

#### Scenario: Cambios repetidos
- **WHEN** hay un cambio en curso para una visita
- **THEN** su acción queda deshabilitada hasta que termine, sin bloquear las demás
