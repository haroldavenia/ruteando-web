# Spec Delta

## MODIFIED Requirements

### Requirement: Detalle de la jornada
El detalle SHALL mostrar el resumen de la jornada, el mapa de sus rutas, sus rutas y paradas, un enlace al detalle de cada ruta y los paquetes que no se pudieron planificar.

#### Scenario: Resumen
- **WHEN** abre `/jornadas/:id`
- **THEN** ve el nombre, el estado, la configuración, los totales de servicios, vehículos y zonas, y los tiempos mínimo, medio y máximo en formato de horas y minutos

#### Scenario: Rutas
- **WHEN** la jornada tiene rutas
- **THEN** ve una tarjeta por ruta con su nombre, su vehículo, el número de paradas, la distancia en kilómetros, la duración, el porcentaje de uso de peso y de volumen (también como barra), e inicio y fin en hora local, con una franja del color que la ruta tiene en el mapa

#### Scenario: Paradas
- **WHEN** abre una ruta
- **THEN** ve sus paradas en orden con tipo en español, coordenadas, llegada y salida en hora local

#### Scenario: Mapa de las rutas
- **WHEN** la jornada tiene rutas
- **THEN** entre el resumen y las rutas ve el mapa con todas ellas y su leyenda; desde 1100px el mapa queda fijo a un lado y las rutas al otro, y por debajo, el mapa sobre las rutas

#### Scenario: Enfocar desde la tabla
- **WHEN** pulsa «Ver en el mapa» en una ruta o en una parada de su tarjeta
- **THEN** el mapa resalta esa ruta o centra esa parada y la tarjeta de la ruta queda marcada

#### Scenario: Abrir una ruta
- **WHEN** pulsa «Ver ruta» en la tarjeta de una ruta
- **THEN** va a `/jornadas/:id/rutas/:routeIndex` y el enlace nombra la ruta para lectores de pantalla

#### Scenario: Paquetes no planificables
- **WHEN** el gateway informa de paquetes que no entraron en ninguna ruta
- **THEN** se listan con un enlace a la ficha de cada uno

#### Scenario: Sin rutas
- **WHEN** la jornada no tiene rutas
- **THEN** se muestra un mensaje que lo explica

#### Scenario: Jornada inexistente
- **WHEN** abre un identificador que el gateway responde con 404
- **THEN** se muestra "El registro ya no existe" con un enlace al listado

#### Scenario: Pantalla estrecha
- **WHEN** la ventana mide 390px
- **THEN** las rutas se muestran como tarjetas apiladas y ninguna tabla de rutas obliga a desplazar la página

## ADDED Requirements

### Requirement: Planificar en una página con pasos y resumen
El formulario de planificar SHALL presentarse en una sola página con secciones numeradas (1 Configuración y 2 Paquetes) y un resumen «3 Revisa» con el nombre, la configuración y el número de paquetes elegidos, sin cambiar el envío único ni lo que se envía.

#### Scenario: Secciones numeradas
- **WHEN** se abre `/jornadas/nueva`
- **THEN** ve las secciones «1 Configuración» y «2 Paquetes» y, a su lado o debajo, el resumen «3 Revisa»

#### Scenario: Resumen que se actualiza
- **WHEN** escribe el nombre, elige la configuración o elige paquetes
- **THEN** el resumen muestra el nombre, la descripción de la configuración y «N paquetes» («1 paquete» en singular), y lo que falta se muestra apagado («Sin escribir», «Sin elegir», «Ninguno elegido»)

#### Scenario: Un solo envío
- **WHEN** pulsa «Planificar»
- **THEN** se envía una única petición con el nombre, la configuración y los paquetes elegidos, igual que antes

#### Scenario: Acciones con aviso
- **WHEN** hay cambios sin guardar
- **THEN** la barra de acciones lo dice y «Planificar» es la acción principal de la pantalla
