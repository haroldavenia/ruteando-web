# place-management Specification

## Purpose
Permite gestionar los lugares de la empresa (depósitos, almacenes, tiendas y oficinas) desde la aplicación: listarlos, crearlos, editarlos y borrarlos, con su ubicación en el mapa o por coordenadas.

## Requirements

### Requirement: Rutas y permisos de lugares
Las pantallas de lugares SHALL estar bajo `/lugares` y SHALL ser accesibles solo con sesión iniciada y rol `tenant_admin` o `super_admin`.

#### Scenario: Rutas disponibles
- **WHEN** un administrador abre `/lugares`, `/lugares/nuevo` o `/lugares/:id`
- **THEN** ve el listado, el formulario de alta o el de edición

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `agent` o `driver` abre una ruta de `/lugares`
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** un usuario anónimo abre una ruta de `/lugares`
- **THEN** es llevado a `/acceso` con la ruta pedida como destino posterior

### Requirement: Listado de lugares
El listado SHALL mostrar nombre, tipo, dirección, teléfono y ubicación de cada lugar, paginado desde el servidor, con el tipo en español.

#### Scenario: Columnas
- **WHEN** el administrador abre `/lugares`
- **THEN** ve el nombre, el tipo con su etiqueta en español (por ejemplo "Depósito" para `depot`), la dirección, el teléfono y la latitud y longitud con cinco decimales

#### Scenario: Sin lugares
- **WHEN** el tenant no tiene lugares
- **THEN** se muestra el mensaje de lista vacía con la acción de crear el primero

### Requirement: Alta y edición de lugares
La aplicación SHALL permitir crear y editar un lugar con nombre, tipo y ubicación obligatorios y dirección, teléfono y persona de contacto opcionales.

#### Scenario: Alta válida
- **WHEN** completa nombre, tipo y ubicación y guarda
- **THEN** el lugar se crea con la ubicación como punto GeoJSON `[longitud, latitud]` y aparece en el listado

#### Scenario: Campos obligatorios
- **WHEN** intenta guardar sin nombre, sin tipo o sin ubicación
- **THEN** se muestran los errores junto a cada campo y no se envía nada

#### Scenario: Tipos disponibles
- **WHEN** abre el formulario
- **THEN** el tipo se elige entre los valores del dominio `PlaceType` con su etiqueta en español

#### Scenario: Teléfono
- **WHEN** escribe un teléfono con caracteres que no sean dígitos, espacios, paréntesis, guiones o un `+` inicial, o con menos de 7 o más de 20 caracteres
- **THEN** se muestra el error y no se envía nada

#### Scenario: Edición
- **WHEN** abre `/lugares/:id` de un lugar existente
- **THEN** el formulario se rellena con sus datos y el marcador aparece en su ubicación

#### Scenario: Lugar inexistente
- **WHEN** abre la edición de un identificador que el gateway responde con 404
- **THEN** se muestra "El registro ya no existe" con un enlace al listado

### Requirement: Ubicación del lugar
La ubicación del lugar SHALL poder elegirse en el mapa o escribirse como latitud y longitud, y ambas formas SHALL mantenerse sincronizadas.

#### Scenario: Elegir en el mapa
- **WHEN** el usuario hace clic en el mapa
- **THEN** los campos de latitud y longitud muestran ese punto

#### Scenario: Escribir coordenadas
- **WHEN** el usuario escribe una latitud y una longitud válidas
- **THEN** el marcador se coloca en ese punto

#### Scenario: Sin geocodificación
- **WHEN** el usuario escribe una dirección
- **THEN** la dirección se guarda como texto y no se calcula ninguna ubicación a partir de ella

### Requirement: Borrado de lugares
El borrado SHALL pedir confirmación y SHALL explicar el resultado cuando el lugar esté en uso.

#### Scenario: Confirmar
- **WHEN** el administrador confirma el borrado de un lugar
- **THEN** se elimina, se avisa y el listado se recarga

#### Scenario: Lugar en uso
- **WHEN** el gateway rechaza el borrado porque un vehículo usa el lugar como depósito
- **THEN** se muestra "No se puede eliminar: el lugar se usa como depósito o en otros datos" y el lugar permanece en el listado

#### Scenario: Cambios sin guardar
- **WHEN** el usuario sale del formulario con cambios sin guardar
- **THEN** se le pide confirmar el descarte
