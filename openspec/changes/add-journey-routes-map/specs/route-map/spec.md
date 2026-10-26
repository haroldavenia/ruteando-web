# Spec Delta

## Purpose

Muestra sobre el mapa las rutas de una jornada: el recorrido de cada ruta con su propio color, las paradas numeradas en orden y los depósitos, con selección de ruta y de parada y una leyenda accesible que sirve también de alternativa al mapa.

## ADDED Requirements

### Requirement: Rutas dibujadas con su geometría
El mapa SHALL dibujar cada ruta de la jornada como una línea con la geometría que devuelve el gateway y SHALL encuadrar la vista para que se vean todas.

#### Scenario: Una línea por ruta
- **WHEN** se muestra una jornada con varias rutas
- **THEN** cada ruta se dibuja como una línea con su propio color

#### Scenario: Encuadre inicial
- **WHEN** el mapa se muestra con rutas
- **THEN** la vista se ajusta para que quepan todas las líneas y paradas, con un margen

#### Scenario: Ruta sin geometría
- **WHEN** una ruta no trae geometría pero sí paradas con posición válida
- **THEN** se dibuja una línea discontinua que une las paradas en orden

#### Scenario: Sin nada que dibujar
- **WHEN** la jornada no tiene rutas, o ninguna tiene geometría ni paradas con posición
- **THEN** se muestra el mapa en su posición por defecto y un aviso en español que lo explica

#### Scenario: Posiciones no válidas
- **WHEN** una parada tiene una posición fuera de rango o ausente
- **THEN** se omite en el mapa sin afectar al resto

### Requirement: Paradas numeradas y depósitos
El mapa SHALL mostrar las paradas en su posición con el número de orden y SHALL distinguir los depósitos de las demás paradas.

#### Scenario: Número de orden
- **WHEN** se muestra una ruta
- **THEN** cada parada de servicio lleva su número de orden dentro de la ruta, con el color de la ruta

#### Scenario: Depósitos
- **WHEN** una parada es de tipo depósito
- **THEN** se dibuja con un símbolo distinto al de las paradas de servicio

#### Scenario: Distinguir rutas sin depender del color
- **WHEN** dos rutas tienen colores parecidos
- **THEN** la leyenda y la ficha de cada parada nombran la ruta, y el número de ruta aparece en el texto de la parada

### Requirement: Colores distinguibles
Los colores de las rutas SHALL salir de una paleta apta para personas con daltonismo y SHALL tener contraste suficiente sobre el mapa base.

#### Scenario: Paleta
- **WHEN** hay hasta ocho rutas
- **THEN** cada una usa un color distinto de la paleta

#### Scenario: Más rutas que colores
- **WHEN** hay más rutas que colores
- **THEN** los colores se reutilizan por orden y la leyenda sigue identificando cada ruta por su nombre y número

### Requirement: Selección y resaltado de ruta
El usuario SHALL poder elegir una ruta para resaltarla y encuadrarla, y volver a ver todas.

#### Scenario: Elegir una ruta
- **WHEN** elige una ruta en la leyenda o en la tabla de rutas
- **THEN** la ruta se resalta con más grosor, las demás se atenúan y el mapa se encuadra en ella

#### Scenario: Volver a todas
- **WHEN** pulsa «Ver todas» o vuelve a elegir la ruta resaltada
- **THEN** se restablece el estilo normal y el encuadre de todas las rutas

#### Scenario: Estado accesible
- **WHEN** hay una ruta resaltada
- **THEN** su botón de la leyenda está marcado como pulsado y se anuncia la ruta enfocada

### Requirement: Ficha de parada
El usuario SHALL poder consultar los datos de una parada desde el mapa o desde la tabla de paradas.

#### Scenario: Clic en una parada
- **WHEN** hace clic en una parada del mapa
- **THEN** se muestra su ficha con ruta, orden, tipo en español, llegada y salida en hora local y, si es un paquete, un enlace a su ficha

#### Scenario: Desde la tabla
- **WHEN** pulsa «Ver en el mapa» en una parada de la tabla
- **THEN** el mapa la centra, la marca y se muestra su ficha

#### Scenario: Cerrar la ficha
- **WHEN** cierra la ficha
- **THEN** la parada deja de estar marcada

### Requirement: Leyenda y alternativa sin mapa
La leyenda SHALL listar las rutas con su color, nombre, vehículo y distancia y SHALL poder operarse con teclado, de modo que toda la información del mapa esté disponible sin él.

#### Scenario: Contenido de la leyenda
- **WHEN** se muestra el mapa de una jornada
- **THEN** la leyenda lista cada ruta con una muestra de su color, su nombre, su vehículo y su distancia en kilómetros

#### Scenario: Teclado
- **WHEN** recorre la leyenda con Tab y activa una ruta con Intro o Espacio
- **THEN** la ruta se resalta igual que con el ratón

#### Scenario: Región del mapa
- **WHEN** un lector de pantalla llega al mapa
- **THEN** está identificado con una etiqueta en español que remite a las tablas de rutas y paradas como alternativa

### Requirement: Solo en el navegador y sin romper la pantalla
El mapa de rutas SHALL dibujarse únicamente en el navegador y un fallo al cargarlo SHALL dejar el resto de la pantalla funcionando.

#### Scenario: Render en servidor
- **WHEN** la pantalla se renderiza en el servidor
- **THEN** no falla y deja un hueco del mismo tamaño que el mapa

#### Scenario: Fallo de carga
- **WHEN** no se puede cargar OpenLayers o las teselas
- **THEN** se muestra un aviso en español y la leyenda y las tablas siguen funcionando

#### Scenario: Atribución
- **WHEN** se muestra el mapa
- **THEN** es visible la atribución del proveedor de teselas
