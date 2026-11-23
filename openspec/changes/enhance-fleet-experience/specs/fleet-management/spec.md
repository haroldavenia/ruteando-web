## ADDED Requirements

### Requirement: Chips de los listados de flota
Los listados de tipos, vehículos y conductores SHALL ofrecer chips de filtro con su recuento, calculados sobre todos los registros del tenant.

#### Scenario: Chips de vehículos
- **WHEN** abre `/flota/vehiculos`
- **THEN** puede filtrar por «Con conductor», «Sin conductor» e «Inactivos», cada chip con su recuento

#### Scenario: Chips de conductores
- **WHEN** abre `/flota/conductores`
- **THEN** puede filtrar por «Activos», «Inactivos» y «Sin vehículo», cada chip con su recuento

#### Scenario: Chips de tipos
- **WHEN** abre `/flota/tipos`
- **THEN** puede filtrar por categoría y por «Sin capacidad», cada chip con su recuento

### Requirement: Columnas de relación entre vehículos, tipos, conductores y lugares
Los listados SHALL mostrar los datos relacionados que la persona necesita para entender la flota sin abrir cada registro.

#### Scenario: Vehículos
- **WHEN** abre `/flota/vehiculos`
- **THEN** cada vehículo muestra nombre, matrícula, tipo, nombre del depósito, el turno («08:00–16:00» en hora local), el conductor y su estado

#### Scenario: Depósito que ya no existe
- **WHEN** el depósito de un vehículo no está entre los lugares del tenant
- **THEN** la columna dice «Depósito no disponible» en lugar de mostrar el identificador

#### Scenario: Conductores
- **WHEN** abre `/flota/conductores`
- **THEN** cada conductor muestra además el vehículo que conduce («Sin vehículo» si no tiene)

#### Scenario: Tipo en uso
- **WHEN** abre `/flota/tipos`
- **THEN** cada tipo indica cuántos vehículos lo usan

### Requirement: Disponibilidad al asignar conductor
El selector de conductor de un vehículo SHALL indicar quién ya conduce otro vehículo y quién está inactivo, sin impedir la elección salvo en inactivos.

#### Scenario: Conductor que ya conduce
- **WHEN** abre el selector y un conductor ya está asignado a otro vehículo
- **THEN** su fila dice «Conduce: <vehículo>» y, al elegirlo, se avisa de que el otro vehículo quedará sin él si el gateway lo mueve

#### Scenario: Conductor inactivo
- **WHEN** un conductor está inactivo
- **THEN** aparece deshabilitado con la etiqueta «Inactivo» y no puede elegirse

#### Scenario: Rechazo del gateway
- **WHEN** el gateway rechaza la asignación
- **THEN** se muestra el motivo en español y el vehículo conserva su conductor anterior

### Requirement: Restricciones de zona de un vehículo
El formulario de vehículo SHALL permitir limitar el vehículo a ciertas zonas de reparto, eligiéndolas entre las zonas del tenant.

#### Scenario: Elegir zonas
- **WHEN** elige una o más zonas y guarda
- **THEN** el vehículo queda limitado a ellas y la ficha las lista por nombre

#### Scenario: Sin restricción
- **WHEN** no elige ninguna zona
- **THEN** el vehículo queda sin restricción de zona y la ficha dice «Todas las zonas»

#### Scenario: Zona eliminada
- **WHEN** una zona permitida del vehículo ya no existe
- **THEN** aparece como «Zona eliminada» y puede quitarse

#### Scenario: Sin zonas creadas
- **WHEN** el tenant no tiene zonas
- **THEN** el campo explica que primero hay que crear una y enlaza a `/zonas/nueva`

### Requirement: Fichas con el detalle completo
Los listados SHALL mantener solo lo esencial y SHALL abrir el detalle completo de un vehículo, conductor o tipo en una modal ligada a la dirección de la página.

#### Scenario: Abrir la ficha
- **WHEN** pulsa el ojo de una fila o toca una tarjeta
- **THEN** se abre la modal y la dirección lleva `?vehiculo=<id>` (`?conductor=<id>` o `?tipo=<id>`), de modo que el enlace reproduce la ficha

#### Scenario: Ficha de vehículo
- **WHEN** se abre la ficha de un vehículo
- **THEN** muestra identificación, tipo con su capacidad, depósito (enlazado a su lugar), turno en hora local, conductor, zonas permitidas, estado y fechas, con acciones para editar, asignar o retirar conductor y ver historial

#### Scenario: Ficha de conductor
- **WHEN** se abre la ficha de un conductor
- **THEN** muestra nombre, correo, teléfono, documento, estado, último acceso y el vehículo que conduce, con acciones para editar y enviar el enlace de restablecimiento

#### Scenario: Ficha de tipo
- **WHEN** se abre la ficha de un tipo
- **THEN** muestra su capacidad, medidas, restricciones y consumo y los vehículos que lo usan

#### Scenario: Cerrar
- **WHEN** cierra la modal con Escape, con el botón o con «Atrás»
- **THEN** la dirección vuelve a la del listado sin dejar una entrada de historial de más

#### Scenario: Registro inexistente
- **WHEN** el enlace apunta a un registro que ya no existe
- **THEN** la modal explica que ya no existe y ofrece volver al listado

### Requirement: Enlace al historial de auditoría
Las fichas de vehículo y de conductor SHALL ofrecer «Ver historial», que abre `/auditoria` filtrada por esa entidad, a quien tenga acceso a Auditoría.

#### Scenario: Vehículo
- **WHEN** pulsa «Ver historial» en la ficha de un vehículo
- **THEN** navega a `/auditoria?entidad=resource&id=<id>`

#### Scenario: Conductor
- **WHEN** pulsa «Ver historial» en la ficha de un conductor
- **THEN** navega a `/auditoria?entidad=user&id=<id>`

#### Scenario: Tipo de vehículo
- **WHEN** abre la ficha de un tipo
- **THEN** no se ofrece historial mientras no se confirme el nombre de entidad con el que el gateway audita los tipos
