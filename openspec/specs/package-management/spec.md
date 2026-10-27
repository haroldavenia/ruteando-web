# package-management Specification

## Purpose
Permite gestionar los paquetes o servicios a atender (en el legacy, el itinerario): listarlos, crearlos, editarlos, borrarlos, cambiar su estado y exportarlos a CSV, con su ubicación en el mapa o por coordenadas.

## Requirements

### Requirement: Rutas y permisos de paquetes
Las pantallas de paquetes SHALL estar bajo `/paquetes` y SHALL ser accesibles solo con sesión iniciada y rol `tenant_admin`, `super_admin` o `agent`.

#### Scenario: Rutas disponibles
- **WHEN** un usuario con alguno de esos roles abre `/paquetes`, `/paquetes/nuevo` o `/paquetes/:id`
- **THEN** ve el listado, el formulario de alta o el de edición

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `driver` abre una ruta de `/paquetes`
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** un usuario anónimo abre una ruta de `/paquetes`
- **THEN** es llevado a `/acceso` con la ruta pedida como destino posterior

### Requirement: Listado de paquetes
El listado SHALL mostrar guía, nombre, tipo de servicio, dirección, estado y ubicación de cada paquete, paginado desde el servidor, con los valores de dominio en español.

#### Scenario: Columnas
- **WHEN** el usuario abre `/paquetes`
- **THEN** ve la guía (vacía si no tiene), el nombre, el tipo de servicio ("Entrega", "Recogida" o "Mixto"), la dirección, el estado ("Pendiente", "Atendido", "No atendido", "Cancelado" o "Devuelto") y la latitud y longitud con cinco decimales

#### Scenario: Valor de dominio desconocido
- **WHEN** el gateway devuelve un valor de dominio sin etiqueta conocida
- **THEN** se muestra su clave tal cual

#### Scenario: Sin paquetes
- **WHEN** el tenant no tiene paquetes
- **THEN** se muestra el mensaje de lista vacía con la acción de crear el primero

### Requirement: Alta y edición de paquetes
La aplicación SHALL permitir crear y editar un paquete con nombre, tipo de servicio, dirección, ubicación, peso y volumen obligatorios, y número de guía, ciudad, país, código postal, número de piezas y observación opcionales.

#### Scenario: Alta válida
- **WHEN** completa los datos obligatorios y guarda
- **THEN** el paquete se crea con la ubicación como punto GeoJSON `[longitud, latitud]` y aparece en el listado

#### Scenario: Campos obligatorios
- **WHEN** intenta guardar sin alguno de los obligatorios
- **THEN** se muestran los errores junto a cada campo y no se envía nada

#### Scenario: Números no válidos
- **WHEN** introduce un peso o un volumen negativos, o un número de piezas menor que 1 o no entero
- **THEN** se muestra el error junto al campo y no se envía nada

#### Scenario: Guía duplicada
- **WHEN** el gateway responde 409 al guardar
- **THEN** se muestra "Ya existe un paquete con ese número de guía" y se conservan los datos escritos

#### Scenario: Guía vacía
- **WHEN** el número de guía se deja vacío
- **THEN** no se envía el campo, para que el gateway no lo trate como una guía vacía repetida

#### Scenario: Campos sin editar
- **WHEN** edita un paquete que ya tiene medidas, ventana horaria, remitente, destinatario, categoría, etiquetas, cliente, zona o duración de la estancia
- **THEN** esos datos se conservan intactos al guardar

#### Scenario: Paquete inexistente
- **WHEN** abre la edición de un identificador que el gateway responde con 404
- **THEN** se muestra "El registro ya no existe" con un enlace al listado

#### Scenario: Sin geocodificación
- **WHEN** el usuario escribe una dirección
- **THEN** la dirección se guarda como texto y la ubicación se elige en el mapa o con las coordenadas

### Requirement: Cambio de estado
La aplicación SHALL permitir cambiar el estado de un paquete a cualquier otro valor activo de `PackageStatus` y SHALL pedir confirmación antes de cancelarlo.

#### Scenario: Cambiar el estado
- **WHEN** el usuario elige "Atendido" en la acción de estado de un paquete pendiente
- **THEN** se pide el cambio al gateway, la fila muestra "Atendido" y se avisa del resultado

#### Scenario: Estados ofrecidos
- **WHEN** abre la acción de estado
- **THEN** se ofrecen los valores activos de `PackageStatus` menos el actual, con su etiqueta en español, y ninguno inactivo

#### Scenario: Paquete con un estado inactivo
- **WHEN** un paquete tiene un estado que el gateway marca como inactivo, como «Devuelto»
- **THEN** su fila sigue mostrando ese estado con su etiqueta, y la acción de estado ofrece solo los valores activos

#### Scenario: Cancelar un paquete
- **WHEN** elige "Cancelado"
- **THEN** se pide confirmación y solo se cambia el estado si confirma

#### Scenario: Error al cambiar
- **WHEN** el gateway rechaza el cambio
- **THEN** se muestra el mensaje del error y la fila conserva su estado

### Requirement: Borrado de paquetes
El borrado SHALL pedir confirmación y SHALL explicar el resultado cuando el paquete esté en uso.

#### Scenario: Confirmar
- **WHEN** el usuario confirma el borrado
- **THEN** se elimina, se avisa y el listado se recarga

#### Scenario: Paquete en uso
- **WHEN** el gateway rechaza el borrado con 400 o 409
- **THEN** se muestra "No se puede eliminar: el paquete está incluido en una jornada" y el paquete permanece en el listado

#### Scenario: Cambios sin guardar
- **WHEN** el usuario sale del formulario con cambios sin guardar
- **THEN** se le pide confirmar el descarte

### Requirement: Exportación a CSV
La aplicación SHALL exportar todos los paquetes del tenant a un fichero CSV legible en Excel.

#### Scenario: Descarga
- **WHEN** el usuario pulsa "Exportar CSV"
- **THEN** se piden todas las páginas, se muestra el progreso y se descarga `paquetes.csv`

#### Scenario: Formato
- **WHEN** se abre el fichero
- **THEN** usa `;` como separador, codificación UTF-8 con marca BOM, una cabecera en español (guía, longitud, latitud, ciudad, país, dirección, dirección estandarizada, precisión, estado de geocodificación, estado) y los textos con `;`, comillas o saltos de línea entrecomillados

#### Scenario: Inyección de fórmulas
- **WHEN** un texto empieza por `=`, `+`, `-` o `@`
- **THEN** se antepone un apóstrofo para que la hoja de cálculo no lo interprete como fórmula

#### Scenario: Error durante la exportación
- **WHEN** falla alguna de las peticiones
- **THEN** se muestra el mensaje del error, no se descarga nada y se puede reintentar

#### Scenario: Sin paquetes
- **WHEN** el tenant no tiene paquetes
- **THEN** la acción de exportar está desactivada

### Requirement: Acceso a la importación desde el listado
El listado de paquetes SHALL ofrecer la acción de importar paquetes desde un CSV.

#### Scenario: Botón de importación
- **WHEN** el usuario abre `/paquetes`
- **THEN** ve el botón «Importar CSV» junto a «Exportar CSV» y «Nuevo paquete», que lleva a `/paquetes/importar`

#### Scenario: Lista vacía
- **WHEN** el tenant no tiene paquetes
- **THEN** la pantalla de lista vacía ofrece también importar un CSV
