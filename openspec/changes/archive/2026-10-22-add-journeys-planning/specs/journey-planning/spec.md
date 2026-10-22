# Spec Delta

## Purpose

Permite planificar jornadas de reparto a partir de una configuración y de paquetes elegidos, consultar el resultado (resumen, rutas, paradas y paquetes que no se pudieron planificar), listar las jornadas y borrarlas.

## ADDED Requirements

### Requirement: Rutas y permisos de jornadas
Las pantallas de jornadas SHALL estar bajo `/jornadas` y SHALL ser accesibles solo con sesión iniciada y rol `tenant_admin`, `super_admin` o `agent`.

#### Scenario: Rutas disponibles
- **WHEN** un usuario con alguno de esos roles abre `/jornadas`, `/jornadas/nueva` o `/jornadas/:id`
- **THEN** ve el listado, el formulario de planificación o el detalle

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `driver` abre una ruta de `/jornadas`
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** un usuario anónimo abre una ruta de `/jornadas`
- **THEN** es llevado a `/acceso` con la ruta pedida como destino posterior

### Requirement: Listado de jornadas
El listado SHALL mostrar nombre, estado, configuración, número de servicios, número de vehículos y fecha de creación de cada jornada, paginado desde el servidor.

#### Scenario: Columnas
- **WHEN** el usuario abre `/jornadas`
- **THEN** ve el nombre, el estado con etiqueta en español ("Planificada", "Completada"...), el nombre de la configuración, los servicios y vehículos (vacíos si el gateway no los informa) y la fecha

#### Scenario: Estado desconocido
- **WHEN** el gateway devuelve un estado sin etiqueta conocida
- **THEN** se muestra su clave tal cual

#### Scenario: Sin jornadas
- **WHEN** el tenant no tiene jornadas
- **THEN** se muestra el mensaje de lista vacía con la acción de planificar la primera

#### Scenario: Abrir el detalle
- **WHEN** el usuario pulsa el nombre de una jornada
- **THEN** se abre su detalle

### Requirement: Planificar una jornada
La aplicación SHALL permitir planificar una jornada indicando un nombre, una configuración y al menos un paquete.

#### Scenario: Campos obligatorios
- **WHEN** intenta planificar sin nombre, sin configuración o sin paquetes
- **THEN** se muestran los errores y no se envía nada

#### Scenario: Planificación correcta
- **WHEN** completa los datos y planifica
- **THEN** se envían el nombre, el identificador de la configuración y los identificadores de los paquetes, y al terminar se abre el detalle de la jornada creada

#### Scenario: Progreso
- **WHEN** la planificación está en curso
- **THEN** se muestra un indicador de progreso con un mensaje en español, el botón queda desactivado y no se puede lanzar una segunda planificación

#### Scenario: Sin configuraciones
- **WHEN** el tenant no tiene configuraciones
- **THEN** el formulario lo explica y enlaza a `/configuraciones/nuevo`

#### Scenario: Sin paquetes
- **WHEN** el tenant no tiene paquetes pendientes
- **THEN** el formulario lo explica y enlaza a `/paquetes/nuevo`

### Requirement: Selección de paquetes
La aplicación SHALL permitir elegir los paquetes de la jornada en una tabla paginada que conserve la selección entre páginas.

#### Scenario: Selección entre páginas
- **WHEN** marca paquetes en una página, cambia de página y marca otros
- **THEN** todos siguen marcados y se muestra el total seleccionado

#### Scenario: Seleccionar todos los pendientes
- **WHEN** pulsa "Seleccionar todos los pendientes"
- **THEN** se piden todas las páginas, se marcan los paquetes en estado pendiente y se muestra el total seleccionado

#### Scenario: Limpiar la selección
- **WHEN** pulsa "Quitar la selección"
- **THEN** no queda ningún paquete marcado

#### Scenario: Paquetes no pendientes
- **WHEN** hay paquetes atendidos, cancelados o devueltos
- **THEN** se muestran con su estado y se pueden marcar, pero no entran en "Seleccionar todos los pendientes"

#### Scenario: Accesibilidad
- **WHEN** recorre la tabla con el teclado
- **THEN** cada casilla tiene una etiqueta que nombra el paquete, por ejemplo "Seleccionar paquete G-10"

### Requirement: Errores de planificación
La aplicación SHALL explicar por qué falla una planificación y SHALL permitir reintentar sin perder el nombre, la configuración ni la selección.

#### Scenario: Rechazo del gateway
- **WHEN** el gateway responde 400 o 422
- **THEN** se muestra "No se pudo planificar la jornada" junto con el mensaje que devuelve el gateway

#### Scenario: Tiempo agotado
- **WHEN** el gateway o el proxy responden 502 o 504
- **THEN** se muestra "La planificación tardó demasiado o el servicio no respondió; vuelve a intentarlo" y se conserva la selección

#### Scenario: Configuración o paquete inexistente
- **WHEN** el gateway responde 404
- **THEN** se muestra que la configuración o algún paquete ya no existe

#### Scenario: Reintentar
- **WHEN** falla una planificación
- **THEN** el botón vuelve a estar activo con los mismos datos

### Requirement: Detalle de la jornada
El detalle SHALL mostrar el resumen de la jornada, sus rutas y paradas y los paquetes que no se pudieron planificar.

#### Scenario: Resumen
- **WHEN** abre `/jornadas/:id`
- **THEN** ve el nombre, el estado, la configuración, los totales de servicios, vehículos y zonas, y los tiempos mínimo, medio y máximo en formato de horas y minutos

#### Scenario: Rutas
- **WHEN** la jornada tiene rutas
- **THEN** ve una tabla con nombre, vehículo, número de paradas, distancia en kilómetros, duración, porcentaje de uso de peso y de volumen, e inicio y fin en hora local

#### Scenario: Paradas
- **WHEN** abre una ruta
- **THEN** ve sus paradas en orden con tipo en español, coordenadas, llegada y salida en hora local

#### Scenario: Paquetes no planificables
- **WHEN** el gateway informa de paquetes que no entraron en ninguna ruta
- **THEN** se listan con un enlace a la ficha de cada uno

#### Scenario: Sin rutas
- **WHEN** la jornada no tiene rutas
- **THEN** se muestra un mensaje que lo explica

#### Scenario: Jornada inexistente
- **WHEN** abre un identificador que el gateway responde con 404
- **THEN** se muestra "El registro ya no existe" con un enlace al listado

### Requirement: Borrado de jornadas
El borrado SHALL pedir confirmación y SHALL explicar el resultado.

#### Scenario: Confirmar
- **WHEN** el usuario confirma el borrado
- **THEN** se elimina, se avisa y el listado se recarga

#### Scenario: Error
- **WHEN** el gateway rechaza el borrado
- **THEN** se muestra el mensaje del error y la jornada permanece en el listado
