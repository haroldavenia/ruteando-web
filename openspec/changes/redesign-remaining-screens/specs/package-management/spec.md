# Spec Delta

## ADDED Requirements

### Requirement: Formulario de paquete por secciones
El formulario de alta y edición de paquetes SHALL agrupar sus campos en cuatro secciones con icono y título (Identificación, Dirección, Carga y Ubicación), con la ubicación junto al mapa, sin cambiar los campos, las validaciones ni lo que se envía.

#### Scenario: Secciones
- **WHEN** se abre `/paquetes/nuevo` o `/paquetes/:id`
- **THEN** ve las secciones «Identificación» (guía, nombre y tipo de servicio), «Dirección» (dirección, ciudad, país y código postal), «Carga» (peso, volumen, piezas y observación) y «Ubicación» (latitud, longitud y mapa)

#### Scenario: Guardar es la acción principal
- **WHEN** se ve la barra de acciones del formulario
- **THEN** «Guardar» lleva el hilo de la marca y «Cancelar» es secundaria; con cambios sin guardar la barra lo dice
