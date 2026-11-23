# Spec Delta

## Purpose

Define el mapa reutilizable de la aplicación: un mapa base configurable por entorno, con atribución visible, marcadores y selección de un punto, que solo se dibuja en el navegador y nunca es la única forma de introducir una ubicación.

## ADDED Requirements

### Requirement: Mapa base configurable con atribución
El mapa SHALL usar el mapa base indicado en la configuración del entorno y SHALL mostrar siempre la atribución del proveedor.

#### Scenario: Mapa base del entorno
- **WHEN** se muestra un mapa
- **THEN** las teselas se piden a la URL configurada en el entorno y no a una dirección escrita en el código

#### Scenario: Atribución visible
- **WHEN** se muestra un mapa con el mapa base de OpenStreetMap
- **THEN** es visible la atribución "© OpenStreetMap contributors" con enlace a su página

#### Scenario: Centro y zoom iniciales
- **WHEN** un mapa se muestra sin marcador
- **THEN** se centra en el centro y el zoom por defecto del entorno

### Requirement: Solo en el navegador y diferido
El mapa SHALL dibujarse únicamente en el navegador y su código SHALL cargarse solo cuando una pantalla lo necesita.

#### Scenario: Render en servidor
- **WHEN** una pantalla con mapa se renderiza en el servidor o en el prerender
- **THEN** no falla, muestra un marcador de posición del tamaño del mapa y no accede a `window` ni a `document`

#### Scenario: Bundle inicial
- **WHEN** se compila la aplicación
- **THEN** el código del mapa está en fragmentos diferidos y el bundle inicial no lo incluye

#### Scenario: Fallo al cargar el mapa
- **WHEN** el código o las teselas del mapa no se pueden cargar
- **THEN** la pantalla muestra un aviso en español y el resto de la pantalla, incluidos los campos de coordenadas, sigue funcionando

### Requirement: Marcador y selección de un punto
El mapa SHALL poder mostrar un marcador y, cuando se indique, permitir elegir un punto con un clic y moverlo arrastrándolo.

#### Scenario: Elegir un punto
- **WHEN** el mapa permite seleccionar y el usuario hace clic en un lugar
- **THEN** aparece el marcador en ese punto y se comunica la latitud y la longitud elegidas

#### Scenario: Mover el marcador
- **WHEN** el usuario arrastra el marcador a otro sitio
- **THEN** se comunica la nueva latitud y longitud

#### Scenario: Valor desde fuera
- **WHEN** la pantalla indica un punto distinto (por ejemplo al escribir las coordenadas)
- **THEN** el marcador se mueve a ese punto y el mapa lo centra si queda fuera de la vista

#### Scenario: Solo lectura
- **WHEN** el mapa no permite seleccionar
- **THEN** los clics no mueven el marcador

### Requirement: Ubicación sin mapa
Toda pantalla que pida una ubicación SHALL ofrecer también campos de latitud y longitud, porque el mapa no se puede operar con teclado ni con lector de pantalla.

#### Scenario: Equivalencia
- **WHEN** el usuario escribe coordenadas válidas o elige un punto en el mapa
- **THEN** ambos valores quedan sincronizados

#### Scenario: Región del mapa
- **WHEN** el mapa tiene el foco o se recorre con teclado
- **THEN** está identificado con una etiqueta en español que indica que hay campos de coordenadas como alternativa

### Requirement: Coordenadas válidas
Las coordenadas introducidas SHALL validarse antes de usarse.

#### Scenario: Fuera de rango
- **WHEN** se escribe una latitud fuera de -90 a 90 o una longitud fuera de -180 a 180
- **THEN** se muestra el error junto al campo y el marcador no se mueve

#### Scenario: Orden del gateway
- **WHEN** se envía una ubicación al gateway
- **THEN** se envía como punto GeoJSON con `[longitud, latitud]`
