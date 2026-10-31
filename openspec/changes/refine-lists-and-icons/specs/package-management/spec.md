# Spec Delta

## ADDED Requirements

### Requirement: Varios paquetes a la vez
El listado de paquetes SHALL permitir elegir varios y, desde la barra de la selección, cambiarles el estado y exportarlos a CSV. El cambio de estado SHALL hacerse con una petición por paquete (el gateway no tiene lote), de a pocas a la vez, sin que el fallo de una detenga a las demás, y cancelar SHALL pedir una sola confirmación para todos.

#### Scenario: Cambiar el estado de varios
- **WHEN** se eligen dos paquetes y se elige «Atendido» en «Cambiar estado»
- **THEN** se envía una petición de estado por paquete, se avisa «El estado de 2 paquetes ahora es «Atendido»», se quita la selección y se vuelve a pedir el listado

#### Scenario: Un paquete rechazado
- **WHEN** el gateway rechaza el cambio de uno de los paquetes
- **THEN** los demás se cambian y se avisa cuántos fallaron, con su nombre y el motivo en español

#### Scenario: Cancelar varios
- **WHEN** se elige «Cancelado» para tres paquetes
- **THEN** se pide una sola confirmación («¿Cancelar los 3 paquetes elegidos?») y, si se rechaza, no se envía nada

#### Scenario: Exportar los elegidos
- **WHEN** se elige «Exportar» con dos paquetes elegidos
- **THEN** se descarga un CSV solo con ellos, sin volver a pedirlos al gateway

### Requirement: Columnas del listado
El listado de paquetes SHALL mostrar guía (en monoespaciada), nombre, dirección, servicio, estado y cuánto hace que se actualizó («hace 12 min»).

#### Scenario: Actualizado
- **WHEN** un paquete se actualizó hace 12 minutos
- **THEN** su fila dice «hace 12 min»
