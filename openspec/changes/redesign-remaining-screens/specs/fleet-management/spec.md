# Spec Delta

## ADDED Requirements

### Requirement: Formularios de flota por secciones
Los formularios de tipo de vehículo, vehículo y conductor SHALL agrupar sus campos en secciones con icono y título y mostrar sobre el título un enlace de vuelta a su listado, sin cambiar campos, validaciones ni lo que se envía.

#### Scenario: Tipo de vehículo
- **WHEN** se abre `/flota/tipos/nuevo` o `/flota/tipos/:id`
- **THEN** ve la sección «Datos del tipo» y el enlace «Tipos de vehículo»

#### Scenario: Vehículo
- **WHEN** se abre `/flota/vehiculos/nuevo` o `/flota/vehiculos/:id`
- **THEN** ve «Identificación» (nombre, matrícula y tipo) y «Depósito y turno» (depósito, turno, descanso y cantidad) y el enlace «Vehículos»

#### Scenario: Conductor
- **WHEN** se abre `/flota/conductores/nuevo`
- **THEN** ve «Datos del conductor» y «Acceso» (contraseña inicial); al editar un conductor no aparece «Acceso»

#### Scenario: Acción principal
- **WHEN** se ve la barra de acciones de cualquiera de los tres
- **THEN** «Guardar» lleva el hilo de la marca y, con cambios sin guardar, la barra lo dice
