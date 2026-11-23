# Spec Delta

## MODIFIED Requirements

### Requirement: Tema claro y oscuro en toda la aplicación
Toda la aplicación SHALL mostrarse en tema claro u oscuro según la elección de la persona (seguir al sistema, claro u oscuro; por defecto, seguir al sistema), con un único tema definido una sola vez.

#### Scenario: Preferencia oscura
- **WHEN** el sistema tiene el tema oscuro, la persona no ha elegido otro y se abre cualquier pantalla de la aplicación, con o sin sesión
- **THEN** la pantalla se muestra con fondos, superficies, textos y controles en tonos oscuros

#### Scenario: Preferencia clara
- **WHEN** el sistema tiene el tema claro y la persona no ha elegido otro
- **THEN** la pantalla se muestra en tonos claros

#### Scenario: Cambio de preferencia
- **WHEN** la persona sigue al sistema y cambia el tema del sistema con la aplicación abierta
- **THEN** toda la interfaz cambia de tema sin recargar

#### Scenario: Una sola definición
- **WHEN** se inspeccionan los estilos globales y los de los componentes
- **THEN** el tema está definido una única vez y ninguna pantalla ni vista lo redefine: la elección de la persona solo cambia el esquema de color del documento

### Requirement: Etiquetas de estado
Los estados de paquetes, jornadas y visitas SHALL mostrarse como etiquetas con icono y texto en español, con un tono que refuerza su significado sin ser la única señal.

#### Scenario: Icono y texto
- **WHEN** una tabla o ficha muestra un estado
- **THEN** la etiqueta lleva un icono y el nombre del estado en español, de modo que se entiende sin distinguir colores

#### Scenario: Tono por significado
- **WHEN** se comparan un estado resuelto, uno informativo, uno de aviso, uno cancelado o fallido y uno pendiente
- **THEN** cada uno usa un color con su significado (verde, azul, ámbar, rojo y neutro respectivamente), distinto del de la marca, también en tema oscuro

#### Scenario: Contraste de las etiquetas
- **WHEN** se mide el texto de cada etiqueta frente a su fondo
- **THEN** la relación de contraste es de al menos 4,5 a 1 en el tema claro y en el oscuro

#### Scenario: Estado desconocido
- **WHEN** un paquete o jornada trae un estado que la aplicación no conoce
- **THEN** la etiqueta muestra la clave tal cual con un tono neutro

#### Scenario: Lectores de pantalla
- **WHEN** un lector de pantalla recorre la etiqueta
- **THEN** anuncia solo el nombre del estado y ignora el icono

## ADDED Requirements

### Requirement: Colores de estado definidos una vez
Los colores de éxito, información y aviso SHALL definirse una sola vez junto al tema como variables CSS que cambian con el esquema de color, y las pantallas SHALL usarlas en lugar de colores fijos.

#### Scenario: Una sola definición
- **WHEN** se inspeccionan los estilos globales y los de los componentes
- **THEN** los pares de fondo y texto de éxito, información y aviso están definidos una única vez, en `styles.scss`, con un valor para el tema claro y otro para el oscuro

#### Scenario: Cambian con el tema
- **WHEN** cambia entre tema claro y oscuro
- **THEN** cada variable resuelve un color distinto y el par sigue superando 4,5 a 1 de contraste

### Requirement: Selector de tema
La aplicación SHALL ofrecer un selector con las opciones Sistema, Claro y Oscuro, que cambia el tema al instante, recuerda la elección en ese navegador y se aplica antes del primer pintado.

#### Scenario: Opciones
- **WHEN** la persona mira el selector
- **THEN** ve tres botones de icono seguidos, «Tema del sistema», «Tema claro» y «Tema oscuro», que forman un grupo de opciones excluyentes («Tema de color») con la actual marcada, cada uno de al menos 44px de alto y con su nombre accesible

#### Scenario: Elegir claro u oscuro
- **WHEN** la persona elige «Claro» u «Oscuro»
- **THEN** toda la interfaz cambia a ese tema al instante, aunque el sistema tenga el contrario, y la elección se guarda en el navegador

#### Scenario: Elegir sistema
- **WHEN** la persona elige «Sistema»
- **THEN** se olvida la elección guardada y la interfaz vuelve a seguir al sistema, incluidos sus cambios en vivo

#### Scenario: Se recuerda
- **WHEN** la persona recarga la página o vuelve a abrirla con una elección guardada
- **THEN** la interfaz se muestra directamente con ese tema, sin un destello del tema contrario: se aplica con el documento todavía cargando, antes del primer pintado

#### Scenario: Política de seguridad estricta
- **WHEN** el servidor envía la política de seguridad en modo estricto
- **THEN** el tema guardado se aplica igualmente, sin violaciones de la política: el script que lo aplica es un fichero del propio origen y no un script en línea

#### Scenario: Valor guardado no válido o sin almacenamiento
- **WHEN** el valor guardado no es una elección válida, o el almacenamiento del navegador no está disponible
- **THEN** la interfaz sigue al sistema y la elección vale mientras la pestaña siga abierta, sin errores

#### Scenario: Render en servidor
- **WHEN** la aplicación se renderiza en el servidor
- **THEN** no se lee ni se escribe ningún almacenamiento y el render no falla

### Requirement: Hilo de la marca
El degradado de la marca SHALL definirse una sola vez como variable y SHALL usarse solo en el botón principal de los formularios de acceso, en la acción principal de Inicio, en las barras de progreso, en el avatar y en la barra de la entrada activa del riel, y en una palabra destacada de los títulos.

#### Scenario: Una sola definición
- **WHEN** se inspeccionan los estilos
- **THEN** el degradado se define una única vez, con los colores primario y terciario del tema, y los componentes lo usan por su nombre

#### Scenario: Contraste
- **WHEN** se mide el texto sobre cada extremo del degradado
- **THEN** la relación de contraste es de al menos 4,5 a 1 en el tema claro y en el oscuro

#### Scenario: Colores forzados
- **WHEN** el navegador usa colores forzados
- **THEN** la palabra destacada vuelve a texto normal y el botón usa los colores del sistema
