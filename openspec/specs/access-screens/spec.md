# access-screens Specification

## Purpose
Define las pantallas con las que una persona entra en la aplicación: iniciar sesión, crear una cuenta, verificar su correo y recuperar o restablecer su contraseña, con validación, mensajes en español, redirección segura y accesibilidad.

## Requirements

### Requirement: Rutas de acceso
La aplicación SHALL ofrecer las pantallas de acceso en rutas propias y SHALL llevar a la página de inicio a quien ya tenga sesión cuando abra las pantallas pensadas para visitantes.

#### Scenario: Rutas disponibles
- **WHEN** se abren `/acceso`, `/acceso/registro`, `/acceso/recuperar`, `/acceso/verificar-email` y `/acceso/restablecer`
- **THEN** cada una muestra su pantalla: inicio de sesión, crear cuenta, recuperar contraseña, verificar correo y restablecer contraseña

#### Scenario: Visitante con sesión iniciada
- **WHEN** un usuario con sesión abre `/acceso`, `/acceso/registro` o `/acceso/recuperar`
- **THEN** es llevado a la página de inicio

#### Scenario: Enlaces de correo con sesión iniciada
- **WHEN** un usuario con sesión abre `/acceso/verificar-email` o `/acceso/restablecer` desde un enlace de correo
- **THEN** la pantalla se muestra igualmente y no se le redirige

### Requirement: Inicio de sesión
La aplicación SHALL permitir iniciar sesión con correo y contraseña, validar los campos antes de enviar y explicar el resultado con mensajes en español.

#### Scenario: Credenciales correctas
- **WHEN** el usuario introduce un correo y una contraseña válidos y envía el formulario
- **THEN** inicia sesión y es llevado a su destino (la ruta de origen o la página de inicio)

#### Scenario: Credenciales incorrectas
- **WHEN** el gateway rechaza las credenciales
- **THEN** se muestra "Correo o contraseña incorrectos", el usuario permanece en la pantalla, el campo de contraseña se vacía y recibe el foco

#### Scenario: Campos vacíos o correo mal escrito
- **WHEN** el usuario envía con algún campo vacío o con un correo que no es válido
- **THEN** no se envía nada y cada campo afectado muestra su error ("Introduce tu correo", "Introduce un correo válido", "Introduce tu contraseña")

#### Scenario: Envío en curso
- **WHEN** el formulario se ha enviado y el gateway aún no ha respondido
- **THEN** el botón queda desactivado con un indicador de progreso y no se puede enviar una segunda vez

#### Scenario: Sin credenciales precargadas
- **WHEN** se abre `/acceso`
- **THEN** los campos de correo y contraseña están vacíos

#### Scenario: Fallo del servicio
- **WHEN** el envío falla por falta de conexión o por un error del servidor
- **THEN** se muestra el mensaje genérico del error y el usuario puede volver a intentarlo sin perder el correo escrito

#### Scenario: Enlaces a otras pantallas
- **WHEN** el usuario está en la pantalla de inicio de sesión
- **THEN** dispone de enlaces a "¿Olvidaste tu contraseña?" y a "Crear cuenta"

### Requirement: Destino seguro tras iniciar sesión
La aplicación SHALL llevar al usuario tras iniciar sesión solo a rutas internas de la propia aplicación indicadas en `returnUrl`.

#### Scenario: Ruta interna
- **WHEN** el usuario inicia sesión desde `/acceso?returnUrl=%2Fjourneys%3Fpage%3D2`
- **THEN** es llevado a `/journeys?page=2`

#### Scenario: Sin destino
- **WHEN** el usuario inicia sesión desde `/acceso` sin `returnUrl`
- **THEN** es llevado a la página de inicio

#### Scenario: Destino externo
- **WHEN** `returnUrl` es `https://otro.example/ruta`, `//otro.example`, `/\otro.example` o `javascript:alert(1)`
- **THEN** se ignora y el usuario es llevado a la página de inicio

#### Scenario: Destino que vuelve al acceso
- **WHEN** `returnUrl` apunta a una ruta de `/acceso`
- **THEN** se ignora y el usuario es llevado a la página de inicio

### Requirement: Creación de cuenta
La aplicación SHALL permitir crear una cuenta con nombre, apellidos, nombre de la empresa, correo y contraseña confirmada, y SHALL indicar al usuario que debe verificar su correo.

#### Scenario: Registro correcto
- **WHEN** el usuario envía el formulario con datos válidos
- **THEN** se crea la cuenta, se muestra un panel "Revisa tu correo" con la dirección usada y no se inicia sesión

#### Scenario: Contraseñas que no coinciden
- **WHEN** la confirmación es distinta de la contraseña
- **THEN** se muestra "Las contraseñas no coinciden" en el campo de confirmación y no se envía nada

#### Scenario: Contraseña demasiado corta
- **WHEN** la contraseña tiene menos de 8 caracteres
- **THEN** se muestra "Usa al menos 8 caracteres" y no se envía nada

#### Scenario: Campos obligatorios
- **WHEN** el usuario envía con algún campo obligatorio vacío o con un correo no válido
- **THEN** cada campo afectado muestra su error y no se envía nada

#### Scenario: Correo ya registrado
- **WHEN** el gateway responde que ya existe una cuenta con ese correo
- **THEN** se muestra "Ya existe una cuenta con ese correo" y el formulario conserva los datos escritos, salvo las contraseñas

#### Scenario: Reenviar el correo de verificación
- **WHEN** el usuario pulsa "Reenviar correo" en el panel "Revisa tu correo"
- **THEN** se solicita el reenvío, se muestra "Si el correo existe, recibirás instrucciones de verificación" y el botón queda desactivado mientras dura la petición

### Requirement: Verificación del correo
La aplicación SHALL verificar el correo a partir del enlace con `token`, iniciar sesión con el resultado y avisar al usuario.

#### Scenario: Enlace válido
- **WHEN** el usuario abre `/acceso/verificar-email?token=T` con un token válido
- **THEN** el token se envía una sola vez, se inicia sesión, se muestra "Correo verificado" y el usuario es llevado a la página de inicio

#### Scenario: Enlace no válido o caducado
- **WHEN** el gateway rechaza el token
- **THEN** se muestra "El enlace no es válido o ha caducado" con un campo de correo para reenviar la verificación y un enlace a iniciar sesión

#### Scenario: Sin token
- **WHEN** el usuario abre `/acceso/verificar-email` sin `token`
- **THEN** se muestra el mismo mensaje de enlace no válido sin llamar al gateway

#### Scenario: El token no queda en el historial
- **WHEN** la pantalla ha leído el token
- **THEN** la dirección del navegador se sustituye por una sin `token`, sin añadir una entrada al historial

### Requirement: Recuperación de contraseña
La aplicación SHALL permitir pedir un enlace para restablecer la contraseña sin revelar si el correo existe.

#### Scenario: Solicitud
- **WHEN** el usuario envía un correo válido
- **THEN** se muestra siempre el mismo mensaje "Si el correo existe, recibirás instrucciones para restablecer tu contraseña", exista o no la cuenta

#### Scenario: Correo vacío o mal escrito
- **WHEN** el usuario envía sin correo o con un correo no válido
- **THEN** no se envía nada y se muestra el error del campo

#### Scenario: Fallo del servicio
- **WHEN** la solicitud falla por falta de conexión o por un error del servidor
- **THEN** se muestra el mensaje genérico del error, no la confirmación, y el usuario puede reintentar

#### Scenario: Volver al inicio de sesión
- **WHEN** el usuario está en la pantalla de recuperación
- **THEN** dispone de un enlace para volver a iniciar sesión

### Requirement: Restablecimiento de contraseña
La aplicación SHALL permitir fijar una contraseña nueva a partir del enlace con `token` recibido por correo.

#### Scenario: Restablecimiento correcto
- **WHEN** el usuario abre `/acceso/restablecer?token=T`, escribe y confirma una contraseña válida y envía
- **THEN** se cambia la contraseña con ese token, el usuario es llevado a `/acceso` con el aviso "Contraseña actualizada, ya puedes iniciar sesión" y no se inicia sesión automáticamente

#### Scenario: Enlace no válido o caducado
- **WHEN** el gateway rechaza el token al enviar
- **THEN** se muestra "El enlace no es válido o ha caducado" con un enlace para solicitar otro

#### Scenario: Sin token
- **WHEN** el usuario abre `/acceso/restablecer` sin `token`
- **THEN** se muestra el mensaje de enlace no válido con el enlace para solicitar otro y no se muestra el formulario

#### Scenario: Contraseñas no válidas
- **WHEN** la confirmación no coincide o la contraseña tiene menos de 8 caracteres
- **THEN** se muestra el error del campo y no se envía nada

#### Scenario: El token no queda en el historial
- **WHEN** la pantalla ha leído el token
- **THEN** la dirección del navegador se sustituye por una sin `token`, sin añadir una entrada al historial

### Requirement: Aspecto y accesibilidad de las pantallas de acceso
Las pantallas de acceso SHALL usar un diseño propio sin barra ni menú lateral, y SHALL ser utilizables con teclado, lector de pantalla y en pantallas estrechas.

#### Scenario: Diseño propio
- **WHEN** se abre cualquier pantalla de acceso
- **THEN** se muestra el nombre de la aplicación y el formulario centrado, sin la barra superior ni el menú lateral del área privada

#### Scenario: Campos y errores accesibles
- **WHEN** un campo tiene un error
- **THEN** el error está asociado al campo para los lectores de pantalla y, tras un envío inválido, el foco pasa al primer campo con error

#### Scenario: Resultados anunciados
- **WHEN** aparece un mensaje de resultado (éxito o error del envío)
- **THEN** se anuncia a los lectores de pantalla sin mover el foco

#### Scenario: Teclado
- **WHEN** el usuario rellena un formulario con el teclado
- **THEN** el orden de tabulación sigue el orden visual y la tecla Intro envía el formulario

#### Scenario: Mostrar u ocultar la contraseña
- **WHEN** el usuario activa el botón de mostrar contraseña de un campo de contraseña
- **THEN** el texto pasa a verse y el botón expone una etiqueta descriptiva en español que indica su estado

#### Scenario: Autocompletado del navegador
- **WHEN** el navegador o un gestor de contraseñas inspecciona los formularios
- **THEN** los campos declaran su finalidad (correo de usuario, contraseña actual, contraseña nueva, nombre, apellidos y organización)

#### Scenario: Pantalla estrecha
- **WHEN** el ancho de la ventana es de 360px
- **THEN** el formulario se ve completo sin desplazamiento horizontal

#### Scenario: Idioma
- **WHEN** se muestra cualquier texto de las pantallas de acceso
- **THEN** está en español

### Requirement: Carga diferida de las pantallas de acceso
Las pantallas de acceso SHALL cargarse bajo demanda sin aumentar el tamaño del bundle inicial.

#### Scenario: Presupuesto del bundle inicial
- **WHEN** se ejecuta el build de producción con las pantallas de acceso incluidas
- **THEN** el bundle inicial no supera los 500kB y el build no emite avisos de presupuesto

#### Scenario: Un fragmento por pantalla
- **WHEN** se inspecciona la salida del build
- **THEN** cada pantalla de acceso está en un fragmento diferido y no en el bundle inicial

#### Scenario: Estilos de componente
- **WHEN** se ejecuta el build de producción
- **THEN** ningún estilo de componente de acceso supera el límite de error de 4kB
