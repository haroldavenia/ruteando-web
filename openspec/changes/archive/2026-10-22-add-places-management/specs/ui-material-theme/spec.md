# Spec Delta

## MODIFIED Requirements

### Requirement: Menú por secciones y rol
El menú lateral SHALL agrupar las entradas por secciones de negocio y SHALL mostrar a cada persona solo las entradas de las rutas a las que su rol da acceso.

#### Scenario: Administrador
- **WHEN** un usuario `tenant_admin` o `super_admin` abre el área autenticada
- **THEN** el menú muestra "Inicio", la sección "Flota" con "Vehículos", "Tipos de vehículo" y "Conductores", y la entrada "Lugares"

#### Scenario: Otros roles
- **WHEN** un usuario `agent` o `driver` abre el área autenticada
- **THEN** el menú muestra "Inicio" y no muestra la sección "Flota" ni la entrada "Lugares"

#### Scenario: Elemento activo en una sección
- **WHEN** la ruta actual es una pantalla de la sección o una de sus subrutas (por ejemplo la edición de un vehículo o de un lugar)
- **THEN** la entrada correspondiente del menú se marca como activa

#### Scenario: Sin sesión cargada
- **WHEN** el usuario aún no está disponible durante el render en servidor
- **THEN** el menú muestra solo las entradas visibles para cualquier rol y no falla
