# zone-management Specification

## Purpose
Permite gestionar las zonas de la empresa (áreas geográficas con nombre, código y color) para usarlas al planificar: listarlas, crearlas, editarlas y borrarlas, con su polígono dibujado en el mapa o escrito vértice a vértice.

## Requirements

### Requirement: Rutas y permisos de zonas
Las pantallas de zonas SHALL estar bajo `/zonas` y SHALL ser accesibles solo con sesión iniciada y rol `tenant_admin` o `super_admin`.

#### Scenario: Rutas disponibles
- **WHEN** un administrador abre `/zonas`, `/zonas/nueva` o `/zonas/:id`
- **THEN** ve el listado, el formulario de alta o el de edición

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `agent` o `driver` abre una ruta de `/zonas`
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** un usuario anónimo abre una ruta de `/zonas`
- **THEN** es llevado a `/acceso` con la ruta pedida como destino posterior

### Requirement: Listado de zonas
El listado SHALL mostrar color, nombre, código, número de vértices y estado de cada zona.

#### Scenario: Columnas
- **WHEN** el administrador abre `/zonas`
- **THEN** ve una muestra del color de cada zona (o «Sin color»), su nombre, su código, el número de vértices del polígono y «Activa» o «Inactiva»

#### Scenario: Sin zonas
- **WHEN** el tenant no tiene zonas
- **THEN** se muestra el mensaje de lista vacía con la acción de crear la primera

#### Scenario: Sesión sin empresa
- **WHEN** no hay un usuario con empresa durante la carga
- **THEN** se muestra el mensaje de sesión no válida con la opción de reintentar, sin llegar a pedir nada al gateway

### Requirement: Alta y edición de zonas
La aplicación SHALL permitir crear y editar una zona con nombre, código y polígono obligatorios y color opcional.

#### Scenario: Alta válida
- **WHEN** completa nombre, código y un polígono válido y guarda
- **THEN** la zona se crea con el polígono como anillo GeoJSON cerrado y aparece en el listado

#### Scenario: Campos obligatorios
- **WHEN** intenta guardar sin nombre, sin código o sin polígono válido
- **THEN** se muestran los errores junto a cada campo y no se envía nada

#### Scenario: Código
- **WHEN** escribe un código con espacios o de más de 20 caracteres
- **THEN** se rechaza con un mensaje, y los espacios alrededor se recortan

#### Scenario: Color
- **WHEN** elige un color de la paleta o «Sin color»
- **THEN** se envía el color como `#RRGGBB` o `null` y la muestra del listado lo refleja

#### Scenario: Código duplicado
- **WHEN** el gateway responde 409 al guardar
- **THEN** se muestra «Ya existe una zona con ese código» y se conservan los datos escritos

#### Scenario: Edición
- **WHEN** abre `/zonas/:id` de una zona existente
- **THEN** el formulario se rellena y el polígono aparece dibujado y en la tabla de vértices

#### Scenario: Zona inexistente
- **WHEN** abre la edición de un identificador que el gateway responde con 404
- **THEN** se muestra «El registro ya no existe» con un enlace al listado

#### Scenario: Campos sin editar
- **WHEN** edita una zona inactiva
- **THEN** su estado `active` se conserva al guardar

#### Scenario: Cambios sin guardar
- **WHEN** sale del formulario con cambios sin guardar
- **THEN** se le pide confirmar el descarte

### Requirement: Borrado de zonas
El borrado SHALL pedir confirmación y SHALL explicar el resultado cuando la zona esté en uso.

#### Scenario: Confirmar
- **WHEN** el administrador confirma el borrado
- **THEN** se elimina, se avisa y el listado se recarga

#### Scenario: Zona en uso
- **WHEN** el gateway rechaza el borrado con 400 o 409
- **THEN** se muestra «No se puede eliminar: la zona se usa en lugares, paquetes o configuraciones» y la zona permanece

#### Scenario: Zona ya borrada
- **WHEN** el gateway responde 404 al borrar
- **THEN** se avisa, se recarga el listado y la zona desaparece
