## Purpose

Permite ver dónde están los conductores según la última posición que compartieron, sobre un mapa con una alternativa en texto, y dónde está el conductor de cada vehículo.

## ADDED Requirements

### Requirement: Mapa de posiciones de los conductores
La aplicación SHALL ofrecer `/flota/mapa`, solo para `tenant_admin` y `super_admin`, con un marcador por conductor que tenga una última posición conocida.

#### Scenario: Con posiciones
- **WHEN** el gateway devuelve posiciones
- **THEN** el mapa muestra un marcador por conductor con su nombre, su vehículo y la hora de su última señal, usando `x` como longitud e `y` como latitud

#### Scenario: Sin posiciones
- **WHEN** el gateway devuelve una lista vacía
- **THEN** se explica que todavía ningún conductor ha compartido su posición, que la comparte desde su aplicación, y se ofrece volver a la flota

#### Scenario: Alternativa en texto
- **WHEN** se usa un lector de pantalla o el teclado
- **THEN** una tabla con conductor, vehículo, hora y coordenadas ofrece los mismos datos y cada fila enfoca su marcador

### Requirement: Actualización periódica de las posiciones
El mapa SHALL actualizar las posiciones de forma periódica mientras la pestaña esté visible, sin recargar la página ni mover la vista del mapa.

#### Scenario: Sondeo
- **WHEN** el mapa lleva abierto 30 segundos con la pestaña visible
- **THEN** vuelve a pedir las posiciones y mueve los marcadores sin cambiar el zoom ni el centro

#### Scenario: Pestaña oculta
- **WHEN** la pestaña del navegador queda oculta
- **THEN** se detiene el sondeo y se reanuda, con una petición inmediata, al volver a mostrarse

#### Scenario: Fallo de red
- **WHEN** una actualización falla
- **THEN** se conservan las últimas posiciones, se avisa de que no se pudo actualizar y se reintenta en el siguiente ciclo

#### Scenario: Actualizar a mano
- **WHEN** pulsa «Actualizar»
- **THEN** se piden las posiciones de inmediato y se reinicia el ciclo

### Requirement: Posiciones obsoletas
El mapa SHALL distinguir una posición reciente de una antigua para no hacer creer que un conductor está donde estuvo hace horas.

#### Scenario: Posición antigua
- **WHEN** la última señal de un conductor tiene más de 15 minutos
- **THEN** su marcador se muestra atenuado y su etiqueta dice «Última señal hace 40 min»

#### Scenario: Fecha sin zona horaria
- **WHEN** la fecha de la posición llega sin zona horaria
- **THEN** se interpreta con la regla confirmada con el gateway y nunca se muestra una hora futura

### Requirement: Posición del conductor en la ficha del vehículo
La ficha de un vehículo con conductor asignado SHALL mostrar su última posición conocida y enlazar al mapa.

#### Scenario: Con posición
- **WHEN** el conductor del vehículo tiene una posición
- **THEN** la ficha dice «Visto hace 3 min» y un enlace abre `/flota/mapa` centrado en ese conductor

#### Scenario: Sin posición
- **WHEN** el conductor no tiene ninguna
- **THEN** la ficha dice «Sin posición compartida» y no muestra enlace
