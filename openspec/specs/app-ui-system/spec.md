# app-ui-system Specification

## Purpose
Define el sistema de interfaz común de toda la aplicación: un mismo tema claro y oscuro, las superficies, el estilo de página, las etiquetas de estado y los estados vacío y de error, para que todas las pantallas tengan la misma línea de diseño.

## Requirements

### Requirement: Tema claro y oscuro en toda la aplicación
Toda la aplicación SHALL mostrarse en tema claro u oscuro según la preferencia del sistema de la persona, con un único tema definido una sola vez.

#### Scenario: Preferencia oscura
- **WHEN** el sistema tiene el tema oscuro y se abre cualquier pantalla de la aplicación, con o sin sesión
- **THEN** la pantalla se muestra con fondos, superficies, textos y controles en tonos oscuros

#### Scenario: Preferencia clara
- **WHEN** el sistema tiene el tema claro
- **THEN** la pantalla se muestra en tonos claros

#### Scenario: Cambio de preferencia
- **WHEN** la persona cambia el tema del sistema con la aplicación abierta
- **THEN** toda la interfaz cambia de tema sin recargar

#### Scenario: Una sola definición
- **WHEN** se inspeccionan los estilos globales y los de los componentes
- **THEN** el tema está definido una única vez y ninguna pantalla ni vista lo redefine

### Requirement: Superficies y estilo de página comunes
Las pantallas del área autenticada SHALL presentar su contenido en un contenedor centrado con ancho máximo y en superficies redondeadas con borde suave, con los mismos espaciados y la misma jerarquía de títulos.

#### Scenario: Ancho máximo
- **WHEN** la ventana es mucho más ancha que el contenido
- **THEN** el contenido se centra con un ancho máximo y no ocupa todo el ancho de la pantalla

#### Scenario: Jerarquía de títulos
- **WHEN** se abre cualquier pantalla del área autenticada
- **THEN** tiene un único título de primer nivel con el mismo tamaño y separación, y las secciones se titulan con encabezados de segundo nivel

#### Scenario: Superficies
- **WHEN** una pantalla agrupa información (resumen, tabla, formulario, mapa)
- **THEN** cada grupo se muestra en una superficie con las mismas esquinas, borde y relleno

#### Scenario: Estilo sin duplicar
- **WHEN** se inspeccionan los componentes de las pantallas
- **THEN** ninguno declara por su cuenta el estilo del título, del resumen ni de la superficie: lo toman del sistema común

### Requirement: Etiquetas de estado
Los estados de paquetes, jornadas y visitas SHALL mostrarse como etiquetas con icono y texto en español, con un tono que refuerza su significado sin ser la única señal.

#### Scenario: Icono y texto
- **WHEN** una tabla o ficha muestra un estado
- **THEN** la etiqueta lleva un icono y el nombre del estado en español, de modo que se entiende sin distinguir colores

#### Scenario: Tono por significado
- **WHEN** se comparan un estado resuelto, uno pendiente y uno cancelado o fallido
- **THEN** cada uno usa un tono distinto del tema, también en tema oscuro

#### Scenario: Estado desconocido
- **WHEN** un paquete o jornada trae un estado que la aplicación no conoce
- **THEN** la etiqueta muestra la clave tal cual con un tono neutro

#### Scenario: Lectores de pantalla
- **WHEN** un lector de pantalla recorre la etiqueta
- **THEN** anuncia solo el nombre del estado y ignora el icono

### Requirement: Estados vacío, de carga y de error con icono
Los estados de carga, vacío y error de las pantallas SHALL mostrarse en un bloque centrado con icono, mensaje y, cuando proceda, la acción, y SHALL anunciarse a los lectores de pantalla.

#### Scenario: Vacío
- **WHEN** una lista no tiene registros
- **THEN** se muestra un bloque con icono, el mensaje y la acción para crear el primero

#### Scenario: Error
- **WHEN** falla una carga
- **THEN** se muestra un bloque con icono, el mensaje del error y «Reintentar», anunciado como alerta

#### Scenario: Carga
- **WHEN** una lista está cargando
- **THEN** se muestra un indicador de progreso con nombre accesible y el mensaje de carga

### Requirement: Contraste y movimiento en toda la aplicación
El texto y los controles de toda la aplicación SHALL tener contraste suficiente en tema claro y oscuro, y cualquier transición SHALL ser breve y desactivarse con movimiento reducido.

#### Scenario: Texto y etiquetas de estado
- **WHEN** se mide el texto de cuerpo, de tablas, de formularios y de las etiquetas de estado frente a su fondo
- **THEN** la relación de contraste es de al menos 4,5 a 1 en ambos temas

#### Scenario: Controles y foco
- **WHEN** se miden el borde de los campos y el indicador de foco
- **THEN** la relación de contraste es de al menos 3 a 1 en ambos temas

#### Scenario: Movimiento reducido
- **WHEN** el sistema pide movimiento reducido
- **THEN** no hay transiciones ni animaciones en la interfaz

### Requirement: Pantallas estrechas
Todas las pantallas SHALL poder usarse en un ancho de 360px sin desplazamiento horizontal de la página, con las tablas desplazables dentro de su superficie.

#### Scenario: 360px
- **WHEN** se abre cualquier pantalla con una ventana de 360px
- **THEN** la página no se desplaza en horizontal y los controles son alcanzables

#### Scenario: Tabla ancha
- **WHEN** una tabla es más ancha que la ventana
- **THEN** se desplaza en horizontal dentro de su tarjeta y el resto de la página no se mueve

#### Scenario: Formulario en una columna
- **WHEN** la ventana es estrecha
- **THEN** los campos de un formulario se muestran en una sola columna
