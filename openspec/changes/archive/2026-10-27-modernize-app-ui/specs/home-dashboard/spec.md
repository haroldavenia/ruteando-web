# Spec Delta

## ADDED Requirements

### Requirement: Inicio con tarjetas
La página de inicio SHALL presentar un saludo, los accesos como mosaicos con icono y las últimas jornadas en una tarjeta, con la misma línea de diseño que el resto de la aplicación.

#### Scenario: Saludo
- **WHEN** una persona con sesión abre `/`
- **THEN** ve el título «Ruteando» y un saludo con su nombre, o su correo si no tiene nombre

#### Scenario: Accesos como mosaicos
- **WHEN** el rol tiene áreas disponibles
- **THEN** cada acceso se muestra como un mosaico con icono y nombre, que es un enlace operable con teclado y con indicador de foco visible

#### Scenario: Últimas jornadas en tarjeta
- **WHEN** el rol puede abrir `/jornadas`
- **THEN** las últimas jornadas se muestran en una tarjeta con la etiqueta de estado de cada una

#### Scenario: Comportamiento intacto
- **WHEN** se abre la página de inicio
- **THEN** los accesos por rol, el orden y los estados de carga, vacío y error de las últimas jornadas se comportan igual que antes
