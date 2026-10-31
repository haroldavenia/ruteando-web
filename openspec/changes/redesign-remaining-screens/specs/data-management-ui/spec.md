# Spec Delta

## ADDED Requirements

### Requirement: Cabecera con recuento
La cabecera de cada listado SHALL mostrar el título, el número de registros cuando ya se cargó y las acciones de la pantalla.

#### Scenario: Recuento
- **WHEN** un listado termina de cargar
- **THEN** bajo el título se muestra el total de registros que informa el gateway (por ejemplo, «137 paquetes»)

#### Scenario: Antes de cargar o con error
- **WHEN** el listado aún carga o falló
- **THEN** no se muestra ningún recuento

### Requirement: Alcance del filtro visible
El filtro de un listado SHALL decir sobre cuántas filas actúa, porque solo recorre la página cargada.

#### Scenario: Filas mostradas
- **WHEN** un listado tiene más registros que los de la página cargada
- **THEN** junto al filtro se muestra cuántas filas se ven y el total (por ejemplo, «Mostrando 20 de 137»)

#### Scenario: Sin cambios en el filtrado
- **WHEN** se escribe en el filtro
- **THEN** se filtran las filas de la página como antes, sin distinguir acentos ni mayúsculas

### Requirement: Carga con la forma de la tabla
Mientras un listado carga SHALL mostrarse el indicador de progreso con su nombre accesible y el mensaje de carga, y filas de esqueleto decorativas con la forma de la tabla.

#### Scenario: Esqueleto decorativo
- **WHEN** un listado está cargando
- **THEN** se ven filas de esqueleto ocultas a los lectores de pantalla y el mensaje «Cargando …» sigue anunciándose

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide movimiento reducido
- **THEN** el esqueleto no se anima

### Requirement: Tabla legible a 360px
Las tablas de los listados SHALL seguir siendo legibles en una ventana de 360px: la primera columna no se recorta y el desplazamiento horizontal ocurre dentro de la tarjeta.

#### Scenario: Primera columna fija
- **WHEN** un listado se muestra en una ventana de 360px y hay columnas más allá del borde
- **THEN** la primera columna permanece visible al desplazar la tabla y el resto de la página no se mueve

### Requirement: Pestañas de Flota
Los listados de vehículos, tipos de vehículo y conductores SHALL mostrar las mismas tres pestañas de navegación entre ellos, con la actual marcada.

#### Scenario: Navegar entre listados de flota
- **WHEN** se abre cualquiera de los tres listados de flota
- **THEN** se ven las pestañas «Vehículos», «Tipos de vehículo» y «Conductores», con la del listado abierto marcada como actual

#### Scenario: Rutas sin cambios
- **WHEN** se elige una pestaña
- **THEN** se navega a `/flota/vehiculos`, `/flota/tipos` o `/flota/conductores` y los permisos son los mismos que antes

### Requirement: Formulario por secciones con barra de acciones
Los formularios de alta y edición SHALL agrupar sus campos en secciones con icono y título y SHALL mostrar al final una barra de acciones que avisa de los cambios sin guardar.

#### Scenario: Secciones
- **WHEN** se abre un formulario de alta o edición
- **THEN** los campos están en secciones con un icono y un título de sección, en dos columnas desde 720px

#### Scenario: Cambios sin guardar
- **WHEN** se modifica un campo y no se ha guardado
- **THEN** la barra de acciones muestra «Cambios sin guardar», anunciado como estado, hasta que se guarda

#### Scenario: Barra fija en estrecho
- **WHEN** la ventana mide menos de 720px
- **THEN** la barra de acciones queda fija al pie del área con desplazamiento y el final del formulario sigue siendo alcanzable con su margen

#### Scenario: Acciones intactas
- **WHEN** se pulsa «Guardar» o «Cancelar»
- **THEN** se valida, envía, cancela y se pide confirmación al salir con cambios exactamente como antes
