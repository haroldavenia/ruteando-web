# Spec Delta

## ADDED Requirements

### Requirement: Paradas con el color de su ruta
En la tabla de visitas, el número de cada parada SHALL mostrarse en una pastilla con el color que la ruta tiene en el mapa y un texto con al menos 4,5 a 1 de contraste, sin cambiar el contenido de la tabla.

#### Scenario: Número de parada
- **WHEN** se ve la tabla de paradas de una ruta
- **THEN** cada parada muestra su número en una pastilla del color de la ruta, en claro y en oscuro, y el número sigue siendo el texto de la celda

#### Scenario: Contraste
- **WHEN** se mide el número de una parada contra el color de su pastilla
- **THEN** la relación de contraste es de al menos 4,5 a 1 para cualquiera de los colores de ruta, en los dos temas

### Requirement: Avance con el hilo de la marca
La barra de avance de la ruta SHALL rellenarse con el hilo de la marca y SHALL seguir siendo decorativa: el avance se lee en el texto «X de N visitas atendidas».

#### Scenario: Barra de avance
- **WHEN** hay visitas
- **THEN** la barra se rellena con el degradado de la marca, está oculta a los lectores de pantalla y el texto del avance sigue anunciándose
