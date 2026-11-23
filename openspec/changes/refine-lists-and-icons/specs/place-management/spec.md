# Spec Delta

## ADDED Requirements

### Requirement: Lista de lugares con mapa
El listado de lugares SHALL mostrar junto a la lista un mapa con un pin por lugar, del color y con la letra de su tipo, y la leyenda de los tipos presentes; el mapa SHALL mostrar solo los lugares que cumplen la búsqueda y el chip de tipo elegidos, y un clic en un pin SHALL abrir una ficha con el nombre, el tipo, la dirección y un enlace para editar el lugar.

#### Scenario: Mapa y lista
- **WHEN** hay lugares
- **THEN** desde 1100px el mapa queda fijo a un lado y la lista al otro; por debajo, el mapa va sobre la lista

#### Scenario: Filtro
- **WHEN** se elige el chip «Tienda» o se escribe una búsqueda
- **THEN** el mapa dibuja solo esos lugares y se ajusta para mostrarlos

#### Scenario: Ficha
- **WHEN** se pulsa un pin
- **THEN** aparece la ficha del lugar con «Editar» y un botón para cerrarla

#### Scenario: Sin teclado en el mapa
- **WHEN** se usa solo el teclado
- **THEN** la lista (con búsqueda, chips y acciones) ofrece todo lo que ofrece el mapa

#### Scenario: Sin lugares
- **WHEN** no hay lugares
- **THEN** no se muestra el mapa, solo el mensaje de lista vacía
