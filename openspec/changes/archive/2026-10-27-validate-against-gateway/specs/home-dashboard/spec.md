# Spec Delta

## ADDED Requirements

### Requirement: Orden de las últimas jornadas
Las jornadas de la página de inicio SHALL ordenarse de la más reciente a la más antigua según su fecha de creación, y SHALL ser las cinco más recientes del total aunque el gateway no devuelva el listado en ese orden.

#### Scenario: Más reciente primero
- **WHEN** hay más de cinco jornadas con distintas fechas de creación
- **THEN** la página de inicio muestra las cinco de fecha más reciente, la más nueva arriba

#### Scenario: Pocas jornadas
- **WHEN** hay tres jornadas
- **THEN** se muestran las tres, de la más reciente a la más antigua

#### Scenario: Fechas iguales o ausentes
- **WHEN** dos jornadas tienen la misma fecha de creación o alguna no la informa
- **THEN** el orden es estable y las jornadas sin fecha quedan al final, sin fallar

#### Scenario: Enlace al listado completo
- **WHEN** hay más jornadas de las que se muestran
- **THEN** el enlace «Ver todas las jornadas» lleva a `/jornadas`, donde están todas
