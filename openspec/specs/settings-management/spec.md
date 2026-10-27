# settings-management Specification

## Purpose
Permite configurar cómo se planifican las jornadas: topología de la ruta, restricciones, lugares de salida y llegada, vehículos disponibles y reglas de peso, volumen y turno.

## Requirements

### Requirement: Rutas y permisos de configuraciones
Las pantallas de configuraciones SHALL estar bajo `/configuraciones` y SHALL ser accesibles solo con sesión iniciada y rol `tenant_admin` o `super_admin`.

#### Scenario: Rutas disponibles
- **WHEN** un administrador abre `/configuraciones`, `/configuraciones/nuevo` o `/configuraciones/:id`
- **THEN** ve el listado, el formulario de alta o el de edición

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `agent` o `driver` abre una ruta de `/configuraciones`
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** un usuario anónimo abre una ruta de `/configuraciones`
- **THEN** es llevado a `/acceso` con la ruta pedida como destino posterior

### Requirement: Listado de configuraciones
El listado SHALL mostrar descripción, topología, tipo de restricción, lugar de salida, número de vehículos y estado de cada configuración, paginado desde el servidor y con los valores de dominio en español.

#### Scenario: Columnas
- **WHEN** el administrador abre `/configuraciones`
- **THEN** ve la descripción, la topología ("Ida y vuelta"), el tipo de restricción ("Rutas fijas"), el nombre del lugar de salida, la cantidad de vehículos y "Activa" o "Inactiva"

#### Scenario: Valor de dominio desconocido
- **WHEN** el gateway devuelve un valor sin etiqueta conocida
- **THEN** se muestra su clave tal cual

#### Scenario: Sin configuraciones
- **WHEN** el tenant no tiene configuraciones
- **THEN** se muestra el mensaje de lista vacía con la acción de crear la primera

### Requirement: Alta y edición de configuraciones
La aplicación SHALL permitir crear y editar una configuración con descripción, topología, tipo de restricción, lugar de salida y al menos un vehículo obligatorios, y lugar de llegada y reglas de evaluación opcionales.

#### Scenario: Alta válida
- **WHEN** completa los datos obligatorios y guarda
- **THEN** la configuración se crea con los identificadores de lugar y de vehículos y aparece en el listado

#### Scenario: Campos obligatorios
- **WHEN** intenta guardar sin descripción, topología, tipo de restricción, lugar de salida o vehículos
- **THEN** se muestran los errores junto a cada campo y no se envía nada

#### Scenario: Opciones desde el gateway
- **WHEN** abre el formulario
- **THEN** los lugares, los vehículos y los valores de `RouteTopology` y `RestrictionType` se ofrecen con su nombre o etiqueta en español

#### Scenario: Sin lugares o sin vehículos
- **WHEN** el tenant no tiene lugares o no tiene vehículos
- **THEN** el formulario lo explica y enlaza a `/lugares/nuevo` o a `/flota/vehiculos/nuevo`

#### Scenario: Llegada igual a salida
- **WHEN** no elige un lugar de llegada
- **THEN** no se envía y el gateway usa el de salida

#### Scenario: Edición
- **WHEN** abre `/configuraciones/:id` de una configuración existente
- **THEN** el formulario se rellena con sus datos, incluidos los vehículos seleccionados

#### Scenario: Configuración inexistente
- **WHEN** abre la edición de un identificador que el gateway responde con 404
- **THEN** se muestra "El registro ya no existe" con un enlace al listado

#### Scenario: Campos sin editar
- **WHEN** edita una configuración que ya tiene turno global o descanso global activos
- **THEN** esos datos se conservan intactos al guardar

### Requirement: Campos según el tipo de restricción
El formulario SHALL mostrar y exigir solo los campos que corresponden al tipo de restricción elegido.

#### Scenario: Rutas fijas
- **WHEN** elige "Rutas fijas"
- **THEN** se muestra y se exige el número de rutas (entero de 1 o más) y no se muestran los campos de turno

#### Scenario: Otros tipos
- **WHEN** elige "Recursos y tiempo" o "Ventanas horarias"
- **THEN** se muestran el inicio, la duración y el descanso del turno, y no se muestra el número de rutas

#### Scenario: Cambiar de tipo
- **WHEN** cambia el tipo de restricción
- **THEN** los campos que dejan de aplicar no se envían al guardar

#### Scenario: Turno no válido
- **WHEN** la duración del turno es cero o negativa, o el descanso es negativo
- **THEN** se muestra el error junto al campo y no se envía nada

#### Scenario: Estancia
- **WHEN** elige una estancia fija
- **THEN** se exige un valor numérico positivo de estancia; si la estancia se define en el itinerario, no se envía valor

### Requirement: Evaluación de peso y volumen
La aplicación SHALL permitir indicar si la planificación evalúa el peso, el volumen y la zona del itinerario.

#### Scenario: Casillas
- **WHEN** marca o desmarca "Evaluar peso", "Evaluar volumen" o "Evaluar zona del itinerario"
- **THEN** la configuración se guarda con esos valores

### Requirement: Borrado de configuraciones
El borrado SHALL pedir confirmación y SHALL explicar el resultado cuando la configuración esté en uso.

#### Scenario: Confirmar
- **WHEN** el administrador confirma el borrado
- **THEN** se elimina, se avisa y el listado se recarga

#### Scenario: Configuración en uso
- **WHEN** el gateway rechaza el borrado con 400 o 409
- **THEN** se muestra "No se puede eliminar: la configuración se usa en una jornada" y permanece en el listado

#### Scenario: Cambios sin guardar
- **WHEN** el usuario sale del formulario con cambios sin guardar
- **THEN** se le pide confirmar el descarte
