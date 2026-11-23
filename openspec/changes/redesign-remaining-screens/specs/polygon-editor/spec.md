# Spec Delta

## ADDED Requirements

### Requirement: Disposición del editor
El editor de polígonos SHALL mantener el orden de lectura herramientas, mapa, resumen y tabla de vértices, y SHALL colocar la tabla a la derecha del mapa desde 1100px de ancho, con sus entradas de al menos 44px de alto.

#### Scenario: Orden de lectura
- **WHEN** se recorre el editor con teclado o con un lector de pantalla
- **THEN** primero están las herramientas, después el mapa, después el resumen del polígono y por último la tabla de vértices

#### Scenario: Ventana ancha
- **WHEN** la ventana mide 1100px o más
- **THEN** la tabla de vértices está a la derecha del mapa y, si es larga, se desplaza dentro de su columna sin alargar el formulario

#### Scenario: Ventana estrecha
- **WHEN** la ventana mide menos de 1100px
- **THEN** la tabla de vértices va debajo del mapa

#### Scenario: Entradas de la tabla
- **WHEN** se mide un campo de latitud o de longitud de la tabla
- **THEN** mide al menos 44px de alto

### Requirement: Editor sin desbordar en pantallas estrechas
El editor SHALL caber en el ancho de la pantalla a partir de 320px y SHALL presentar cada vértice de su tabla como una tarjeta cuando la caja es estrecha.

#### Scenario: 320px
- **WHEN** la ventana mide 320px
- **THEN** la barra de herramientas, el mapa y la tabla de vértices caben sin desplazar la pantalla en horizontal

#### Scenario: Vértice como tarjeta
- **WHEN** la caja de la tabla de vértices mide menos de 840px
- **THEN** cada vértice muestra su número y «Quitar» arriba y, debajo, la latitud y la longitud con su etiqueta (una al lado de la otra desde 420px), sin cambiar los campos ni sus validaciones

