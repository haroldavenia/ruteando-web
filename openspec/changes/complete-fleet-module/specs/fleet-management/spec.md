## MODIFIED Requirements

### Requirement: Gestión de tipos de vehículo
La aplicación SHALL permitir listar, crear, editar y eliminar tipos de vehículo con nombre, categoría, perfil de ruteo, consumo de combustible opcional y, opcionalmente, capacidad de carga (peso y volumen), medidas y restricciones de carga, conservando siempre las claves que la pantalla no conoce.

#### Scenario: Listado
- **WHEN** el administrador abre `/flota/tipos`
- **THEN** ve nombre, categoría, perfil de ruteo (por su etiqueta en español) y la capacidad resumida de cada tipo («1 200 kg · 8 m³») o «Sin capacidad» si no la tiene

#### Scenario: Alta válida
- **WHEN** completa nombre, categoría y perfil de ruteo y guarda
- **THEN** el tipo se crea, aunque no tenga capacidad, y aparece en el listado

#### Scenario: Campos obligatorios
- **WHEN** intenta guardar sin nombre, categoría o perfil de ruteo
- **THEN** se muestran los errores de cada campo y no se envía nada

#### Scenario: Capacidad directa
- **WHEN** elige capacidad «por volumen» e introduce un peso y un volumen mayores que 0
- **THEN** la pantalla los muestra en kilogramos y metros cúbicos y los envía en la unidad que usa el gateway

#### Scenario: Capacidad por medidas
- **WHEN** elige capacidad «por medidas» e introduce alto, ancho y profundidad mayores que 0
- **THEN** el volumen se calcula solo, se muestra sin poder editarse y se envía junto con las medidas

#### Scenario: Restricciones coherentes
- **WHEN** introduce un mínimo mayor que su máximo, o un máximo mayor que la capacidad
- **THEN** se muestra el error en el campo con la regla en español y no se envía nada

#### Scenario: Vista previa
- **WHEN** completa los datos de capacidad
- **THEN** una vista previa «Así quedará» resume en una frase la capacidad, las medidas y las restricciones tal como las verá la planificación

#### Scenario: Estructuras sin contrato
- **WHEN** edita un tipo cuya capacidad, medidas o restricciones traen claves que la pantalla no conoce
- **THEN** esas claves se conservan intactas al guardar y solo cambian las que la persona editó

#### Scenario: Unidad del consumo
- **WHEN** introduce el consumo de combustible
- **THEN** el campo indica la unidad en la que el gateway lo interpreta

### Requirement: Gestión de conductores
La aplicación SHALL permitir listar, crear, editar y eliminar conductores, que son usuarios con rol `driver`, con documento de identidad opcional (tipo y valor), y enviarles un enlace para restablecer su contraseña.

#### Scenario: Listado
- **WHEN** el administrador abre `/flota/conductores`
- **THEN** ve nombre, correo, teléfono, estado y el vehículo que conduce cada conductor («Sin vehículo» si no tiene)

#### Scenario: Alta de conductor
- **WHEN** completa nombre, apellidos, correo y contraseña inicial y guarda
- **THEN** se crea un usuario con rol `driver` y aparece en el listado

#### Scenario: Correo duplicado
- **WHEN** el gateway responde 409 al crear
- **THEN** se muestra "Ya existe una cuenta con ese correo"

#### Scenario: Edición sin contraseña
- **WHEN** edita un conductor existente
- **THEN** el formulario no pide ni envía la contraseña

#### Scenario: Documento de identidad
- **WHEN** elige un tipo de documento (del dominio maestro `IdentifierType`, con etiqueta en español) e introduce su valor
- **THEN** ambos se guardan, y se muestran en la ficha del conductor

#### Scenario: Documento incompleto
- **WHEN** introduce un valor sin tipo, o un tipo sin valor
- **THEN** se muestra el error en el campo que falta y no se envía nada

#### Scenario: Enlace de restablecimiento
- **WHEN** el administrador pulsa "Enviar enlace de restablecimiento" y confirma
- **THEN** se envía la petición y se muestra un aviso con el correo de destino

## ADDED Requirements

### Requirement: Conservación de los datos que la pantalla no edita
Al guardar un vehículo, un conductor o un tipo, la aplicación SHALL reenviar los campos del registro que su formulario no edita, para que guardar no borre datos puestos desde otro cliente o desde el gateway.

#### Scenario: Vehículo con restricciones
- **WHEN** edita y guarda un vehículo que tiene tipos de paquete permitidos y zonas permitidas
- **THEN** la petición de guardado incluye esos mismos valores, aunque el formulario no los haya tocado

#### Scenario: Conductor con documento
- **WHEN** edita y guarda un conductor que tiene tipo y valor de documento
- **THEN** la petición de guardado incluye ambos valores

#### Scenario: Tipo con estructuras
- **WHEN** edita y guarda un tipo con capacidad, medidas y restricciones
- **THEN** la petición incluye las tres estructuras completas, con las claves desconocidas incluidas

### Requirement: Listados completos con búsqueda, recuento y chips
Los listados de tipos, vehículos y conductores SHALL cargar todos los registros del tenant (hasta 1000) y SHALL buscar, contar y filtrar sobre todos, no solo sobre una página.

#### Scenario: Búsqueda sobre todo
- **WHEN** el tenant tiene 130 conductores y busca el nombre de uno que no estaría en los primeros 20
- **THEN** el conductor aparece y el recuento dice «1 de 130»

#### Scenario: Más de 1000 registros
- **WHEN** hay más registros que el tope
- **THEN** se avisa de que se muestran los 1000 más recientes de N

#### Scenario: Chips de vehículos
- **WHEN** abre `/flota/vehiculos`
- **THEN** puede filtrar por «Con conductor», «Sin conductor» e «Inactivos», cada chip con su recuento

#### Scenario: Chips de conductores
- **WHEN** abre `/flota/conductores`
- **THEN** puede filtrar por «Activos», «Inactivos» y «Sin vehículo», cada chip con su recuento

#### Scenario: Chips de tipos
- **WHEN** abre `/flota/tipos`
- **THEN** puede filtrar por categoría y por «Sin capacidad», cada chip con su recuento

### Requirement: Columnas de relación entre vehículos, tipos, conductores y lugares
Los listados SHALL mostrar los datos relacionados que la persona necesita para entender la flota sin abrir cada registro.

#### Scenario: Vehículos
- **WHEN** abre `/flota/vehiculos`
- **THEN** cada vehículo muestra nombre, matrícula, tipo, nombre del depósito, el turno («08:00–16:00» en hora local), el conductor y su estado

#### Scenario: Depósito que ya no existe
- **WHEN** el depósito de un vehículo no está entre los lugares del tenant
- **THEN** la columna dice «Depósito no disponible» en lugar de mostrar el identificador

#### Scenario: Tipo en uso
- **WHEN** abre `/flota/tipos`
- **THEN** cada tipo indica cuántos vehículos lo usan

### Requirement: Selección y borrado en lote
Los listados de flota SHALL permitir seleccionar varios registros y eliminarlos con una sola confirmación, informando después de cuáles se eliminaron y cuáles no.

#### Scenario: Eliminar varios
- **WHEN** selecciona cuatro vehículos y confirma
- **THEN** el gateway recibe una petición de borrado por vehículo y la pantalla informa «Se eliminaron 3 de 4»

#### Scenario: Alguno no se puede eliminar
- **WHEN** el gateway rechaza eliminar un registro en uso
- **THEN** ese registro sigue en el listado y se explica el motivo en español junto a su nombre, sin detener los demás

#### Scenario: Cancelar
- **WHEN** cierra la confirmación sin aceptar
- **THEN** no se envía ninguna petición y la selección se conserva

### Requirement: Exportación de los listados a CSV
Los listados de flota SHALL poder exportarse a CSV, con lo que dejan la búsqueda y los chips o con la selección si la hay.

#### Scenario: Exportar lo filtrado
- **WHEN** filtra vehículos y pulsa «Exportar CSV»
- **THEN** se descarga un archivo con una fila por vehículo filtrado y las columnas del listado, con la fecha en el nombre

#### Scenario: Protección de fórmulas
- **WHEN** un nombre empieza por `=`, `+`, `-` o `@`
- **THEN** el CSV lo escribe de forma que una hoja de cálculo no lo interprete como fórmula

### Requirement: Disponibilidad al asignar conductor
El selector de conductor de un vehículo SHALL indicar quién ya conduce otro vehículo y quién está inactivo, sin impedir la elección salvo en inactivos.

#### Scenario: Conductor que ya conduce
- **WHEN** abre el selector y un conductor ya está asignado a otro vehículo
- **THEN** su fila dice «Conduce: <vehículo>» y, al elegirlo, se avisa de que el otro vehículo quedará sin él si el gateway lo mueve

#### Scenario: Conductor inactivo
- **WHEN** un conductor está inactivo
- **THEN** aparece deshabilitado con la etiqueta «Inactivo» y no puede elegirse

#### Scenario: Rechazo del gateway
- **WHEN** el gateway rechaza la asignación
- **THEN** se muestra el motivo en español y el vehículo conserva su conductor anterior

### Requirement: Restricciones de zona de un vehículo
El formulario de vehículo SHALL permitir limitar el vehículo a ciertas zonas de reparto, eligiéndolas entre las zonas del tenant.

#### Scenario: Elegir zonas
- **WHEN** elige una o más zonas y guarda
- **THEN** el vehículo queda limitado a ellas y la ficha las lista por nombre

#### Scenario: Sin restricción
- **WHEN** no elige ninguna zona
- **THEN** el vehículo queda sin restricción de zona y la ficha dice «Todas las zonas»

#### Scenario: Zona eliminada
- **WHEN** una zona permitida del vehículo ya no existe
- **THEN** aparece como «Zona eliminada» y puede quitarse

#### Scenario: Sin zonas creadas
- **WHEN** el tenant no tiene zonas
- **THEN** el campo explica que primero hay que crear una y enlaza a `/zonas/nueva`

### Requirement: Fichas con el detalle completo
Los listados SHALL mantener solo lo esencial y SHALL abrir el detalle completo de un vehículo, conductor o tipo en una modal ligada a la dirección de la página.

#### Scenario: Abrir la ficha
- **WHEN** pulsa el ojo de una fila o toca una tarjeta
- **THEN** se abre la modal y la dirección lleva `?vehiculo=<id>` (`?conductor=<id>` o `?tipo=<id>`), de modo que el enlace reproduce la ficha

#### Scenario: Ficha de vehículo
- **WHEN** se abre la ficha de un vehículo
- **THEN** muestra identificación, tipo con su capacidad, depósito (enlazado a su lugar), turno en hora local, conductor, zonas permitidas, estado y fechas, con acciones para editar, asignar o retirar conductor y ver historial

#### Scenario: Ficha de conductor
- **WHEN** se abre la ficha de un conductor
- **THEN** muestra nombre, correo, teléfono, documento, estado, último acceso y el vehículo que conduce, con acciones para editar y enviar el enlace de restablecimiento

#### Scenario: Ficha de tipo
- **WHEN** se abre la ficha de un tipo
- **THEN** muestra su capacidad, medidas, restricciones y consumo y los vehículos que lo usan

#### Scenario: Cerrar
- **WHEN** cierra la modal con Escape, con el botón o con «Atrás»
- **THEN** la dirección vuelve a la del listado sin dejar una entrada de historial de más

#### Scenario: Registro inexistente
- **WHEN** el enlace apunta a un registro que ya no existe
- **THEN** la modal explica que ya no existe y ofrece volver al listado

### Requirement: Enlace al historial de auditoría
Las fichas de vehículo y de conductor SHALL ofrecer «Ver historial», que abre `/auditoria` filtrada por esa entidad, a quien tenga acceso a Auditoría.

#### Scenario: Vehículo
- **WHEN** pulsa «Ver historial» en la ficha de un vehículo
- **THEN** navega a `/auditoria?entidad=resource&id=<id>`

#### Scenario: Conductor
- **WHEN** pulsa «Ver historial» en la ficha de un conductor
- **THEN** navega a `/auditoria?entidad=user&id=<id>`

#### Scenario: Tipo de vehículo
- **WHEN** abre la ficha de un tipo
- **THEN** no se ofrece historial mientras no se confirme el nombre de entidad con el que el gateway audita los tipos
