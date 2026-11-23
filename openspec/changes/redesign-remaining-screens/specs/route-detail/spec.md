# Spec Delta

## ADDED Requirements

### Requirement: Cabecera de la ruta
El detalle de una ruta SHALL mostrar su título bajo un enlace de vuelta a la jornada, que nombra la jornada, de al menos 44px de alto.

#### Scenario: Enlace de vuelta
- **WHEN** se abre `/jornadas/:id/rutas/:routeIndex`
- **THEN** sobre el título de la ruta hay un enlace «Jornada» seguido del nombre de la jornada que lleva a `/jornadas/:id`

#### Scenario: Resumen en dos columnas en móvil
- **WHEN** la ventana mide 390px
- **THEN** los datos del resumen se reparten en dos columnas
