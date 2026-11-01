## MODIFIED Requirements

### Requirement: Gestión de tipos de vehículo
La aplicación SHALL permitir listar, crear, editar y eliminar tipos de vehículo con nombre, categoría, perfil de ruteo, consumo de combustible opcional y, como la aplicación anterior, capacidad de carga (peso y volumen, o medidas) y restricciones de carga opcionales, conservando siempre las claves que la pantalla no conoce.

#### Scenario: Listado
- **WHEN** el administrador abre `/flota/tipos`
- **THEN** ve nombre, categoría, perfil de ruteo (por su etiqueta en español) y la capacidad resumida de cada tipo («500 kg · 12 m³») o «Sin capacidad» si no la tiene

#### Scenario: Alta válida
- **WHEN** completa nombre, categoría y perfil de ruteo y guarda
- **THEN** el tipo se crea, aunque no tenga capacidad, y aparece en el listado

#### Scenario: Campos obligatorios
- **WHEN** intenta guardar sin nombre, categoría o perfil de ruteo
- **THEN** se muestran los errores de cada campo y no se envía nada

#### Scenario: Capacidad en volumen
- **WHEN** elige «En volumen» e introduce un peso en kilogramos y un volumen en centímetros cúbicos, ambos mayores que 0
- **THEN** el tipo se guarda con esa capacidad y el listado la muestra como «500 kg · 12 m³»

#### Scenario: Capacidad en medidas
- **WHEN** elige «En medidas» e introduce ancho, alto y profundidad en centímetros
- **THEN** el volumen se calcula como el producto de las tres medidas, se muestra sin poder editarse y se guarda junto con las medidas

#### Scenario: Capacidad incompleta
- **WHEN** introduce un peso sin volumen, un volumen sin peso, o medidas con alguna a 0
- **THEN** se muestra el error en el campo que falta y no se envía nada

#### Scenario: Restricciones coherentes
- **WHEN** introduce un mínimo mayor que su máximo, un peso máximo mayor que el peso del vehículo o un volumen máximo mayor que el volumen
- **THEN** se muestra el error en el campo con la regla en español y no se envía nada

#### Scenario: Estructuras sin contrato
- **WHEN** edita un tipo cuya capacidad, medidas o restricciones traen claves que la pantalla no conoce
- **THEN** esas claves se conservan intactas al guardar y solo cambian las que la persona editó

### Requirement: Gestión de conductores
La aplicación SHALL permitir listar, crear, editar y eliminar conductores, que son usuarios con rol `driver`, con documento de identidad opcional (tipo y valor), y enviarles un enlace para restablecer su contraseña.

#### Scenario: Listado
- **WHEN** el administrador abre `/flota/conductores`
- **THEN** ve nombre, correo, teléfono, documento de identidad y estado de cada conductor

#### Scenario: Alta de conductor
- **WHEN** completa nombre, apellidos, correo y contraseña inicial, la repite y guarda
- **THEN** se crea un usuario con rol `driver` y aparece en el listado

#### Scenario: Contraseñas distintas
- **WHEN** la repetición de la contraseña no coincide con la contraseña inicial
- **THEN** se muestra el error en el campo y no se envía nada

#### Scenario: Correo duplicado
- **WHEN** el gateway responde 409 al crear
- **THEN** se muestra "Ya existe una cuenta con ese correo"

#### Scenario: Edición sin contraseña
- **WHEN** edita un conductor existente
- **THEN** el formulario no pide ni envía la contraseña

#### Scenario: Documento de identidad
- **WHEN** elige un tipo de documento (del dominio maestro `IdentifierType`, con etiqueta en español) e introduce su valor
- **THEN** ambos se guardan y el listado los muestra juntos («Documento de identidad 1020304050»)

#### Scenario: Documento incompleto
- **WHEN** introduce un valor sin tipo, o un tipo sin valor
- **THEN** se muestra el error en el campo que falta y no se envía nada

#### Scenario: Enlace de restablecimiento
- **WHEN** el administrador pulsa "Enviar enlace de restablecimiento" y confirma
- **THEN** se envía la petición y se muestra un aviso con el correo de destino

## ADDED Requirements

### Requirement: Crear un tipo desde el formulario de vehículo
El formulario de vehículo SHALL ofrecer crear un tipo de vehículo sin perderse, y volver a él al terminar.

#### Scenario: Botón de añadir tipo
- **WHEN** abre el formulario de un vehículo
- **THEN** junto al selector de tipo hay un botón «Crear tipo» que abre `/flota/tipos/nuevo` con el formulario de vehículo como destino de vuelta

#### Scenario: Volver tras crear
- **WHEN** guarda el tipo nuevo
- **THEN** vuelve al formulario de vehículo, donde el tipo recién creado ya aparece entre los que se pueden elegir

#### Scenario: Lo escrito se conserva
- **WHEN** vuelve al formulario de vehículo tras crear el tipo o cancelar
- **THEN** el nombre, la matrícula, el depósito, el turno y la cantidad que había escrito siguen ahí, y el tipo recién creado ya está elegido

#### Scenario: Cancelar
- **WHEN** cancela el alta del tipo
- **THEN** vuelve al formulario de vehículo con lo escrito y sin crear nada

#### Scenario: Destino no seguro
- **WHEN** la dirección de vuelta apunta fuera de la aplicación o a una ruta que no es de la flota
- **THEN** se ignora y, tras guardar, se va al listado de tipos

### Requirement: Conservación de los datos que la pantalla no edita
Al guardar un vehículo, un conductor o un tipo, la aplicación SHALL reenviar los campos del registro que su formulario no edita, para que guardar no borre datos puestos desde otro cliente o desde el gateway.

#### Scenario: Vehículo con restricciones
- **WHEN** edita y guarda un vehículo que tiene tipos de paquete permitidos y zonas permitidas
- **THEN** la petición de guardado incluye esos mismos valores, aunque el formulario no los haya tocado

#### Scenario: Conductor con documento
- **WHEN** edita y guarda un conductor que tiene tipo y valor de documento
- **THEN** la petición de guardado incluye ambos valores salvo que la persona los haya cambiado

#### Scenario: Tipo con estructuras
- **WHEN** edita y guarda un tipo con capacidad, medidas y restricciones
- **THEN** la petición incluye las tres estructuras completas, con las claves desconocidas incluidas

### Requirement: Listados con todos los registros
Los listados de tipos, vehículos y conductores SHALL cargar todos los registros del tenant (hasta 1000) y SHALL buscar, contar y paginar sobre todos, como hacía la aplicación anterior.

#### Scenario: Búsqueda sobre todo
- **WHEN** el tenant tiene 130 conductores y busca el nombre de uno que no estaría en los primeros 20
- **THEN** el conductor aparece y el recuento dice «1 de 130»

#### Scenario: Más de 1000 registros
- **WHEN** hay más registros que el tope
- **THEN** se avisa de que se muestran los 1000 más recientes de N

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
Los listados de flota SHALL poder exportarse a CSV, con lo que dejan la búsqueda y los chips o con la selección si la hay, en sustitución de la exportación a PDF de la aplicación anterior.

#### Scenario: Exportar lo filtrado
- **WHEN** filtra vehículos y pulsa «Exportar CSV»
- **THEN** se descarga un archivo con una fila por vehículo filtrado y las columnas del listado, con la fecha en el nombre

#### Scenario: Exportar la selección
- **WHEN** hay registros seleccionados y pulsa «Exportar CSV»
- **THEN** el archivo contiene solo los seleccionados

#### Scenario: Protección de fórmulas
- **WHEN** un nombre empieza por `=`, `+`, `-` o `@`
- **THEN** el CSV lo escribe de forma que una hoja de cálculo no lo interprete como fórmula
