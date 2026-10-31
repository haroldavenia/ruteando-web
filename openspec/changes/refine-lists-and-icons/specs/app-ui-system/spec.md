# Spec Delta

## ADDED Requirements

### Requirement: Iconos de línea
Todos los iconos de la aplicación SHALL dibujarse con contorno (sin relleno), a un único trazo, como en el diseño, y SHALL conservar su nombre accesible o su `title`.

#### Scenario: Iconos del marco y de las acciones
- **WHEN** se abre cualquier pantalla del área privada
- **THEN** los iconos del riel, de la barra y de las acciones de fila se ven como contornos, no rellenos

#### Scenario: Etiquetas de estado
- **WHEN** se muestra una etiqueta de estado
- **THEN** su glifo es el del diseño (anillo, marca, círculo, exclamación o cruz) y el texto de la etiqueta sigue siendo solo el nombre del estado

#### Scenario: Ningún icono sin resolver
- **WHEN** se abre cada ruta de la aplicación
- **THEN** ningún icono aparece como texto por un nombre desconocido de la fuente
