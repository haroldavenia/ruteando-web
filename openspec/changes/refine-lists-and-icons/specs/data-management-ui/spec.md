# Spec Delta

## ADDED Requirements

### Requirement: Listado entero en el cliente
Los listados de paquetes, jornadas, vehículos y lugares SHALL traer todos los registros (páginas de 100, hasta 1000) para que la búsqueda, los chips de estado y la paginación actúen sobre todos y no solo sobre la página que se ve; si el gateway informa más de 1000, SHALL avisarlo y trabajar con los primeros 1000.

#### Scenario: Carga completa
- **WHEN** se abre un listado con 250 registros
- **THEN** se piden las páginas 0, 1 y 2 de 100 en 100 y la tabla pagina en el navegador sobre los 250

#### Scenario: Más registros que el tope
- **WHEN** el gateway informa 1340 registros
- **THEN** se traen 1000, la tabla dice «Se muestran los primeros 1000 … de 1340» y los demás listados (zonas, configuraciones, tipos y conductores) siguen paginando desde el servidor, con su búsqueda de «esta página»

#### Scenario: Un fallo en una página
- **WHEN** falla una de las peticiones
- **THEN** la tabla muestra el error en español con «Reintentar», que vuelve a pedir todo desde la primera página

### Requirement: Búsqueda, densidad y atajo
Cada tabla SHALL tener un campo de búsqueda de 44px con la pista de lo que busca y la tecla `/`, que lleva el foco al campo salvo que ya se escriba en otro campo o se pulse con Ctrl, Alt o Meta, y un alternador de densidad (cómoda y compacta) que se recuerda en el navegador.

#### Scenario: Atajo
- **WHEN** se pulsa `/` fuera de un campo de texto
- **THEN** el foco pasa al campo de búsqueda y la tecla no se escribe

#### Scenario: Densidad
- **WHEN** se elige filas compactas
- **THEN** las filas pasan de 56px a 44px (nunca menos de 44px), las tarjetas apiladas se aprietan, el botón queda marcado como pulsado y la elección se recuerda al volver

### Requirement: Chips de estado con recuento
Un listado entero en el cliente SHALL ofrecer chips de estado: «Todos» y un chip por cada estado que tenga filas, con su recuento sobre lo que cumple la búsqueda, y SHALL filtrar todas las filas al elegir uno; un estado que la aplicación no conoce tiene su chip con su clave.

#### Scenario: Recuento
- **WHEN** hay 4 paquetes (1 pendiente, 2 atendidos y 1 cancelado)
- **THEN** los chips dicen «Todos 4», «Pendiente 1», «Atendido 2» y «Cancelado 1» y el elegido está marcado como pulsado

#### Scenario: Chip y búsqueda a la vez
- **WHEN** hay un chip elegido y se escribe una búsqueda
- **THEN** la tabla muestra las filas que cumplen ambos y los recuentos siguen a la búsqueda

#### Scenario: Sin coincidencias
- **WHEN** no hay filas que cumplan chip y búsqueda
- **THEN** la tabla dice «No hay resultados» y «Limpiar búsqueda» quita la búsqueda y el chip

### Requirement: Selección con barra de acciones
Una tabla con selección SHALL ofrecer una casilla por fila (con el nombre de la fila para los lectores de pantalla), una casilla en la cabecera que elige las filas que se ven y, con filas elegidas, una barra pegada al pie de la ventana con cuántas hay, las acciones que aporte la pantalla y «Quitar la selección».

#### Scenario: Elegir filas
- **WHEN** se eligen dos filas
- **THEN** aparece la barra con «2 seleccionados», las filas se tiñen y la selección sobrevive al cambiar de página

#### Scenario: Tarjetas apiladas
- **WHEN** la tabla se apila por falta de ancho
- **THEN** la casilla es la primera línea de cada tarjeta, con su texto «Seleccionar»

### Requirement: Acciones de fila discretas
Con un puntero que se pasa por encima y la tabla ancha, las acciones de una fila SHALL mostrarse al pasar el cursor, al enfocar con el teclado, en las filas elegidas y mientras su menú está abierto; con pantalla táctil o con las filas apiladas SHALL verse siempre.

#### Scenario: Teclado
- **WHEN** se llega con el tabulador a una acción oculta de una fila
- **THEN** las acciones de esa fila se muestran
