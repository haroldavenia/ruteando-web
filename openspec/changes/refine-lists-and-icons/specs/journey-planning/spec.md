# Spec Delta

## ADDED Requirements

### Requirement: Jornadas por estado
El listado de jornadas SHALL ofrecer chips de estado con recuento (en planificación, planificada, en curso, completada, fallida y cancelada) y una búsqueda por nombre o configuración sobre todas las jornadas.

#### Scenario: Elegir un estado
- **WHEN** hay cuatro jornadas (una en curso, dos completadas y una fallida) y se elige «Completada»
- **THEN** la tabla muestra solo las dos completadas y el chip queda marcado

#### Scenario: Un estado desconocido
- **WHEN** una jornada trae un estado que la aplicación no conoce
- **THEN** tiene su chip con la clave del estado
