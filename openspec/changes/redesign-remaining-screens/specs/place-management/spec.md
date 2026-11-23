# Spec Delta

## ADDED Requirements

### Requirement: Formulario de lugar por secciones con la ubicación junto al mapa
El formulario de alta y edición de lugares SHALL agrupar sus campos en «Datos del lugar» y «Ubicación», y desde 720px SHALL mostrar el mapa a la derecha de los campos de latitud y longitud, que van primero en el orden de lectura.

#### Scenario: Secciones
- **WHEN** se abre `/lugares/nuevo` o `/lugares/:id`
- **THEN** ve «Datos del lugar» (nombre, tipo, dirección, teléfono y persona de contacto) y «Ubicación» (latitud, longitud y mapa)

#### Scenario: Ventana ancha
- **WHEN** la ventana mide 720px o más
- **THEN** el mapa queda a la derecha de los campos y estos van uno sobre otro

#### Scenario: Ventana estrecha
- **WHEN** la ventana mide menos de 720px
- **THEN** el mapa va debajo de los campos

#### Scenario: Mismo comportamiento
- **WHEN** se escribe una coordenada válida o se mueve el marcador
- **THEN** el marcador y los campos se sincronizan exactamente como antes
