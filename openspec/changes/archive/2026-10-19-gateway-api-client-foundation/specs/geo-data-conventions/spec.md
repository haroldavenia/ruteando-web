# Spec Delta

## Purpose

Define cómo el frontend interpreta y convierte de forma única las coordenadas y geometrías del gateway, para que ninguna pantalla mezcle el orden latitud/longitud.

## ADDED Requirements

### Requirement: Coordenada de dominio única
La aplicación SHALL representar una posición como latitud y longitud con nombre, y SHALL convertirla desde y hacia los formatos del gateway y del mapa en un único punto.

#### Scenario: Punto GeoJSON del gateway
- **WHEN** el gateway entrega `location.coordinates` `[-74.07728, 4.60872]`
- **THEN** la coordenada de dominio es latitud 4.60872 y longitud -74.07728

#### Scenario: Envío al gateway
- **WHEN** la coordenada de dominio de latitud 4.60872 y longitud -74.07728 se envía como `location`
- **THEN** el cuerpo lleva `{"type":"Point","coordinates":[-74.07728,4.60872]}`

#### Scenario: Coordenada para el mapa
- **WHEN** se pide la coordenada en el orden que usa el mapa
- **THEN** el resultado es `[longitud, latitud]`

### Requirement: Validación de rango
La aplicación SHALL rechazar coordenadas fuera de rango en lugar de propagarlas.

#### Scenario: Latitud inválida
- **WHEN** se convierte un punto con latitud 91 o -91
- **THEN** la conversión devuelve ausencia de coordenada y no lanza excepción

#### Scenario: Valores no numéricos o nulos
- **WHEN** el punto trae `null`, texto o menos de dos valores
- **THEN** la conversión devuelve ausencia de coordenada

### Requirement: Decodificación de la geometría de rutas
La aplicación SHALL decodificar el campo de geometría de las rutas como polilínea codificada de precisión 5 en orden latitud, longitud.

#### Scenario: Muestra real de Bogotá
- **WHEN** se decodifica la geometría de una ruta planificada en Bogotá
- **THEN** el primer punto tiene latitud cercana a 4.6 y longitud cercana a -74.08

#### Scenario: Geometría vacía o nula
- **WHEN** la ruta no trae geometría
- **THEN** el resultado es una lista vacía y no hay excepción

#### Scenario: Cadena truncada o inválida
- **WHEN** la cadena termina a mitad de un valor
- **THEN** se devuelven los puntos completos decodificados hasta ese momento sin lanzar excepción

#### Scenario: Nombre en el dominio
- **WHEN** una ruta del gateway se convierte al modelo de dominio
- **THEN** su geometría se expone con el nombre `geometry` y no como GeoJSON
