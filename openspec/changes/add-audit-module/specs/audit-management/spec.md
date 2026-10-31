## Purpose

Permite consultar la auditoría de la empresa: qué se hizo, quién lo hizo y cuándo, con filtros, un detalle que muestra qué valores cambiaron y enlaces a lo afectado. Es de solo lectura y se apoya en los cuatro endpoints de audit-logs del gateway.

## ADDED Requirements

### Requirement: Rutas y permisos de auditoría
La pantalla de auditoría SHALL estar en `/auditoria` y SHALL ser accesible solo con sesión iniciada y rol `tenant_admin`, `super_admin` o `agent`. Es una sola pantalla: el detalle de un evento es una modal, no otra ruta.

#### Scenario: Ruta disponible
- **WHEN** una persona con alguno de esos roles abre `/auditoria`
- **THEN** ve el listado de eventos

#### Scenario: Rol sin permiso
- **WHEN** una persona con rol `driver` abre `/auditoria`
- **THEN** es llevada a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** una persona anónima abre `/auditoria`
- **THEN** es llevada a `/acceso` con la ruta pedida como destino posterior

#### Scenario: Entrada del menú
- **WHEN** una persona con rol `tenant_admin`, `super_admin` o `agent` abre la aplicación
- **THEN** el menú lateral y el riel de iconos incluyen «Auditoría», y la búsqueda global la ofrece

### Requirement: Ámbitos de consulta según el rol
El listado SHALL ofrecer los ámbitos que el rol puede consultar y SHALL abrir en el más amplio de ellos: «Mi empresa» (eventos de la empresa) para `tenant_admin`, «Todas las empresas» para `super_admin` y «Mi actividad» (eventos de la propia persona) para `agent`. `tenant_admin` y `super_admin` SHALL poder cambiar además a «Mi actividad». El ámbito SHALL ser visible y accesible como grupo de opciones con una sola elegida, y SHALL omitirse cuando el rol tiene uno solo.

#### Scenario: Administrador de empresa
- **WHEN** una persona con rol `tenant_admin` abre `/auditoria`
- **THEN** ve los eventos de su empresa con «Mi empresa» elegido y puede cambiar a «Mi actividad»

#### Scenario: Agente
- **WHEN** una persona con rol `agent` abre `/auditoria`
- **THEN** ve solo sus propios eventos, el título es «Mi actividad» y no hay selector de ámbito

#### Scenario: Superadministrador
- **WHEN** una persona con rol `super_admin` abre `/auditoria`
- **THEN** ve los eventos de todas las empresas con «Todas las empresas» elegido, un campo opcional para limitarlos a una empresa por su identificador, y puede cambiar a «Mi actividad»

#### Scenario: Limitar a una empresa
- **WHEN** el `super_admin` escribe el identificador de una empresa y aplica
- **THEN** el listado se vuelve a pedir limitado a esa empresa y el identificador queda en la dirección de la página

#### Scenario: Ámbito pedido sin permiso
- **WHEN** la dirección pide un ámbito que el rol no puede consultar
- **THEN** se ignora y se abre el ámbito por defecto de su rol

### Requirement: Carga completa de los eventos
El listado SHALL traer todos los eventos del ámbito en páginas de 100, hasta un máximo de 1000, para que la búsqueda, los filtros, los recuentos y el panel de actividad sean ciertos sobre todo lo traído, y SHALL mostrarlos del más reciente al más antiguo. Si el gateway informa más eventos de los traídos, SHALL decir cuántos se muestran y cuántos hay.

#### Scenario: Pocos eventos
- **WHEN** el ámbito tiene 26 eventos
- **THEN** se piden las páginas necesarias y el listado muestra los 26, el más reciente primero

#### Scenario: Más eventos que el tope
- **WHEN** el gateway informa 1500 eventos
- **THEN** el listado trabaja con los 1 000 más recientes y avisa «Se muestran los 1000 eventos más recientes de 1500»

#### Scenario: Cambio de ámbito
- **WHEN** la persona cambia de ámbito
- **THEN** se cancela la carga anterior, se muestra el estado de carga y los filtros se conservan

#### Scenario: Actualizar
- **WHEN** la persona pulsa «Actualizar»
- **THEN** se vuelven a pedir los eventos del ámbito y se muestra cuándo se actualizó por última vez

### Requirement: Listado de eventos
El listado SHALL mostrar de cada evento solo lo esencial —qué se hizo, quién y cuándo—, con los valores de dominio en español, y SHALL ofrecer vista de tabla y de tarjetas con densidad ajustable. Todo lo demás (la descripción, a qué afectó, qué cambió, claves e identificadores) SHALL estar en la modal de detalle, que se abre con el ojo de cada fila o con la tarjeta.

#### Scenario: Columnas de la tabla
- **WHEN** la persona abre `/auditoria` con eventos y elige la vista de tabla
- **THEN** cada fila muestra la acción como etiqueta («Jornada eliminada»), quién la hizo (correo y rol en español), cuándo (fecha y hora locales) y un ojo con el nombre accesible «Ver el detalle de «…» de …», siempre visible aunque el cursor no pase por la fila

#### Scenario: Tarjeta
- **WHEN** la persona elige la vista de tarjetas
- **THEN** cada tarjeta muestra la acción como etiqueta, «hace 3 h» (con la fecha y hora exactas al enfocarlo), quién y el tipo de entidad («Jornada»), y toda ella abre la modal de detalle

#### Scenario: Sin descripción ni identificadores
- **WHEN** un evento trae descripción e identificadores largos
- **THEN** ni la tabla ni la tarjeta los muestran; están en la modal

#### Scenario: Acción desconocida
- **WHEN** el gateway devuelve una acción o un tipo de entidad sin etiqueta conocida
- **THEN** se muestra su clave tal cual

#### Scenario: Persona sin correo
- **WHEN** un evento llega sin correo del autor
- **THEN** se muestra «Sin identificar» junto con el rol en español si lo trae («Administrador»), y «Anónimo» cuando el rol es `anonymous`

#### Scenario: Rol con distinta capitalización
- **WHEN** el gateway devuelve el rol como `TENANT_ADMIN` en un evento y como `tenant_admin` en otro
- **THEN** ambos se muestran como «Administrador» y cuentan como el mismo rol en los filtros

#### Scenario: Sin eventos
- **WHEN** el ámbito no tiene eventos
- **THEN** se muestra el mensaje de lista vacía, sin acción de crear

### Requirement: Clasificación de las acciones
Cada acción SHALL pertenecer a uno de seis tipos —Creación, Modificación, Eliminación, Cambio de estado, Asignación u Otras— decidido por el verbo de su clave, y SHALL mostrarse con una etiqueta cuyo tono y glifo refuerzan el significado sin depender solo del color.

#### Scenario: Tipos de las acciones conocidas
- **WHEN** se clasifican `place.create`, `place.update`, `journey.delete`, `package.status.change`, `resource.assign.driver`, `resource.unassign.driver`, `invitation.revoked` y `notification.push_registered`
- **THEN** son, en ese orden, Creación, Modificación, Eliminación, Estado, Asignación, Asignación, Eliminación y Otras

#### Scenario: Clave que no se reconoce
- **WHEN** la clave de la acción no contiene ningún verbo conocido
- **THEN** se clasifica como Otras y se muestra su clave

### Requirement: Búsqueda y chips por entidad
El listado SHALL ofrecer una búsqueda que ignore mayúsculas y acentos sobre lo que muestra la tabla (acción, persona y fecha) y, con los datos técnicos activados, también la clave de la acción, y chips por tipo de entidad con el recuento de eventos de cada una.

#### Scenario: Buscar por texto
- **WHEN** la persona escribe «asignado» en la búsqueda
- **THEN** quedan los eventos cuyo texto visible contiene esa palabra, sin distinguir acentos ni mayúsculas

#### Scenario: Chips con recuento
- **WHEN** el listado está cargado
- **THEN** hay un chip «Todos» y uno por cada tipo de entidad presente, cada uno con su recuento, y los tipos sin eventos no aparecen

#### Scenario: Elegir un chip
- **WHEN** la persona elige el chip «Paquete»
- **THEN** solo quedan los eventos de paquetes, y el recuento de los demás chips sigue la búsqueda pero no el chip elegido

### Requirement: Filtros combinables
El listado SHALL ofrecer filtros por rango de fechas, tipo de acción, persona y «solo con cambios de valores», que se combinan entre sí y con la búsqueda y los chips, y SHALL ofrecer limpiarlos todos de una vez. Los días SHALL contarse en la hora local del navegador.

#### Scenario: Rango rápido
- **WHEN** la persona elige «7 días»
- **THEN** quedan los eventos desde el comienzo del día de hace seis días hasta este momento (siete días de calendario con el de hoy, en la hora local); «24 horas» son las últimas 24 horas y «30 días» los últimos treinta días de calendario

#### Scenario: Rango personalizado
- **WHEN** la persona elige un día de inicio y uno de fin
- **THEN** quedan los eventos desde el comienzo del primer día hasta el final del último, ambos inclusive, y un inicio posterior al fin se corrige con un mensaje en el campo

#### Scenario: Tipo de acción
- **WHEN** la persona elige «Eliminación»
- **THEN** quedan solo los eventos de acciones de ese tipo

#### Scenario: Persona
- **WHEN** la persona elige un autor de la lista de autores presentes en los eventos
- **THEN** quedan solo los eventos de ese correo, y existe la opción «Sin identificar» para los que no traen correo

#### Scenario: Persona en «Mi actividad»
- **WHEN** el ámbito es «Mi actividad»
- **THEN** no se ofrece filtrar por persona y un filtro de persona que traiga la dirección se ignora, porque todos los eventos son de la misma persona

#### Scenario: Solo con cambios de valores
- **WHEN** la persona activa «Solo con cambios de valores»
- **THEN** quedan los eventos cuyo antes y después difieren en al menos un campo, y se excluyen los que no traen cambios o los traen idénticos

#### Scenario: Ningún evento cumple
- **WHEN** la combinación de filtros no deja eventos
- **THEN** se muestra «No hay resultados» con la acción «Limpiar filtros», que restablece todos los filtros y la búsqueda

### Requirement: Filtros en la dirección de la página
El estado del ámbito, la búsqueda, el chip de entidad, los filtros, el identificador de entidad y el evento abierto en la modal SHALL reflejarse en los parámetros de la dirección, de modo que abrir esa dirección reproduzca la misma vista, y SHALL ignorarse sin error los valores que no se reconozcan.

#### Scenario: Compartir una vista
- **WHEN** la persona filtra por «Paquete» y «Cambio de estado» y copia la dirección
- **THEN** quien la abra con permiso para ese ámbito ve la misma combinación de filtros aplicada

#### Scenario: Valor inválido
- **WHEN** la dirección trae un rango, un tipo de acción o un evento que no existe o no es válido
- **THEN** ese valor se ignora y el resto se aplica

#### Scenario: Historial de la entidad
- **WHEN** se abre `/auditoria` con el identificador de una entidad en la dirección
- **THEN** quedan solo los eventos de esa entidad y se muestra una etiqueta «Entidad: …» que se puede quitar

#### Scenario: Atrás y adelante
- **WHEN** la persona cambia filtros y usa los botones atrás y adelante del navegador
- **THEN** los filtros siguen los pasos de la dirección

### Requirement: Detalle de un evento en una modal
El detalle completo de un evento SHALL mostrarse en una modal que se abre con el ojo de su fila o con su tarjeta, que lleva el evento en la dirección (`?evento=`) y que SHALL cerrarse con «Cerrar», la equis, Escape, pulsando fuera o con el botón atrás del navegador.

#### Scenario: Con el ojo
- **WHEN** la persona pulsa el ojo de una fila
- **THEN** se abre la modal con el detalle completo y la dirección pasa a llevar `?evento=<id>`, sin pedir nada al gateway

#### Scenario: Con una tarjeta
- **WHEN** la persona pulsa una tarjeta
- **THEN** se abre la misma modal

#### Scenario: Contenido
- **WHEN** se abre la modal con un evento
- **THEN** la cabecera lleva el tipo de acción, la acción como título y hace cuánto; debajo, la frase del evento, quién (con avatar de iniciales y rol), cuándo (hace cuánto y la fecha completa), sobre qué (el tipo y la cola del identificador) y la dirección IP cuando el ámbito la entrega

#### Scenario: Evento a mano o pedido
- **WHEN** el evento ya lo trae el listado
- **THEN** la modal aparece de inmediato; solo se pide por su identificador cuando un enlace trae un evento que el listado no tiene

#### Scenario: Cabecera por tipo
- **WHEN** se abre un evento de eliminación, de creación, de modificación, de cambio de estado o de otro tipo
- **THEN** la cabecera y la frase usan el tono de ese tipo (rojo, verde, azul, ámbar o neutro) con su glifo y su nombre, y el color no es la única señal

#### Scenario: Enlace con un evento
- **WHEN** se abre `/auditoria?evento=<id>` y el evento está entre los que trae el listado
- **THEN** el listado carga y, al terminar, la modal se abre con ese evento sin pedirlo aparte

#### Scenario: Evento fuera de lo traído
- **WHEN** el evento de la dirección no está entre los que trae el listado
- **THEN** la modal lo pide al gateway por su identificador y muestra el estado de carga mientras llega

#### Scenario: Evento inexistente o sin permiso
- **WHEN** el gateway responde 404 o 403 al pedir el evento
- **THEN** la modal muestra un mensaje en español y su cabecera neutra, sin mostrar el cuerpo del servidor

#### Scenario: Cerrar
- **WHEN** la persona cierra la modal con el botón, la equis o Escape
- **THEN** el evento sale de la dirección (volviendo atrás si se había añadido al abrirla) y los filtros siguen como estaban

#### Scenario: Botón atrás
- **WHEN** la persona usa el botón atrás del navegador con la modal abierta
- **THEN** la modal se cierra y la dirección vuelve a la anterior, sin retroceder dos pasos

#### Scenario: Sin dirección IP
- **WHEN** el evento viene de «Mi actividad», que no entrega IP
- **THEN** la tarjeta de la IP no aparece

#### Scenario: Copiar
- **WHEN** la persona pulsa copiar el enlace o el identificador del evento
- **THEN** el texto queda en el portapapeles y se avisa con un mensaje; si el navegador no permite copiar, el aviso trae el texto para copiarlo a mano

#### Scenario: Foco y nombre
- **WHEN** se abre la modal
- **THEN** el foco entra en ella, tiene por nombre el título y el foco vuelve al ojo o a la tarjeta al cerrarla

### Requirement: Más eventos de la misma entidad
La modal SHALL ofrecer, cuando el listado trae otros eventos de la misma entidad, una línea de tiempo con los cinco más recientes —cada uno con el glifo y el color de su tipo, qué se hizo, quién y hace cuánto— y cada uno SHALL abrir ese evento en la misma modal.

#### Scenario: Con otros eventos
- **WHEN** se abre un evento cuya entidad tiene otros eventos entre los traídos
- **THEN** la sección «Más de esta entidad» los lista del más reciente al más antiguo, hasta cinco

#### Scenario: Saltar de uno a otro
- **WHEN** la persona elige uno de la línea de tiempo
- **THEN** la modal pasa a ese evento, la dirección cambia a su `?evento=` sin añadir otra entrada al historial y un solo «atrás» cierra la modal

#### Scenario: Sin otros eventos
- **WHEN** la entidad no tiene otros eventos entre los traídos, o se abrió el evento por su identificador sin el listado
- **THEN** la sección no aparece

### Requirement: Diferencia antes y después
La modal SHALL mostrar los valores del antes y del después campo a campo, con una flecha entre ambos, el antes tachado y en tono de error y el después en negrita y en tono de éxito cuando el campo cambió, y SHALL mostrar los valores vacíos de forma legible y los campos que no cambiaron en gris.

#### Scenario: Un campo cambió
- **WHEN** un evento trae `before.status = "pending"` y `after.status = "attended"`
- **THEN** la modal muestra el campo «Estado» con la etiqueta «Cambió», «Pendiente» tachado bajo «Antes» y «Atendido» en negrita bajo «Después», con una flecha entre ambos y los rótulos además del color

#### Scenario: Valores vacíos
- **WHEN** un valor es cadena vacía o `null`
- **THEN** se muestra «(vacío)» en cursiva, sin tachar ni resaltar

#### Scenario: Antes y después idénticos
- **WHEN** un evento trae `changes` donde ningún campo difiere
- **THEN** se muestra «El evento no registra cambios de valores» y se listan los valores sin resaltar

#### Scenario: Sin cambios
- **WHEN** el evento trae `changes` nulo
- **THEN** la sección muestra «Este evento no registra valores» y no hay lista

#### Scenario: Valores anidados
- **WHEN** un valor es un objeto o una lista
- **THEN** se muestra como texto JSON compacto y legible, sin romper la modal en pantallas estrechas

#### Scenario: Pantalla estrecha
- **WHEN** la modal mide menos de 560 px
- **THEN** el antes y el después se apilan con la flecha hacia abajo

#### Scenario: Contenido del gateway como texto
- **WHEN** un valor, una descripción o un correo contienen caracteres como `<` o `&`
- **THEN** se muestran literalmente como texto, nunca interpretados como HTML

### Requirement: Enlace a la entidad afectada
La modal SHALL enlazar a la pantalla de la entidad afectada cuando existe y la acción no la eliminó, y SHALL ofrecer ver todos los eventos de esa entidad.

#### Scenario: Entidad con pantalla
- **WHEN** el evento es de un paquete, lugar, configuración, jornada, vehículo o zona y la acción no es de eliminación
- **THEN** hay un enlace «Abrir paquete» (o el tipo que sea) a su pantalla de edición o detalle

#### Scenario: Entidad eliminada
- **WHEN** la acción es una eliminación (`journey.delete`)
- **THEN** no hay enlace a la entidad y se indica «Esta entidad fue eliminada»

#### Scenario: Entidad sin pantalla
- **WHEN** el evento es de un usuario, invitación, empresa u otro tipo sin pantalla propia
- **THEN** no hay enlace

#### Scenario: Ver los eventos de la entidad
- **WHEN** la persona pulsa «Ver eventos de esta entidad»
- **THEN** la modal se cierra y el listado queda filtrado por el identificador de esa entidad

### Requirement: Exportación a CSV de la auditoría
El listado SHALL permitir exportar a CSV los eventos que dejan la búsqueda y los filtros, o solo los seleccionados, con instante en UTC, acción, entidad, identificador, persona, rol, resumen, dirección IP si el ámbito la entrega y los valores cambiados.

#### Scenario: Exportar lo filtrado
- **WHEN** la persona pulsa «Exportar CSV» con filtros aplicados
- **THEN** se descarga un archivo con una fila por evento filtrado, no por página, con separador `;` y codificación que Excel abre con acentos

#### Scenario: Protección de fórmulas
- **WHEN** un texto del evento empieza por `=`, `+`, `-` o `@`
- **THEN** la celda del CSV lo lleva escapado para que la hoja de cálculo no lo ejecute

#### Scenario: Nada que exportar
- **WHEN** no quedan eventos tras los filtros
- **THEN** el botón de exportar está desactivado

### Requirement: Lectura para personas técnicas y no técnicas
La auditoría SHALL poder leerse sin conocer el sistema y, para quien sí lo conoce, SHALL tener los datos técnicos a un clic. Por defecto SHALL mostrar frases y nombres en español, identificadores largos abreviados y los datos técnicos plegados u ocultos; con «Mostrar datos técnicos» SHALL añadir la clave de la acción a la tabla y a las tarjetas y abrir el bloque «Datos técnicos» de la modal. La elección SHALL recordarse en el navegador.

#### Scenario: Introducción
- **WHEN** la persona abre `/auditoria`
- **THEN** una frase explica qué se ve —qué se hizo, quién y cuándo, o en «Mi actividad» lo que hizo la propia persona— y que el ojo de cada evento abre todo su detalle

#### Scenario: Vista por defecto
- **WHEN** la persona abre la auditoría por primera vez
- **THEN** la tabla y las tarjetas muestran acciones en español («Conductor asignado») y, en la modal, frases con los identificadores largos abreviados («Driver #9fb5a9 asignado al recurso #f8fcf5»), sin claves ni identificadores a la vista y con el bloque «Datos técnicos» plegado

#### Scenario: Datos técnicos
- **WHEN** activa «Mostrar datos técnicos»
- **THEN** la tabla añade la columna «Clave» con la clave de la acción, las tarjetas la muestran y la modal abre el bloque «Datos técnicos» (claves, identificadores copiables, instante UTC, descripción original y JSON de los cambios)

#### Scenario: Se recuerda
- **WHEN** la persona vuelve a abrir la auditoría o abre otro evento
- **THEN** la elección sigue

#### Scenario: Sin almacenamiento
- **WHEN** el navegador no permite guardar la preferencia
- **THEN** la auditoría funciona igual y los datos técnicos empiezan ocultos

### Requirement: Estados de carga y de error de la auditoría
El módulo SHALL mostrar estados de carga, vacío y error en español accesibles para lectores de pantalla, con «Reintentar» en el error, y SHALL traducir los fallos del gateway sin mostrar el cuerpo del servidor.

#### Scenario: Error de permiso del gateway
- **WHEN** el gateway responde 403 a un ámbito
- **THEN** se muestra «No tienes permiso para ver este registro de auditoría» con «Reintentar» y la opción de cambiar al ámbito «Mi actividad»

#### Scenario: Gateway no disponible
- **WHEN** el gateway no responde o devuelve 5xx
- **THEN** se muestra el mensaje genérico en español con «Reintentar» y los filtros no se pierden

### Requirement: Accesibilidad y adaptación de la auditoría
Las pantallas de auditoría SHALL ser utilizables con teclado y lector de pantalla y SHALL adaptarse a pantallas estrechas sin desplazamiento horizontal de la página, de las tablas ni de las barras de filtros.

#### Scenario: Controles con nombre
- **WHEN** un lector de pantalla recorre los filtros
- **THEN** cada control (ámbito, rango, tipo de acción, persona, solo con cambios) tiene un nombre y los botones de solo icono llevan `title` y nombre accesible

#### Scenario: Cambios en el recuento
- **WHEN** cambian los filtros
- **THEN** el recuento de eventos que quedan se anuncia con una región `aria-live` educada

#### Scenario: Pantalla estrecha
- **WHEN** la pantalla mide 320 px de ancho
- **THEN** la barra de filtros se pliega, la tabla se apila como tarjetas, la modal ocupa el ancho disponible con sus acciones una por fila y nada obliga a desplazarse en horizontal

#### Scenario: Tema claro y oscuro
- **WHEN** la persona cambia entre tema claro y oscuro
- **THEN** las etiquetas de tipo de acción, el resaltado de la diferencia y el panel de actividad conservan contraste suficiente
