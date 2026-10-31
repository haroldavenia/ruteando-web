## Purpose

Da a quien administra la empresa una vista de un vistazo de su flota y le dice, con enlaces a donde se arregla cada cosa, si está lista para planificar jornadas.

## ADDED Requirements

### Requirement: Resumen de la flota
La aplicación SHALL ofrecer `/flota/resumen`, como primera pestaña de la flota, con las cifras de la flota calculadas sobre todos los registros del tenant, solo para `tenant_admin` y `super_admin`.

#### Scenario: Con datos
- **WHEN** el administrador abre `/flota/resumen`
- **THEN** ve vehículos (activos de total), tipos de vehículo, conductores (activos de total), vehículos sin conductor y conductores sin vehículo, cada cifra enlazada al listado correspondiente ya filtrado

#### Scenario: Flota vacía
- **WHEN** el tenant no tiene tipos, vehículos ni conductores
- **THEN** en lugar de ceros se muestra el siguiente paso («Crea tu primer tipo de vehículo») con su enlace

#### Scenario: Una carga falla
- **WHEN** una de las cargas (tipos, vehículos, conductores o lugares) falla
- **THEN** las cifras que dependen de ella muestran un aviso con «Reintentar» y las demás siguen visibles

#### Scenario: Sin permiso
- **WHEN** una persona con rol `agent` o `driver` abre la ruta
- **THEN** es llevada a `/sin-permiso`

### Requirement: Preparación para planificar
El resumen SHALL mostrar una lista de comprobaciones que dice si la flota está lista para planificar, separando lo requerido de lo recomendado.

#### Scenario: Requeridas
- **WHEN** falta un lugar que sirva de depósito, un tipo de vehículo o un vehículo
- **THEN** la comprobación aparece pendiente, con la frase de qué falta y un enlace a crearlo

#### Scenario: Recomendadas
- **WHEN** hay tipos en uso sin capacidad o vehículos activos sin conductor
- **THEN** aparecen como recomendaciones con su consecuencia («sin capacidad no se calcula el uso de peso y volumen») y no bloquean el estado «lista»

#### Scenario: Todo listo
- **WHEN** se cumplen todas las requeridas
- **THEN** el resumen dice «Tu flota está lista para planificar» y enlaza a planificar una jornada

### Requirement: Elementos que requieren atención
El resumen SHALL listar los registros que probablemente necesitan una acción, con un enlace directo a su edición.

#### Scenario: Grupos
- **WHEN** hay registros que revisar
- **THEN** se agrupan en vehículos sin conductor, conductores sin vehículo, tipos sin capacidad, vehículos inactivos y vehículos con un depósito que ya no existe, cada grupo con sus primeros diez y «Ver todos» hacia el listado filtrado

#### Scenario: Nada que revisar
- **WHEN** no hay ninguno
- **THEN** se muestra «Nada que revisar» con un icono, sin grupos vacíos
