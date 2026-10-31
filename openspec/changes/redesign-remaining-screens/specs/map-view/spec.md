# Spec Delta

## ADDED Requirements

### Requirement: Mapa base según el tema
El mapa base SHALL mostrarse oscurecido en el tema oscuro y sin cambios en el claro, y SHALL cambiar en vivo cuando cambia el tema.

#### Scenario: Tema oscuro
- **WHEN** se muestra cualquier mapa con el tema oscuro, elegido o del sistema
- **THEN** las teselas del mapa base se ven oscurecidas y las rutas, los marcadores y los polígonos conservan sus colores

#### Scenario: Cambio de tema
- **WHEN** la persona cambia el tema con un mapa abierto
- **THEN** el mapa base y las marcas cambian sin recargar la pantalla

### Requirement: Controles del mapa con tamaño y contraste
Los controles de zoom SHALL medir al menos 44px y la atribución del proveedor SHALL tener contraste de al menos 4,5 a 1 en los dos temas.

#### Scenario: Zoom
- **WHEN** se mide un botón de acercar o alejar
- **THEN** mide al menos 44px de alto y de ancho

#### Scenario: Atribución en oscuro
- **WHEN** se muestra un mapa con el tema oscuro
- **THEN** la atribución sigue visible y su texto contrasta al menos 4,5 a 1 con su fondo

### Requirement: Marcas con los colores del tema
El marcador, los halos y el polígono por defecto SHALL tomar sus colores del tema de la aplicación y no de valores escritos en el código.

#### Scenario: Marcador
- **WHEN** se muestra el marcador de un punto con el tema claro y luego con el oscuro
- **THEN** su relleno y su borde son los del tema activo en cada caso

#### Scenario: Polígono inválido
- **WHEN** el polígono que se dibuja no es válido
- **THEN** se pinta con el color de error del tema activo
