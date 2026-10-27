# home-dashboard Specification

## Purpose
La página de inicio orienta a quien entra: muestra las áreas de la aplicación que su rol puede abrir y, para quienes operan jornadas, las últimas que se planificaron.

## Requirements

### Requirement: Accesos según el rol
La página de inicio SHALL mostrar un acceso a cada área de la aplicación que el rol de la persona puede abrir, con el mismo nombre que el menú lateral.

#### Scenario: Administración
- **WHEN** una persona con rol `tenant_admin` o `super_admin` abre `/`
- **THEN** ve accesos a Flota, Lugares, Zonas, Paquetes, Jornadas y Configuraciones

#### Scenario: Agente
- **WHEN** una persona con rol `agent` abre `/`
- **THEN** ve accesos solo a Paquetes y Jornadas

#### Scenario: Rol sin áreas
- **WHEN** una persona con rol `driver` abre `/`
- **THEN** ve un mensaje que explica que su rol no tiene áreas en la aplicación web y no ve accesos ni jornadas

#### Scenario: Coherencia con el menú
- **WHEN** se añade o se retira un área del menú lateral para un rol
- **THEN** la página de inicio refleja el mismo cambio sin editarse aparte

### Requirement: Últimas jornadas
La página de inicio SHALL mostrar las cinco jornadas más recientes a quienes pueden abrir `/jornadas`, con enlace a su detalle y otro al listado completo.

#### Scenario: Con jornadas
- **WHEN** un agente o administrador abre `/` y el gateway devuelve jornadas
- **THEN** ve, por jornada, el nombre, el estado en español y la fecha de creación en hora local, con un enlace a `/jornadas/:id`, y un enlace «Ver todas las jornadas»

#### Scenario: Sin jornadas
- **WHEN** el gateway no devuelve jornadas
- **THEN** ve un mensaje que lo explica y un enlace para planificar la primera

#### Scenario: Cargando
- **WHEN** la lista todavía no ha llegado
- **THEN** ve un indicador de carga accesible y los accesos ya están disponibles

#### Scenario: Error del gateway
- **WHEN** el gateway rechaza la petición o no responde
- **THEN** ve el mensaje del error con un botón «Reintentar» y los accesos siguen funcionando

#### Scenario: Rol sin acceso a jornadas
- **WHEN** quien abre `/` no puede abrir `/jornadas`
- **THEN** no se pide ninguna jornada al gateway

### Requirement: Inicio accesible
La página de inicio SHALL tener un único encabezado de primer nivel y secciones con encabezados propios, y SHALL ser operable solo con teclado.

#### Scenario: Estructura
- **WHEN** se inspecciona la página
- **THEN** tiene un `h1` «Ruteando» y secciones con `h2` «Áreas» y, si aplica, «Últimas jornadas»

#### Scenario: Teclado
- **WHEN** se recorre con la tecla de tabulación
- **THEN** cada acceso y cada enlace de jornada recibe el foco en orden visual y muestra un indicador de foco
