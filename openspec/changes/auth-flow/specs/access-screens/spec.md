# Spec Delta

## MODIFIED Requirements

### Requirement: Creación de cuenta
La aplicación SHALL permitir crear una cuenta con nombre, apellidos, nombre de la empresa, correo y contraseña confirmada, SHALL exigir una contraseña que cumpla la política del gateway, SHALL mostrar sus requisitos como una lista que se marca punto por punto al escribir y SHALL indicar que debe verificar su correo.

#### Scenario: Registro correcto
- **WHEN** el usuario envía el formulario con datos válidos
- **THEN** se crea la cuenta, se muestra un panel "Revisa tu correo" con la dirección usada y no se inicia sesión

#### Scenario: Contraseñas que no coinciden
- **WHEN** la confirmación es distinta de la contraseña
- **THEN** se muestra "Las contraseñas no coinciden" en el campo de confirmación y no se envía nada

#### Scenario: Los requisitos aparecen al enfocar la contraseña
- **WHEN** el usuario enfoca el campo de contraseña
- **THEN** aparece una lista con cinco requisitos (al menos 16 caracteres, una mayúscula, una minúscula, un número y un símbolo de `@$!%*?&`), todos pendientes, y los lectores de pantalla la reciben como descripción del campo

#### Scenario: Los requisitos se marcan al escribir
- **WHEN** el usuario escribe en el campo de contraseña
- **THEN** cada requisito pasa a cumplido en cuanto se satisface y vuelve a pendiente si deja de cumplirse, sin esperar al envío, y su estado se indica con un icono y un texto además del color

#### Scenario: La lista se oculta al cumplirlos todos
- **WHEN** el campo pierde el foco con los cinco requisitos cumplidos
- **THEN** la lista se oculta, y si queda algún requisito sin cumplir permanece visible

#### Scenario: Contraseña demasiado corta
- **WHEN** el usuario envía con una contraseña de menos de 16 caracteres
- **THEN** no se envía nada, el campo muestra "La contraseña no cumple los requisitos" y la lista queda visible con "Al menos 16 caracteres" marcado como no cumplido

#### Scenario: Contraseña sin los tipos de carácter exigidos
- **WHEN** el usuario envía con una contraseña de 16 caracteres o más a la que le falta una mayúscula, una minúscula, un número o un símbolo de `@$!%*?&`
- **THEN** no se envía nada, el campo muestra "La contraseña no cumple los requisitos" y los requisitos que faltan quedan marcados como no cumplidos

#### Scenario: Contraseña rechazada por el gateway
- **WHEN** el gateway responde que la contraseña incumple su política
- **THEN** se muestra la regla de la contraseña en lugar del mensaje genérico, el formulario conserva los datos escritos, salvo las contraseñas, y el foco pasa al campo de contraseña

#### Scenario: Campos obligatorios
- **WHEN** el usuario envía con algún campo obligatorio vacío o con un correo no válido
- **THEN** cada campo afectado muestra su error y no se envía nada

#### Scenario: Correo ya registrado
- **WHEN** el gateway responde que ya existe una cuenta con ese correo
- **THEN** se muestra "Ya existe una cuenta con ese correo" y el formulario conserva los datos escritos, salvo las contraseñas

#### Scenario: Reenviar el correo de verificación
- **WHEN** el usuario pulsa "Reenviar correo" en el panel "Revisa tu correo"
- **THEN** se solicita el reenvío, se muestra "Si el correo existe, recibirás instrucciones de verificación" y el botón queda desactivado mientras dura la petición

### Requirement: Restablecimiento de contraseña
La aplicación SHALL permitir fijar una contraseña nueva, que cumpla la política del gateway y con la misma lista de requisitos que el registro, a partir del enlace con `token` recibido por correo, y SHALL distinguir un enlace no válido de una contraseña rechazada.

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
- **WHEN** la confirmación no coincide o la contraseña no cumple los requisitos
- **THEN** se muestra el error del campo y no se envía nada, y los requisitos que faltan quedan marcados como no cumplidos

#### Scenario: Los requisitos aparecen al enfocar la contraseña nueva
- **WHEN** el usuario enfoca el campo de contraseña nueva en `/acceso/restablecer?token=T`
- **THEN** aparece la misma lista de requisitos que en el registro y se marca punto por punto al escribir

#### Scenario: Contraseña rechazada con un enlace válido
- **WHEN** el gateway responde que la contraseña incumple su política, y no que el token sea inválido
- **THEN** se mantiene el formulario, se muestra la regla de la contraseña, se vacían los dos campos de contraseña, el enlace sigue siendo utilizable sin pedir otro y el foco pasa al campo de contraseña nueva

#### Scenario: El token no queda en el historial
- **WHEN** la pantalla ha leído el token
- **THEN** la dirección del navegador se sustituye por una sin `token`, sin añadir una entrada al historial
