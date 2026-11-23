## MODIFIED Requirements

### Requirement: Accesos según el rol
La página de inicio SHALL dejar el acceso a cada área que el rol de la persona puede abrir en el riel de navegación y en la búsqueda de la barra superior, con los mismos nombres que el menú, en lugar de mosaicos propios, y SHALL explicar a quien no tiene ninguna área que su rol no la tiene.

#### Scenario: Administración
- **WHEN** una persona con rol `tenant_admin` o `super_admin` abre `/`
- **THEN** el riel ofrece Inicio, Flota, Lugares, Zonas, Paquetes, Jornadas, Configuraciones y Auditoría, y la búsqueda encuentra además Vehículos, Tipos de vehículo y Conductores

#### Scenario: Agente
- **WHEN** una persona con rol `agent` abre `/`
- **THEN** el riel y la búsqueda ofrecen solo Paquetes, Jornadas y Auditoría, además de Inicio

#### Scenario: Rol sin áreas
- **WHEN** una persona con rol `driver` abre `/`
- **THEN** ve un mensaje que explica que su rol no tiene áreas disponibles en la aplicación web y no ve acciones, cifras ni jornadas

#### Scenario: Coherencia con el menú
- **WHEN** se añade o se retira un área de `nav-items` para un rol
- **THEN** el riel, la búsqueda y el menú desplegable reflejan el mismo cambio sin editarse aparte
