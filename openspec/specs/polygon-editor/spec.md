# polygon-editor Specification

## Purpose
Permite dibujar y editar un polígono sobre el mapa y, a la vez, como una tabla de vértices con latitud y longitud, para que quien no pueda usar el mapa con ratón o con el dedo pueda hacerlo igualmente con teclado y lector de pantalla.

## Requirements

### Requirement: Dibujar el polígono en el mapa
El editor SHALL permitir dibujar un polígono vértice a vértice sobre el mapa y terminarlo con un doble clic o con el botón «Terminar polígono».

#### Scenario: Empezar a dibujar
- **WHEN** no hay polígono y el usuario pulsa «Dibujar polígono»
- **THEN** cada clic en el mapa añade un vértice y se muestra el contorno provisional

#### Scenario: Terminar
- **WHEN** hay al menos tres vértices y el usuario hace doble clic o pulsa «Terminar polígono»
- **THEN** el polígono queda cerrado y el modo de dibujo se desactiva

#### Scenario: Cancelar el dibujo
- **WHEN** pulsa «Cancelar» o la tecla Escape mientras dibuja
- **THEN** se descarta el polígono a medias y se conserva el anterior, si lo había

#### Scenario: Empezar de nuevo
- **WHEN** pulsa «Borrar polígono»
- **THEN** se quitan todos los vértices tras pedir confirmación si había más de tres

### Requirement: Mover los vértices
El editor SHALL permitir arrastrar un vértice del polígono para moverlo y añadir vértices sobre un lado.

#### Scenario: Arrastrar un vértice
- **WHEN** el usuario arrastra un vértice del polígono
- **THEN** el polígono cambia en el mapa y la tabla de vértices muestra las nuevas coordenadas

#### Scenario: Añadir un vértice en un lado
- **WHEN** arrastra un punto del lado de un polígono
- **THEN** aparece un vértice nuevo en esa posición

### Requirement: Tabla de vértices equivalente
El editor SHALL ofrecer una tabla con los vértices en la que se pueda hacer todo lo que se hace en el mapa.

#### Scenario: Contenido
- **WHEN** hay un polígono
- **THEN** la tabla lista cada vértice numerado con su latitud y su longitud editables, sin repetir el último vértice que cierra el anillo

#### Scenario: Editar coordenadas
- **WHEN** el usuario cambia una latitud o una longitud válida
- **THEN** el polígono del mapa se actualiza

#### Scenario: Añadir y quitar vértices
- **WHEN** pulsa «Añadir vértice» o el botón de quitar de una fila
- **THEN** se añade un vértice al final o se elimina el elegido, con etiquetas que nombran el vértice

#### Scenario: Valores no válidos
- **WHEN** escribe una latitud fuera de -90 a 90 o una longitud fuera de -180 a 180
- **THEN** se muestra el error junto al campo y el polígono no cambia

#### Scenario: Sin mapa
- **WHEN** el mapa no se puede cargar
- **THEN** la tabla sigue permitiendo crear y editar el polígono por completo

### Requirement: Validación del polígono
El editor SHALL informar de si el polígono es válido y por qué no lo es.

#### Scenario: Pocos vértices
- **WHEN** hay menos de tres vértices distintos
- **THEN** se indica que hacen falta al menos tres

#### Scenario: Sin área
- **WHEN** los vértices están alineados o el área es cero
- **THEN** se indica que el polígono no encierra ninguna superficie

#### Scenario: Lados cruzados
- **WHEN** dos lados no contiguos se cruzan
- **THEN** se indica entre qué lados y se marca el polígono como no válido

#### Scenario: Polígono válido
- **WHEN** el polígono es válido
- **THEN** se muestra el número de vértices y su área aproximada en kilómetros cuadrados, anunciados a tecnologías de apoyo

### Requirement: Salida estándar
El editor SHALL entregar el polígono como un anillo GeoJSON cerrado y orientado en sentido antihorario.

#### Scenario: Cierre
- **WHEN** se entrega un polígono de cuatro vértices
- **THEN** el anillo tiene cinco posiciones y la última repite la primera

#### Scenario: Orientación
- **WHEN** el usuario dibuja los vértices en sentido horario
- **THEN** el anillo entregado está en sentido antihorario y el aspecto en el mapa no cambia

#### Scenario: Entrada
- **WHEN** se carga un polígono existente cuyo anillo repite el primer vértice al final
- **THEN** el editor lo muestra sin ese vértice repetido

### Requirement: Solo en el navegador y sin romper la pantalla
El editor SHALL dibujar el mapa únicamente en el navegador y un fallo al cargarlo SHALL dejar la tabla de vértices funcionando.

#### Scenario: Render en servidor
- **WHEN** la pantalla se renderiza en el servidor
- **THEN** no falla, deja un hueco del tamaño del mapa y pinta la tabla de vértices

#### Scenario: Fallo de carga
- **WHEN** no se puede cargar OpenLayers o las teselas
- **THEN** se muestra un aviso en español y la tabla sigue funcionando

#### Scenario: Atribución
- **WHEN** se muestra el mapa
- **THEN** es visible la atribución del proveedor de teselas
