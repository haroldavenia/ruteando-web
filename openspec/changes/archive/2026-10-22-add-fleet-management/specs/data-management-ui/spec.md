# Spec Delta

## Purpose

Define el comportamiento común de las pantallas de gestión de datos de la aplicación: listado paginado con búsqueda, formulario de alta y edición y borrado confirmado, con estados de carga, vacío y error, mensajes en español y accesibilidad.

## ADDED Requirements

### Requirement: Listado paginado
Las pantallas de listado SHALL mostrar los registros en una tabla paginada desde el servidor y SHALL permitir cambiar de página y de tamaño de página sin recargar la aplicación.

#### Scenario: Primera carga
- **WHEN** el usuario abre una pantalla de listado
- **THEN** se muestra un indicador de carga y, al recibir los datos, la primera página con el total de registros

#### Scenario: Cambio de página
- **WHEN** el usuario cambia de página o de tamaño de página
- **THEN** se solicitan solo los datos de esa página y la tabla conserva el orden de las columnas

### Requirement: Búsqueda en el listado
Los listados SHALL ofrecer un campo de búsqueda que filtre los registros ya cargados de la página actual, y SHALL indicar cuando ningún registro coincide.

#### Scenario: Filtrar por texto
- **WHEN** el usuario escribe en el campo de búsqueda
- **THEN** la tabla muestra solo las filas cuyo texto visible contiene lo escrito, sin distinguir mayúsculas ni acentos

#### Scenario: Sin coincidencias
- **WHEN** ninguna fila coincide con la búsqueda
- **THEN** se muestra el mensaje "No hay resultados" y la opción de limpiar la búsqueda

### Requirement: Estados vacío y de error
Los listados SHALL distinguir entre "no hay datos" y "no se pudieron cargar", y SHALL permitir reintentar la carga tras un error.

#### Scenario: Lista vacía
- **WHEN** el gateway responde sin registros
- **THEN** se muestra un mensaje de lista vacía con la acción principal de crear el primer registro

#### Scenario: Error de carga
- **WHEN** la carga falla
- **THEN** se muestra el mensaje de error en español, anunciado a tecnologías de apoyo, y un botón "Reintentar" que vuelve a pedir la misma página

### Requirement: Formulario de alta y edición
Los formularios de datos SHALL validar los campos antes de enviar, SHALL mostrar los errores junto a cada campo y SHALL llevar el foco al primer campo no válido al intentar enviar.

#### Scenario: Envío no válido
- **WHEN** el usuario envía el formulario con campos obligatorios vacíos
- **THEN** no se hace ninguna petición, se muestran los errores en español y el foco pasa al primer campo no válido

#### Scenario: Guardado correcto
- **WHEN** el usuario envía datos válidos
- **THEN** el botón queda desactivado mientras dura la petición, se confirma el resultado con un aviso y se vuelve al listado

#### Scenario: Error del servidor
- **WHEN** el gateway rechaza el guardado
- **THEN** el formulario permanece con los datos escritos y muestra el mensaje del error

#### Scenario: Edición de un registro inexistente
- **WHEN** se abre la edición de un identificador que el gateway responde con 404
- **THEN** se muestra el mensaje "El registro ya no existe" con un enlace de vuelta al listado

### Requirement: Salir con cambios sin guardar
Los formularios SHALL pedir confirmación antes de abandonar la pantalla con cambios sin guardar.

#### Scenario: Cancelar con cambios
- **WHEN** el usuario modifica un campo y pulsa "Cancelar" o navega a otra sección
- **THEN** se pregunta si desea descartar los cambios y solo se abandona la pantalla si confirma

#### Scenario: Cancelar sin cambios
- **WHEN** el usuario pulsa "Cancelar" sin haber modificado nada
- **THEN** vuelve al listado sin preguntar

### Requirement: Borrado confirmado
El borrado de un registro SHALL requerir confirmación explícita, con la acción destructiva nombrada con el verbo y el registro, y SHALL actualizar el listado al terminar.

#### Scenario: Confirmar el borrado
- **WHEN** el usuario pulsa "Eliminar" en una fila y confirma
- **THEN** se borra el registro, se muestra un aviso y el listado se recarga conservando la página si sigue habiendo filas en ella

#### Scenario: Cancelar el borrado
- **WHEN** el usuario cierra el diálogo con "Cancelar" o con Escape
- **THEN** no se borra nada y el foco vuelve al botón que lo abrió

#### Scenario: Registro en uso
- **WHEN** el gateway rechaza el borrado porque el registro está en uso
- **THEN** se explica en español que no se puede eliminar y el registro permanece en el listado

### Requirement: Accesibilidad de las pantallas de datos
Las tablas y formularios de datos SHALL ser operables solo con teclado y SHALL exponer etiquetas y regiones comprensibles en español.

#### Scenario: Acciones de fila
- **WHEN** el usuario recorre una fila con Tab
- **THEN** cada acción (editar, eliminar) es un botón con una etiqueta que nombra el registro, por ejemplo "Eliminar vehículo ABC123"

#### Scenario: Pantalla estrecha
- **WHEN** la pantalla mide 360 px de ancho
- **THEN** no hay desplazamiento horizontal de la página; la tabla se adapta o desplaza dentro de su propio contenedor
