# Spec Delta

## MODIFIED Requirements

### Requirement: Detalle de la jornada
El detalle SHALL mostrar el resumen de la jornada, el mapa de sus rutas, sus rutas y paradas y los paquetes que no se pudieron planificar.

#### Scenario: Resumen
- **WHEN** abre `/jornadas/:id`
- **THEN** ve el nombre, el estado, la configuración, los totales de servicios, vehículos y zonas, y los tiempos mínimo, medio y máximo en formato de horas y minutos

#### Scenario: Rutas
- **WHEN** la jornada tiene rutas
- **THEN** ve una tabla con nombre, vehículo, número de paradas, distancia en kilómetros, duración, porcentaje de uso de peso y de volumen, e inicio y fin en hora local

#### Scenario: Paradas
- **WHEN** abre una ruta
- **THEN** ve sus paradas en orden con tipo en español, coordenadas, llegada y salida en hora local

#### Scenario: Mapa de las rutas
- **WHEN** la jornada tiene rutas
- **THEN** entre el resumen y la tabla de rutas ve el mapa con todas ellas y su leyenda

#### Scenario: Enfocar desde la tabla
- **WHEN** pulsa «Ver en el mapa» en una ruta o en una parada de la tabla
- **THEN** el mapa resalta esa ruta o centra esa parada

#### Scenario: Paquetes no planificables
- **WHEN** el gateway informa de paquetes que no entraron en ninguna ruta
- **THEN** se listan con un enlace a la ficha de cada uno

#### Scenario: Sin rutas
- **WHEN** la jornada no tiene rutas
- **THEN** se muestra un mensaje que lo explica

#### Scenario: Jornada inexistente
- **WHEN** abre un identificador que el gateway responde con 404
- **THEN** se muestra "El registro ya no existe" con un enlace al listado
