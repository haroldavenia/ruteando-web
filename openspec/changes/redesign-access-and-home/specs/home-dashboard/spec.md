# Spec Delta

## ADDED Requirements

### Requirement: Cabecera con acciones principales
La página de inicio SHALL abrir con una cabecera que contiene la fecha, el saludo, un resumen y, para quienes operan jornadas y paquetes, las dos acciones principales: planificar una jornada e importar paquetes.

#### Scenario: Administración y agentes
- **WHEN** una persona con rol `tenant_admin`, `super_admin` o `agent` abre `/`
- **THEN** la cabecera ofrece «Planificar jornada», que lleva a `/jornadas/nueva`, e «Importar paquetes», que lleva a `/paquetes/importar`, una al lado de la otra cuando caben

#### Scenario: Rol sin esas áreas
- **WHEN** una persona con rol `driver` abre `/`
- **THEN** la cabecera muestra la fecha, el saludo y el resumen, sin acciones

#### Scenario: Tamaño y forma
- **WHEN** se muestran las acciones
- **THEN** miden 48px de alto y tienen esquinas de 12px, y «Planificar jornada» lleva un icono decorativo oculto a lectores de pantalla

#### Scenario: Acción principal con el hilo de la marca
- **WHEN** se muestran las acciones
- **THEN** «Planificar jornada» lleva el degradado de la marca e «Importar paquetes» solo contorno

#### Scenario: Mapa de la ciudad decorativo
- **WHEN** la ventana mide 720px de ancho o más
- **THEN** la cabecera muestra a la derecha un mapa de ciudad con tres rutas de paradas numeradas, en su propia columna, que se funde con el tinte de la cabecera, sin quedar nunca debajo del texto ni de un botón, oculto a lectores de pantalla y sin nada enfocable

#### Scenario: Pantalla estrecha
- **WHEN** la ventana mide menos de 720px de ancho
- **THEN** el mapa no se muestra y cada acción ocupa su fila si mide menos de 480px

#### Scenario: Orden de lectura
- **WHEN** un lector de pantalla recorre la cabecera
- **THEN** encuentra la fecha, el saludo, el resumen y las acciones antes que el mapa

#### Scenario: Legibilidad en los dos temas
- **WHEN** se mide el texto de la cabecera frente a su fondo, en tema claro y oscuro
- **THEN** la relación de contraste es de al menos 4,5 a 1

### Requirement: Saludo, fecha y resumen
La cabecera de la página de inicio SHALL saludar según la hora local con el nombre de la persona (o su correo si no tiene nombre), mostrar la fecha de hoy y resumir lo que ya se sabe de las jornadas y los paquetes sin inventar datos.

#### Scenario: Saludo según la hora
- **WHEN** una persona con sesión abre `/` por la mañana, por la tarde o por la noche
- **THEN** el único encabezado de primer nivel dice «Buenos días», «Buenas tardes» o «Buenas noches» seguido de su nombre

#### Scenario: Fecha
- **WHEN** se abre `/`
- **THEN** sobre el saludo se lee la fecha de hoy con el día de la semana y sin coma («viernes 30 de octubre»), mostrada en mayúsculas con espaciado entre letras solo con estilos

#### Scenario: Resumen con datos reales
- **WHEN** ya llegaron las jornadas o los paquetes
- **THEN** la frase dice cuántas de las últimas jornadas están en curso y cuántos paquetes esperan ruta (concordando singular y plural, y aclarando «entre los más recientes» si los paquetes son una parte del total)

#### Scenario: Sin datos
- **WHEN** no hay jornadas en curso ni paquetes pendientes, o los datos todavía no llegaron
- **THEN** la frase es «Planificación de rutas.»

#### Scenario: Tipografía de marca
- **WHEN** se inspecciona el saludo
- **THEN** usa la fuente de marca (Manrope) con peso 800

### Requirement: Detalle de las últimas jornadas
Cada jornada de la página de inicio SHALL mostrar, junto a su nombre y estado, una línea con los servicios y vehículos que el listado informe y su fecha de creación, y SHALL usar un enlace destacado para el nombre.

#### Scenario: Con totales
- **WHEN** el listado informa los servicios y los vehículos de una jornada
- **THEN** se muestran con su singular o plural («1 servicio · 3 vehículos») antes de la fecha de creación, y un cero también se muestra

#### Scenario: Sin totales
- **WHEN** el listado no informa los servicios o los vehículos
- **THEN** la línea muestra solo la fecha de creación, sin «—» ni textos vacíos

#### Scenario: Filas alineadas
- **WHEN** se muestra una jornada
- **THEN** el nombre y su detalle van uno bajo el otro a la izquierda y la etiqueta de estado a la derecha, en las mismas columnas de una jornada a otra

#### Scenario: Enlaces
- **WHEN** se muestran los nombres de las jornadas
- **THEN** son enlaces de al menos 44px de alto, en negrita con la fuente de marca, subrayados y con indicador de foco, no con el azul del navegador

#### Scenario: Peticiones
- **WHEN** una persona que opera jornadas abre la página de inicio
- **THEN** se piden las últimas jornadas y, para las cifras, una página de paquetes (ver «Cifras de paquetes»), y ninguna petición más

### Requirement: Cifras de paquetes
La página de inicio SHALL mostrar, a quienes operan jornadas y paquetes, el porcentaje de paquetes atendidos en un anillo con su leyenda y las cifras de paquetes pendientes y sin atender, calculadas con una sola petición de los paquetes más recientes, y SHALL decir siempre sobre cuántos paquetes están calculadas.

#### Scenario: Una sola petición
- **WHEN** un administrador o un agente abre `/`
- **THEN** se pide una sola página, la primera, con los 100 paquetes más recientes, sin recorrer las demás páginas ni pedir un estado concreto

#### Scenario: Anillo y frase
- **WHEN** llegan los paquetes
- **THEN** el anillo muestra el porcentaje de atendidos y debajo se lee «N de M paquetes»; si hay más paquetes que los pedidos, se aclara «(los más recientes de T)» con el total

#### Scenario: Leyenda
- **WHEN** hay paquetes
- **THEN** bajo la frase se leen «N pendientes» y «N sin atender», cada una con un punto de color que no es la única señal

#### Scenario: Cifras sueltas
- **WHEN** hay paquetes
- **THEN** se muestran «Pendientes de ruta» y «Sin atender» con su cifra en la fuente de marca y un icono decorativo, y la de sin atender se distingue como aviso

#### Scenario: Sin paquetes
- **WHEN** no hay ningún paquete
- **THEN** se dice «Todavía no hay paquetes», se ofrece crear el primero y no se muestran cifras sueltas

#### Scenario: Cargando y error
- **WHEN** las cifras todavía no han llegado o la petición falla
- **THEN** se muestra un indicador de carga accesible o el mensaje del error con «Reintentar», y las jornadas, la cabecera y el resto de la página no se ven afectados

#### Scenario: Roles sin acceso y servidor
- **WHEN** quien abre `/` es un conductor, o la página se renderiza en el servidor
- **THEN** no se piden paquetes ni se muestra la tarjeta

#### Scenario: Contraste
- **WHEN** se mide el texto de las cifras frente a su fondo
- **THEN** la relación de contraste es de al menos 4,5 a 1 en el tema claro y en el oscuro

### Requirement: Inicio con cabecera y tarjetas
La página de inicio SHALL presentar la cabecera con el mapa de la ciudad, las cifras de paquetes y las últimas jornadas en tarjetas, con la misma línea de diseño que el resto de la aplicación.

#### Scenario: Composición
- **WHEN** la ventana mide 1100px de ancho o más
- **THEN** la cabecera y las últimas jornadas ocupan tres cuartas partes del ancho, y a su derecha el anillo de paquetes y las dos cifras sueltas; en pantallas más estrechas todo se apila en una columna

#### Scenario: Últimas jornadas en tarjeta
- **WHEN** el rol puede abrir `/jornadas`
- **THEN** las últimas jornadas se muestran en una tarjeta con el título «Últimas jornadas» en negrita, la acción «Ver todas» a su derecha y la etiqueta de estado de cada una

#### Scenario: Acción «Ver todas»
- **WHEN** se muestra la tarjeta de jornadas
- **THEN** «Ver todas» tiene el nombre accesible «Ver todas las jornadas», mide 48px de alto, tiene esquinas de 12px y lleva a `/jornadas`

#### Scenario: Comportamiento intacto
- **WHEN** se abre la página de inicio
- **THEN** el orden y los estados de carga, vacío y error de las últimas jornadas se comportan igual que antes

## MODIFIED Requirements

### Requirement: Accesos según el rol
La página de inicio SHALL dejar el acceso a cada área que el rol de la persona puede abrir en el riel de navegación y en la búsqueda de la barra superior, con los mismos nombres que el menú, en lugar de mosaicos propios, y SHALL explicar a quien no tiene ninguna área que su rol no la tiene.

#### Scenario: Administración
- **WHEN** una persona con rol `tenant_admin` o `super_admin` abre `/`
- **THEN** el riel ofrece Inicio, Flota, Lugares, Zonas, Paquetes, Jornadas y Configuraciones, y la búsqueda encuentra además Vehículos, Tipos de vehículo y Conductores

#### Scenario: Agente
- **WHEN** una persona con rol `agent` abre `/`
- **THEN** el riel y la búsqueda ofrecen solo Paquetes y Jornadas, además de Inicio

#### Scenario: Rol sin áreas
- **WHEN** una persona con rol `driver` abre `/`
- **THEN** ve un mensaje que explica que su rol no tiene áreas disponibles en la aplicación web y no ve acciones, cifras ni jornadas

#### Scenario: Coherencia con el menú
- **WHEN** se añade o se retira un área de `nav-items` para un rol
- **THEN** el riel, la búsqueda y el menú desplegable reflejan el mismo cambio sin editarse aparte

### Requirement: Últimas jornadas
La página de inicio SHALL mostrar las cinco jornadas más recientes a quienes pueden abrir `/jornadas`, con enlace a su detalle y otro al listado completo.

#### Scenario: Con jornadas
- **WHEN** un agente o administrador abre `/` y el gateway devuelve jornadas
- **THEN** ve, por jornada, el nombre, el estado en español y la fecha de creación en hora local, con un enlace a `/jornadas/:id`, y la acción «Ver todas», cuyo nombre accesible es «Ver todas las jornadas»

#### Scenario: Sin jornadas
- **WHEN** el gateway no devuelve jornadas
- **THEN** ve un mensaje que lo explica y un enlace para planificar la primera

#### Scenario: Cargando
- **WHEN** la lista todavía no ha llegado
- **THEN** ve un indicador de carga accesible y la cabecera ya está disponible

#### Scenario: Error del gateway
- **WHEN** el gateway rechaza la petición o no responde
- **THEN** ve el mensaje del error con un botón «Reintentar» y la cabecera y las cifras siguen funcionando

#### Scenario: Rol sin acceso a jornadas
- **WHEN** quien abre `/` no puede abrir `/jornadas`
- **THEN** no se pide ninguna jornada al gateway

### Requirement: Inicio accesible
La página de inicio SHALL tener un único encabezado de primer nivel y secciones con encabezados propios, y SHALL ser operable solo con teclado.

#### Scenario: Estructura
- **WHEN** se inspecciona la página
- **THEN** tiene un `h1` con el saludo y secciones con `h2` «Paquetes atendidos» y «Últimas jornadas» según el rol

#### Scenario: Teclado
- **WHEN** se recorre con la tecla de tabulación
- **THEN** cada acción y cada enlace de jornada recibe el foco en orden visual y muestra un indicador de foco

## REMOVED Requirements

### Requirement: Inicio con tarjetas
**Reason**: El saludo con el título «Ruteando» y los accesos como mosaicos se sustituyen por la cabecera con fecha, saludo y resumen, el riel de navegación y la búsqueda; lo que seguía vigente (últimas jornadas en tarjeta y comportamiento intacto) pasa a «Inicio con cabecera y tarjetas».
**Migration**: Ver «Cabecera con acciones principales», «Saludo, fecha y resumen», «Inicio con cabecera y tarjetas» y «Accesos según el rol».
