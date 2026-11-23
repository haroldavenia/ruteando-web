# package-import Specification

## Purpose
Permite cargar muchos paquetes de una vez desde un archivo CSV: la aplicación lo lee en el navegador, valida cada fila, muestra una vista previa y, tras confirmar, crea los paquetes con progreso y un resumen de lo que ocurrió.

## Requirements

### Requirement: Ruta y permisos de la importación
La pantalla de importación SHALL estar en `/paquetes/importar` y SHALL ser accesible solo con sesión iniciada y rol `tenant_admin`, `super_admin` o `agent`.

#### Scenario: Acceso desde el listado
- **WHEN** el usuario pulsa «Importar CSV» en `/paquetes`
- **THEN** se abre `/paquetes/importar`

#### Scenario: Rol sin permiso
- **WHEN** un usuario con rol `driver` abre `/paquetes/importar`
- **THEN** es llevado a `/sin-permiso`

#### Scenario: Sin sesión
- **WHEN** un usuario anónimo abre `/paquetes/importar`
- **THEN** es llevado a `/acceso` con la ruta pedida como destino posterior

### Requirement: Plantilla y guía de campos
La pantalla SHALL ofrecer una plantilla CSV descargable y explicar cada columna.

#### Scenario: Descargar la plantilla
- **WHEN** pulsa «Descargar plantilla»
- **THEN** se descarga `plantilla-paquetes.csv` con la cabecera de columnas y una fila de ejemplo, en UTF-8 con BOM y separador `;`

#### Scenario: Guía de campos
- **WHEN** abre la pantalla
- **THEN** ve la lista de columnas con si son obligatorias, su formato y su valor por defecto, y un aviso de que se necesitan la longitud y la latitud porque la aplicación no calcula ubicaciones a partir de direcciones

### Requirement: Lectura del archivo
La aplicación SHALL leer el archivo CSV en el navegador y SHALL rechazar los archivos que no se puedan procesar con un mensaje claro.

#### Scenario: Formato admitido
- **WHEN** elige un archivo `.csv` en UTF-8, con o sin BOM, con separador `;` o `,`, con textos entre comillas que contengan separadores o saltos de línea
- **THEN** se lee correctamente y se detecta el separador

#### Scenario: Tipo no admitido
- **WHEN** elige un archivo que no es `.csv` o que está vacío
- **THEN** se muestra el motivo y no se procesa

#### Scenario: Demasiado grande
- **WHEN** el archivo supera 2 MB o tiene más de 2000 filas de datos
- **THEN** se rechaza explicando el límite y sugiriendo dividirlo

#### Scenario: Cabecera
- **WHEN** el archivo no trae las columnas obligatorias
- **THEN** se indica cuáles faltan y no se muestra la vista previa

#### Scenario: Codificación
- **WHEN** el texto contiene caracteres de sustitución (�)
- **THEN** se avisa de que el archivo probablemente no está en UTF-8 y se sugiere guardarlo con esa codificación

#### Scenario: Nada se envía
- **WHEN** se lee el archivo
- **THEN** no se hace ninguna petición al gateway hasta que el usuario confirma

### Requirement: Validación por fila
La aplicación SHALL validar cada fila y SHALL informar de cada error con su número de línea y su campo.

#### Scenario: Campos obligatorios
- **WHEN** una fila no tiene dirección, longitud o latitud
- **THEN** se rechaza con un mensaje que nombra la línea y el campo

#### Scenario: Coordenadas
- **WHEN** la latitud no está entre -90 y 90 o la longitud entre -180 y 180, o no son números
- **THEN** la fila se rechaza; se aceptan el punto y la coma como separador decimal

#### Scenario: Números
- **WHEN** el peso o el volumen son negativos o no numéricos, o las piezas no son un entero de 1 o más
- **THEN** la fila se rechaza

#### Scenario: Valores por defecto
- **WHEN** faltan el nombre, el tipo de servicio, el peso, el volumen o las piezas
- **THEN** se usan el número de guía o la dirección como nombre, «Entrega», 0, 0 y 1

#### Scenario: Tipo de servicio
- **WHEN** el tipo de servicio es «entrega», «recogida» o «mixto» (o sus claves `delivery`, `pickup`, `mixed`), sin distinguir mayúsculas ni tildes
- **THEN** se acepta; cualquier otro valor rechaza la fila

#### Scenario: Guía repetida en el archivo
- **WHEN** dos filas tienen el mismo número de guía
- **THEN** la segunda se rechaza indicando la línea de la primera

#### Scenario: Límites de texto
- **WHEN** un texto supera los 500 caracteres
- **THEN** la fila se rechaza

#### Scenario: Contenido no fiable
- **WHEN** una celda contiene `=`, `<script>` u otro contenido activo
- **THEN** se trata como texto plano: no se interpreta ni se ejecuta, y se muestra escapado

### Requirement: Vista previa
La aplicación SHALL mostrar un resumen y una vista previa antes de importar.

#### Scenario: Resumen
- **WHEN** termina la lectura
- **THEN** ve el total de filas, las válidas y las rechazadas, y la lista de errores ordenada por línea

#### Scenario: Muestra de filas
- **WHEN** hay filas válidas
- **THEN** ve una tabla con las primeras 20 (guía, nombre, dirección, ubicación, peso y volumen)

#### Scenario: Sin filas válidas
- **WHEN** todas las filas son inválidas
- **THEN** el botón de importar está desactivado y se explica por qué

#### Scenario: Cambiar de archivo
- **WHEN** elige otro archivo o pulsa «Quitar archivo»
- **THEN** se descarta la vista previa anterior

### Requirement: Importación con progreso
La aplicación SHALL crear los paquetes de las filas válidas con una concurrencia acotada y SHALL mostrar el progreso.

#### Scenario: Confirmar
- **WHEN** pulsa «Importar N paquetes»
- **THEN** se crean uno a uno con un máximo de 4 peticiones simultáneas y se muestra «Importando… X de N» con una barra de progreso, y el botón y la selección de archivo quedan desactivados

#### Scenario: Cuerpo de cada petición
- **WHEN** se crea un paquete
- **THEN** se envían nombre, tipo de servicio, dirección, ubicación como punto `[longitud, latitud]`, peso, volumen y, si tienen valor, guía, ciudad, país, código postal, piezas y observación

#### Scenario: Cancelar
- **WHEN** pulsa «Cancelar importación»
- **THEN** no se lanzan más peticiones, las ya creadas se conservan y el resumen indica cuántas quedaron sin procesar

#### Scenario: Salir a mitad
- **WHEN** el usuario abandona la pantalla durante la importación
- **THEN** se le pide confirmar y, si confirma, se detienen las peticiones

### Requirement: Resultado y reintento
La aplicación SHALL mostrar el resultado de la importación y SHALL permitir reintentar las filas fallidas y descargar un informe.

#### Scenario: Resumen final
- **WHEN** termina la importación
- **THEN** ve cuántos paquetes se crearon, cuántos ya existían (guía repetida, 409), cuántos fallaron y cuántos no se procesaron, anunciado a tecnologías de apoyo

#### Scenario: Guía ya existente
- **WHEN** el gateway responde 409 a una fila con guía
- **THEN** se cuenta como «ya existía», no como error, y no se reintenta

#### Scenario: Errores del gateway
- **WHEN** una petición falla por otro motivo
- **THEN** la fila queda como fallida con el mensaje del error y la importación continúa con las demás

#### Scenario: Saturación
- **WHEN** el gateway responde 429 o 503
- **THEN** se pausa un momento, se reduce la concurrencia y se reintenta esa fila hasta tres veces antes de darla por fallida

#### Scenario: Reintentar
- **WHEN** pulsa «Reintentar las fallidas»
- **THEN** se vuelven a crear solo esas filas

#### Scenario: Informe de errores
- **WHEN** hay filas rechazadas o fallidas
- **THEN** puede descargar `errores-importacion.csv` con la línea original, el campo y el motivo, en UTF-8 con BOM y con protección contra fórmulas

#### Scenario: Ir al listado
- **WHEN** termina la importación con paquetes creados
- **THEN** hay un enlace «Ver los paquetes» que lleva a `/paquetes`

### Requirement: Accesibilidad de la importación
La pantalla SHALL poder usarse con teclado y lector de pantalla.

#### Scenario: Selección de archivo
- **WHEN** usa solo el teclado
- **THEN** el control de archivo tiene una etiqueta, se activa con Intro o Espacio y el nombre del archivo elegido se anuncia

#### Scenario: Progreso y resultado
- **WHEN** cambian el progreso o el resultado
- **THEN** se anuncian en regiones `aria-live` sin mover el foco

#### Scenario: Tablas
- **WHEN** recorre la vista previa y la lista de errores
- **THEN** son tablas con cabeceras y título, y se adaptan a 360 px sin desplazamiento horizontal de la página
