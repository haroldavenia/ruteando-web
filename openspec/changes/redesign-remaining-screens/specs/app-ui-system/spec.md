# Spec Delta

## ADDED Requirements

### Requirement: Controles con tamaño táctil
Los botones, botones de icono, casillas, interruptores, opciones de color y enlaces de fila de las pantallas del área privada SHALL tener una zona accionable de al menos 44px de alto (la zona táctil de Material cuenta), y los botones de relleno, de contorno y de texto SHALL mostrarse de 44px de alto con las esquinas de 12px de acceso e Inicio, todo definido una sola vez con los tokens del tema.

#### Scenario: Botones de página
- **WHEN** se mide un botón de relleno, de contorno o de texto de cualquier pantalla del área privada
- **THEN** mide 44px de alto y sus esquinas son de 12px

#### Scenario: Acciones de fila
- **WHEN** se mide un botón de icono o el enlace con el nombre de un registro en un listado
- **THEN** su zona accionable mide al menos 44px de alto

#### Scenario: Una sola definición
- **WHEN** se inspeccionan los estilos globales y los de los componentes
- **THEN** la altura de los controles está definida una vez y los componentes no la repiten

### Requirement: Campos con contorno en toda la aplicación
Los campos de formulario y de filtro de toda la aplicación SHALL tener contorno y esquinas de 12px, con el mismo aspecto en las pantallas de acceso y en el área privada.

#### Scenario: Formulario del área privada
- **WHEN** se abre un formulario o un filtro de tabla del área privada
- **THEN** sus campos tienen contorno y esquinas de 12px

#### Scenario: Acceso sin cambios
- **WHEN** se abre una pantalla de acceso
- **THEN** sus campos conservan el contorno, las esquinas de 12px y la altura de botón de 48px

### Requirement: Acción principal de cada pantalla
Cada pantalla del área privada SHALL tener como máximo una acción principal, con el hilo de la marca, y las demás acciones SHALL ser secundarias.

#### Scenario: Una sola acción principal
- **WHEN** se abre un listado con varias acciones en su cabecera (por ejemplo, importar, exportar y crear)
- **THEN** solo la de crear lleva el degradado de la marca y las demás son de contorno

#### Scenario: Contraste del texto
- **WHEN** se mide el texto de la acción principal frente al degradado
- **THEN** la relación de contraste es de al menos 4,5 a 1 en los dos extremos y en ambos temas

### Requirement: Avisos de resultado con tono
Los resultados de un envío o de un borrado SHALL mostrarse como un aviso con icono y un tono que refuerza su significado sin ser la única señal, y SHALL anunciarse a los lectores de pantalla sin mover el foco.

#### Scenario: Error
- **WHEN** falla un envío o un borrado
- **THEN** el aviso usa el contenedor de error con su icono y el mensaje en español, anunciado como alerta

#### Scenario: Confirmación
- **WHEN** un envío o un borrado termina bien
- **THEN** el aviso usa el tono de éxito con su icono, anunciado como estado

#### Scenario: Regiones siempre presentes
- **WHEN** no hay resultado que mostrar
- **THEN** las dos regiones de aviso existen vacías y no ocupan espacio

### Requirement: Acciones de solo icono con título
Todo botón o enlace que muestre solo un icono SHALL llevar un `title` con lo que hace, igual que su nombre accesible, para que al pasar el cursor por encima se sepa para qué sirve aunque no haya texto cerca.

#### Scenario: Acciones de fila
- **WHEN** se pasa el cursor por el icono de editar, eliminar, ver o cambiar el estado de un registro
- **THEN** aparece un título que nombra la acción y el registro (por ejemplo, «Editar lugar Depósito norte»)

#### Scenario: Mismo texto que el nombre accesible
- **WHEN** se compara el título de un botón de icono con su nombre accesible
- **THEN** son el mismo texto, y si el nombre cambia (una fila que se actualiza) el título cambia con él

#### Scenario: Otros controles de icono
- **WHEN** se pasa el cursor por el menú de navegación, la cuenta, el ojo de la contraseña, los botones del selector de tema o el zoom de un mapa
- **THEN** cada uno muestra un título en español («Tema oscuro», «Mostrar contraseña», «Acercar el mapa»…)

#### Scenario: Paginador
- **WHEN** se pasa el cursor por los botones de página anterior y siguiente de una tabla
- **THEN** se muestra su tooltip de Material con «Página anterior» o «Página siguiente»

### Requirement: Pantalla sin permiso
La pantalla «Sin permiso» SHALL mostrar un panel con icono, el motivo, el rol de la sesión y una acción para volver al inicio, y SHALL llevar su título en la barra.

#### Scenario: Panel
- **WHEN** una persona sin el rol requerido abre un área restringida
- **THEN** es llevada a «Sin permiso», donde ve el texto «No tienes permiso para ver esta página.», su rol y el botón «Volver al inicio»

#### Scenario: Barra
- **WHEN** se muestra «Sin permiso» dentro del área privada
- **THEN** la barra muestra el título «Sin permiso» y ninguna entrada del riel queda como activa

### Requirement: Tablas que se apilan en una caja estrecha
Una tabla de datos SHALL no obligar a desplazarla en horizontal dentro de su tarjeta en una pantalla estrecha: cuando la caja que la contiene mide menos de 840px, cada fila SHALL pasar a ser un bloque con el primer dato como título, cada dato con su encabezado como etiqueta, y las acciones al final. La decisión depende de la caja que contiene la tabla y no de la ventana, y el marcado SHALL seguir siendo una tabla con sus roles.

#### Scenario: Listados en el teléfono
- **WHEN** se abre un listado (vehículos, tipos, conductores, paquetes, lugares, zonas, configuraciones o jornadas) en una ventana de 320 a 719px
- **THEN** cada registro es un bloque con su nombre como título, los demás datos con su etiqueta y las acciones a la derecha al final, y ni la página ni la tabla se desplazan en horizontal

#### Scenario: Datos vacíos
- **WHEN** un registro no tiene valor en una columna
- **THEN** ese dato no ocupa un hueco con solo su etiqueta

#### Scenario: Tabla ancha
- **WHEN** la caja de la tabla mide 840px o más
- **THEN** sigue siendo una tabla con su cabecera y, en los listados, su primera columna fija al desplazar

#### Scenario: Misma tabla en otra caja
- **WHEN** la misma tabla está en una columna estrecha de una ventana ancha (junto a un mapa)
- **THEN** se apila igual, porque cuenta el ancho de su caja

#### Scenario: Lectores de pantalla
- **WHEN** las filas se apilan
- **THEN** la tabla, sus filas y sus celdas conservan su rol y su encabezado, solo oculto a la vista

#### Scenario: Otras tablas
- **WHEN** se abren las paradas de una ruta, las visitas de una ruta, las tablas de la importación de paquetes o el selector de paquetes de planificar en una ventana estrecha
- **THEN** se apilan igual y no obligan a desplazar nada

### Requirement: Botón de vuelta
El acceso de vuelta al listado o a la jornada que muestran los formularios y los detalles SHALL ser un botón de contorno, sin fondo y de 44px de alto, con una flecha y el nombre del destino, y SHALL seguir siendo un enlace a esa ruta.

#### Scenario: Aspecto
- **WHEN** se abre un formulario o un detalle (por ejemplo, «Nuevo lugar» o una jornada)
- **THEN** sobre el título se ve un botón con borde, sin relleno, con la flecha y el nombre del listado («Lugares», «Jornadas»), con las esquinas y el color de los demás botones de contorno en claro y en oscuro

#### Scenario: Sigue siendo un enlace
- **WHEN** se pulsa o se enfoca con el teclado
- **THEN** navega a la ruta del listado y su nombre accesible es el del destino
