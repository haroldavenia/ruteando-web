# route-visits Specification

## Purpose
Permite seguir las visitas de una ruta: ver qué paradas con paquete están pendientes, atendidas o canceladas y cambiar su estado desde la propia ruta.

## Requirements

### Requirement: Visitas de la ruta
La tabla de paradas SHALL mostrar como visitas las paradas que tienen paquete, con su nombre o dirección y el estado actual del paquete en español.

#### Scenario: Listar visitas
- **WHEN** abre una ruta con paradas con paquete
- **THEN** cada una muestra orden, tipo, nombre o dirección del paquete, llegada, salida y estado

#### Scenario: Paradas sin paquete
- **WHEN** una parada no tiene paquete, como un depósito
- **THEN** se muestra sin estado y sin acción de cambio

#### Scenario: Paquete que no se puede leer
- **WHEN** el gateway no devuelve el paquete de una parada
- **THEN** la parada se muestra con el estado "No disponible" y el resto de la ruta sigue funcionando

### Requirement: Avance de la ruta
El detalle SHALL mostrar cuántas visitas están atendidas sobre el total y SHALL actualizarlo al cambiar un estado.

#### Scenario: Resumen de avance
- **WHEN** abre una ruta con 10 visitas y 4 atendidas
- **THEN** ve "4 de 10 visitas atendidas" en un texto accesible, no solo como barra

#### Scenario: Actualización
- **WHEN** cambia una visita a "Atendido"
- **THEN** el avance se recalcula sin recargar la página

### Requirement: Filtro de visitas
La aplicación SHALL permitir filtrar las visitas por estado y por texto.

#### Scenario: Por estado
- **WHEN** elige un estado en el filtro
- **THEN** solo se muestran las visitas con ese estado y se indica cuántas hay

#### Scenario: Por texto
- **WHEN** escribe parte del nombre o de la dirección de un paquete
- **THEN** solo se muestran las visitas que coinciden, sin distinguir mayúsculas ni acentos

#### Scenario: Sin coincidencias
- **WHEN** ningún filtro da resultados
- **THEN** se muestra un mensaje y una acción para limpiar los filtros

### Requirement: Cambio de estado de una visita
La aplicación SHALL permitir cambiar el estado del paquete de una visita a otro valor de `PackageStatus` y SHALL pedir confirmación antes de cancelarlo.

#### Scenario: Cambiar el estado
- **WHEN** elige "Atendido" en la acción de una visita pendiente
- **THEN** se pide el cambio al gateway, la fila muestra "Atendido" y se avisa del resultado

#### Scenario: Estados ofrecidos
- **WHEN** abre la acción de estado
- **THEN** se ofrecen los valores de `PackageStatus` menos el actual, con su etiqueta en español

#### Scenario: Cancelar
- **WHEN** elige "Cancelado"
- **THEN** se pide confirmación y solo se cambia el estado si confirma

#### Scenario: Error al cambiar
- **WHEN** el gateway rechaza el cambio
- **THEN** se muestra el mensaje del error y la fila conserva su estado

#### Scenario: Cambios repetidos
- **WHEN** hay un cambio en curso para una visita
- **THEN** su acción queda deshabilitada hasta que termine, sin bloquear las demás
