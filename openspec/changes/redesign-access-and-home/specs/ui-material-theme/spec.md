# Spec Delta

## ADDED Requirements

### Requirement: Riel de navegación
En pantallas anchas el área privada SHALL mostrar un riel de iconos fijo con la marca arriba y una entrada por área, cada una con su icono y un nombre corto debajo, y SHALL marcar la entrada activa de forma que no dependa solo del color.

#### Scenario: Entradas
- **WHEN** una persona con rol `tenant_admin` o `super_admin` abre una pantalla del área privada con la ventana de 960px o más
- **THEN** el riel muestra Inicio, Flota, Lugares, Zonas, Paquetes, Jornadas y «Config.», cada una como enlace a su ruta salvo Flota

#### Scenario: Nombre accesible completo
- **WHEN** el nombre visible de una entrada está abreviado («Config.»)
- **THEN** su nombre accesible es el completo («Configuraciones»)

#### Scenario: Flota con menú
- **WHEN** la persona activa «Flota»
- **THEN** se abre un menú con «Vehículos», «Tipos de vehículo» y «Conductores», cada uno con su icono y su enlace, y el botón anuncia que abre un menú

#### Scenario: Entrada activa
- **WHEN** la ruta actual corresponde a una entrada, o a una pantalla de la sección de Flota
- **THEN** la entrada se marca con un fondo propio, una barra de 4px con el degradado de la marca y el atributo de página actual

#### Scenario: Marca
- **WHEN** se muestra el riel
- **THEN** arriba lleva solo el emblema de la marca, enlazado a `/`, y el nombre sigue disponible para lectores de pantalla

### Requirement: Búsqueda en la barra superior
La barra superior de las pantallas anchas SHALL incluir un campo «Buscar o ir a…» que encuentra las pantallas que el rol puede abrir y las acciones principales, sin consultar el gateway.

#### Scenario: Forma y tamaño
- **WHEN** se muestra la barra
- **THEN** el campo es una píldora de 44px de alto, con su nombre accesible en español, el atajo declarado (`Control+K`) y la pista «Ctrl K» decorativa, y todo su alto es objetivo táctil

#### Scenario: Qué ofrece
- **WHEN** la persona enfoca el campo sin escribir
- **THEN** se despliega una lista agrupada en «Ir a» (las pantallas de su rol) y «Acciones» (planificar jornada, nuevo paquete e importar paquetes, solo si su rol opera), con el ancho de la píldora y justo debajo de ella

#### Scenario: Filtro
- **WHEN** escribe
- **THEN** la lista se filtra sin distinguir mayúsculas ni tildes («vehiculos» encuentra «Vehículos»), un grupo sin coincidencias desaparece y, si no queda nada, se lee «Sin resultados»

#### Scenario: Elegir
- **WHEN** elige una opción con el ratón o con el teclado (flechas y Enter)
- **THEN** va a su pantalla, el campo queda vacío y sin foco

#### Scenario: Atajo
- **WHEN** pulsa Ctrl K (o Cmd K) en cualquier pantalla del área privada ancha
- **THEN** el foco pasa al campo y no actúa el atajo del navegador; en pantallas estrechas no hay búsqueda y el atajo no hace nada

#### Scenario: Roles
- **WHEN** quien busca es un agente o un conductor
- **THEN** solo encuentra lo que su rol puede abrir

### Requirement: Tipografía de marca
Los titulares, las cifras y los nombres destacados de la aplicación SHALL usar Manrope y el resto del texto, Roboto.

#### Scenario: Familias
- **WHEN** se inspecciona un titular de pantalla, una cifra de Inicio o el nombre de una jornada
- **THEN** su familia de fuente es Manrope, y el texto de párrafos, campos y etiquetas sigue en Roboto

#### Scenario: Carga
- **WHEN** se carga la aplicación
- **THEN** Manrope se pide de Google Fonts (único origen externo de fuentes que ya admite la política de seguridad), en pesos 400 a 800, junto con Roboto 300 a 500

### Requirement: Selector de tema en la barra superior
La barra superior del área privada SHALL incluir el selector de tema, antes del avatar, y SHALL medir 44px de alto en pantallas anchas y estrechas.

#### Scenario: Ubicación
- **WHEN** una persona con sesión abre cualquier pantalla del área privada
- **THEN** la barra superior muestra el selector de tema (tres botones de icono seguidos, Sistema, Claro y Oscuro, con la elección actual marcada) antes del avatar

#### Scenario: Se mantiene al navegar
- **WHEN** la persona elige un tema y navega a otra pantalla
- **THEN** el tema elegido se mantiene

#### Scenario: Cabe en 360px
- **WHEN** la ventana mide 360px de ancho
- **THEN** la barra muestra el botón de menú, el emblema de la marca, el selector de tema y el avatar sin desborde horizontal; la marca pierde su nombre por debajo de 480px, que sigue disponible para lectores de pantalla

### Requirement: Área con desplazamiento completa
El área con desplazamiento del área privada SHALL medir el alto disponible incluyendo su relleno, de modo que el final de cada pantalla, con su margen inferior, pueda verse.

#### Scenario: Final de la pantalla
- **WHEN** una pantalla es más alta que la ventana y la persona se desplaza hasta el final
- **THEN** el último elemento queda entero a la vista, con el margen inferior del área, sin recortes

#### Scenario: Cabe en la ventana
- **WHEN** se mide el área con desplazamiento
- **THEN** su borde inferior no sobrepasa el del contenedor de la navegación ni el de la ventana

## MODIFIED Requirements

### Requirement: Layout base
La aplicación SHALL mostrar, en el área autenticada, un riel de iconos fijo (pantallas anchas) o un menú desplegable (pantallas estrechas), una barra superior con el título de la pantalla, la búsqueda, el selector de tema y el avatar, y el contenido enrutado en un área centrada con ancho máximo.

#### Scenario: Pantalla ancha
- **WHEN** el ancho de la ventana es al menos 960px
- **THEN** el riel de iconos se muestra fijo junto al contenido y la barra superior muestra el título de la pantalla, la búsqueda, el selector de tema y el avatar

#### Scenario: Pantalla estrecha
- **WHEN** el ancho de la ventana es menor de 960px
- **THEN** el riel y la búsqueda no se muestran y el menú de navegación se abre con un botón de la barra superior, que muestra la marca, el selector de tema y el avatar

#### Scenario: Navegación
- **WHEN** el usuario pulsa una entrada del riel o del menú desplegable
- **THEN** el contenido enrutado cambia y la entrada queda marcada como activa; en pantallas estrechas el menú se cierra

#### Scenario: Pantallas sin sesión
- **WHEN** se muestra una pantalla de acceso
- **THEN** no se muestran la barra superior ni la navegación del área autenticada

#### Scenario: Marca y persona
- **WHEN** se muestra el área autenticada
- **THEN** la marca de la aplicación está en el riel (o en la barra, en pantallas estrechas) y la barra superior muestra un avatar con las iniciales de la persona y el degradado de la marca, que abre su menú de usuario

#### Scenario: Elemento activo visible
- **WHEN** una entrada de la navegación corresponde a la ruta actual
- **THEN** se marca como activa con un fondo propio y con el atributo de página actual, no solo con el peso de la letra

### Requirement: Menú por secciones y rol
La navegación (riel y menú desplegable) SHALL agrupar las entradas por secciones de negocio y SHALL mostrar a cada persona solo las entradas de las rutas a las que su rol da acceso.

#### Scenario: Administrador
- **WHEN** un usuario `tenant_admin` o `super_admin` abre el área autenticada
- **THEN** la navegación muestra "Inicio", la sección "Flota" con "Vehículos", "Tipos de vehículo" y "Conductores" (en el riel, como un menú de la entrada «Flota»), y las entradas "Lugares", "Zonas", "Paquetes", "Jornadas" y "Configuraciones"

#### Scenario: Otros roles
- **WHEN** un usuario `agent` o `driver` abre el área autenticada
- **THEN** la navegación muestra "Inicio", no muestra la sección "Flota" ni las entradas "Lugares", "Zonas" y "Configuraciones", y muestra "Paquetes" y "Jornadas" solo al agente

#### Scenario: Elemento activo en una sección
- **WHEN** la ruta actual es una pantalla de la sección o una de sus subrutas (por ejemplo la edición de un vehículo, de un lugar, de una zona o de un paquete, o el detalle de una jornada)
- **THEN** la entrada correspondiente de la navegación se marca como activa, y «Flota» lo está en cualquiera de sus tres pantallas

#### Scenario: Sin sesión cargada
- **WHEN** el usuario aún no está disponible durante el render en servidor
- **THEN** la navegación muestra solo las entradas visibles para cualquier rol y no falla
