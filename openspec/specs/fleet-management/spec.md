# fleet-management Specification

## Purpose
Permite a quien administra la empresa gestionar su flota desde la aplicación: tipos de vehículo, vehículos y conductores, incluida la asignación de un conductor a un vehículo.

## Requirements

### Requirement: Rutas y permisos de la flota
Las pantallas de flota SHALL estar bajo `/flota` y SHALL ser accesibles solo con sesión iniciada y rol `tenant_admin` o `super_admin`.

#### Scenario: Rutas disponibles
- **WHEN** un administrador abre `/flota/tipos`, `/flota/vehiculos` o `/flota/conductores`
- **THEN** cada una muestra su listado, y `/flota` lleva a `/flota/vehiculos`

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `agent` o `driver` abre cualquier ruta de `/flota`
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** un usuario anónimo abre una ruta de `/flota`
- **THEN** es llevado a `/acceso` con la ruta pedida como destino posterior

### Requirement: Gestión de tipos de vehículo
La aplicación SHALL permitir listar, crear, editar y eliminar tipos de vehículo con nombre, categoría, perfil de ruteo y consumo de combustible opcional.

#### Scenario: Listado
- **WHEN** el administrador abre `/flota/tipos`
- **THEN** ve nombre, categoría y perfil de ruteo de cada tipo, con el perfil mostrado por su etiqueta en español

#### Scenario: Alta válida
- **WHEN** completa nombre, categoría y perfil de ruteo y guarda
- **THEN** el tipo se crea y aparece en el listado

#### Scenario: Campos obligatorios
- **WHEN** intenta guardar sin nombre, categoría o perfil de ruteo
- **THEN** se muestran los errores de cada campo y no se envía nada

#### Scenario: Estructuras sin contrato
- **WHEN** edita un tipo que ya tiene capacidad, medidas o restricciones
- **THEN** esos datos se conservan intactos al guardar

### Requirement: Gestión de vehículos
La aplicación SHALL permitir listar, crear, editar y eliminar vehículos con nombre, matrícula opcional, tipo, depósito, inicio de turno, duración del turno, duración del descanso y cantidad.

#### Scenario: Listado
- **WHEN** el administrador abre `/flota/vehiculos`
- **THEN** ve nombre, matrícula, tipo y conductor asignado de cada vehículo

#### Scenario: Selección de tipo y depósito
- **WHEN** abre el formulario de un vehículo
- **THEN** el tipo se elige entre los tipos existentes y el depósito entre los lugares existentes

#### Scenario: Sin tipos creados
- **WHEN** no existe ningún tipo de vehículo
- **THEN** el formulario explica que primero hay que crear un tipo y enlaza a `/flota/tipos`

#### Scenario: Turno
- **WHEN** introduce el inicio del turno y las duraciones
- **THEN** el inicio se muestra y se edita en la zona horaria del navegador y se envía al gateway en UTC, y las duraciones se editan en minutos y se envían en segundos

#### Scenario: Valores no válidos
- **WHEN** introduce una duración negativa, una cantidad menor que 1 o un turno que no cabe en 24 horas
- **THEN** se muestra el error en el campo y no se envía nada

#### Scenario: Matrícula duplicada
- **WHEN** el gateway responde 409 al guardar
- **THEN** se muestra "Ya existe un vehículo con esa matrícula" y se conservan los datos escritos

### Requirement: Asignación de conductor a un vehículo
La aplicación SHALL permitir asignar un conductor a un vehículo y retirarlo, eligiendo entre los conductores del tenant.

#### Scenario: Asignar
- **WHEN** el administrador elige un conductor en la ficha o en la fila de un vehículo y confirma
- **THEN** el vehículo muestra el conductor asignado con su nombre y correo

#### Scenario: Retirar
- **WHEN** retira el conductor de un vehículo
- **THEN** el vehículo queda sin conductor tras la confirmación

#### Scenario: Sin conductores
- **WHEN** no hay conductores creados
- **THEN** la lista de selección está vacía y enlaza a `/flota/conductores`

### Requirement: Gestión de conductores
La aplicación SHALL permitir listar, crear, editar y eliminar conductores, que son usuarios con rol `driver`, y enviarles un enlace para restablecer su contraseña.

#### Scenario: Listado
- **WHEN** el administrador abre `/flota/conductores`
- **THEN** ve nombre, correo, teléfono y estado de cada conductor

#### Scenario: Alta de conductor
- **WHEN** completa nombre, apellidos, correo y contraseña inicial y guarda
- **THEN** se crea un usuario con rol `driver` y aparece en el listado

#### Scenario: Correo duplicado
- **WHEN** el gateway responde 409 al crear
- **THEN** se muestra "Ya existe una cuenta con ese correo"

#### Scenario: Edición sin contraseña
- **WHEN** edita un conductor existente
- **THEN** el formulario no pide ni envía la contraseña

#### Scenario: Enlace de restablecimiento
- **WHEN** el administrador pulsa "Enviar enlace de restablecimiento" y confirma
- **THEN** se envía la petición y se muestra un aviso con el correo de destino

### Requirement: Borrado con registros relacionados
Al eliminar un tipo, vehículo o conductor, la aplicación SHALL explicar el resultado cuando el registro tenga relaciones activas, sin dejar el listado en un estado incoherente.

#### Scenario: Tipo con vehículos
- **WHEN** el gateway rechaza eliminar un tipo que tiene vehículos
- **THEN** se muestra "No se puede eliminar: hay vehículos de este tipo" y el tipo sigue en el listado

#### Scenario: Conductor asignado
- **WHEN** el gateway rechaza eliminar un conductor asignado a un vehículo
- **THEN** se muestra "No se puede eliminar: el conductor está asignado a un vehículo"

#### Scenario: Registro ya eliminado
- **WHEN** el gateway responde 404 al eliminar
- **THEN** se muestra un aviso, el listado se recarga y el registro desaparece
