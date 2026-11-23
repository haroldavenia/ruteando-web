# route-detail Specification

## Purpose
Muestra una ruta de una jornada por separado: su resumen, su recorrido en el mapa y sus paradas ordenadas, como base para el seguimiento de las visitas.

## Requirements

### Requirement: Ruta y permisos del detalle de ruta
La pantalla SHALL estar en `/jornadas/:id/rutas/:routeIndex` y SHALL ser accesible con los mismos roles y la misma sesión que el resto de `/jornadas`.

#### Scenario: Abrir una ruta
- **WHEN** un usuario con rol `tenant_admin`, `super_admin` o `agent` abre `/jornadas/:id/rutas/:routeIndex`
- **THEN** ve el detalle de esa ruta

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `driver` abre esa dirección
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Jornada o ruta inexistente
- **WHEN** el gateway responde 404 a la jornada, o la jornada no tiene una ruta con ese `routeIndex`
- **THEN** se muestra "El registro ya no existe" con un enlace a la jornada o al listado

### Requirement: Resumen de la ruta
El detalle SHALL mostrar el nombre de la ruta, su vehículo, distancia, duración, uso de peso y de volumen, e inicio y fin en hora local.

#### Scenario: Resumen
- **WHEN** abre una ruta
- **THEN** ve esos datos con distancia en kilómetros y duración en horas y minutos, y un guion en los que el gateway no informa

#### Scenario: Volver a la jornada
- **WHEN** pulsa el enlace de retorno
- **THEN** vuelve a `/jornadas/:id`

### Requirement: Mapa de la ruta
El detalle SHALL mostrar solo esa ruta en el mapa, con sus paradas numeradas y depósitos.

#### Scenario: Una sola ruta
- **WHEN** abre una ruta con geometría o con paradas con posición válida
- **THEN** el mapa dibuja solo esa ruta y encuadra la vista sobre ella

#### Scenario: Enfocar una parada
- **WHEN** pulsa «Ver en el mapa» en una parada de la tabla
- **THEN** el mapa centra esa parada

#### Scenario: Ruta sin paradas
- **WHEN** la ruta no tiene paradas
- **THEN** se muestra un mensaje que lo explica en lugar de la tabla
