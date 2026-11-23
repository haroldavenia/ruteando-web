# Spec Delta

## ADDED Requirements

### Requirement: Colores de zona como pastillas pulsables
Los colores de la paleta y «Sin color» SHALL mostrarse como pastillas de al menos 44px de alto que se pueden pulsar en cualquier punto, y la elegida SHALL distinguirse por su borde y su fondo además de por su muestra.

#### Scenario: Objetivo de pulsación
- **WHEN** se mide una opción de color
- **THEN** la pastilla entera mide al menos 44px de alto y pulsarla en cualquier punto la elige

#### Scenario: Mismos valores y nombres
- **WHEN** se elige un color o «Sin color»
- **THEN** se envía el mismo valor `#RRGGBB` o `null` de siempre y cada opción se llama como antes («Azul», «Bermellón», «Sin color»…)

#### Scenario: Elegida
- **WHEN** hay un color elegido
- **THEN** su pastilla tiene otro borde y otro fondo que las demás

### Requirement: Formulario de zona con espacio para el mapa
El formulario de zona SHALL agrupar nombre, código y color en una sección y el polígono en otra, y SHALL ocupar el ancho disponible para que el mapa y la tabla de vértices quepan lado a lado.

#### Scenario: Dos secciones
- **WHEN** se abre el formulario de una zona
- **THEN** ve «Datos de la zona» y «Polígono», cada una con su icono y su título

#### Scenario: Sin límite de 880px
- **WHEN** la ventana es ancha
- **THEN** el formulario no se queda en el ancho máximo de los formularios de campos
