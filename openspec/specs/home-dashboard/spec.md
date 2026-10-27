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
