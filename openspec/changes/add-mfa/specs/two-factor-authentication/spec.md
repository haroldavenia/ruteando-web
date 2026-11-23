## Purpose

Define el segundo factor de autenticación que impone el servidor en el inicio de sesión: el reto, los tres métodos (correo, SMS y aplicación autenticadora), los códigos de recuperación, la política de la empresa y los límites que lo protegen.

## ADDED Requirements

### Requirement: El segundo factor lo impone el servidor
El servidor SHALL atender `POST /gateway/auth/login` por sí mismo: valida las credenciales con el gateway y SHALL NOT entregar al navegador ningún token (de acceso ni de refresco) de una persona con segundo factor exigido hasta que lo haya superado.

#### Scenario: Persona sin segundo factor exigido
- **WHEN** las credenciales son válidas y ni la persona ni la política de su empresa exigen segundo factor
- **THEN** la respuesta es la misma sesión que entrega el gateway, sin pasos adicionales

#### Scenario: Persona con segundo factor
- **WHEN** las credenciales son válidas y la persona tiene al menos un método activo
- **THEN** la respuesta es `200` con `mfaRequired: true`, un identificador de reto, los métodos disponibles (con el destino enmascarado) y ningún token

#### Scenario: Credenciales incorrectas
- **WHEN** el gateway rechaza las credenciales
- **THEN** la respuesta es la del gateway (el mismo estado y mensaje) y no se crea ningún reto

#### Scenario: Saltarse el reto
- **WHEN** se llama directamente a `/gateway/auth/login` o a otra ruta del gateway sin haber superado el reto
- **THEN** no se obtiene ninguna sesión: los tokens de una persona con segundo factor solo existen en el servidor hasta la verificación

#### Scenario: Retos de corta vida
- **WHEN** pasan 5 minutos desde que se crea un reto sin completarlo
- **THEN** el reto caduca, los tokens retenidos se descartan y hay que iniciar sesión de nuevo

### Requirement: Verificación del reto
El servidor SHALL exponer la verificación del reto en `POST /gateway/mfa/login/verify` con el identificador del reto, el método y el código, y SHALL entregar la sesión del gateway solo si el código es válido.

#### Scenario: Código correcto
- **WHEN** se envía un código válido del método elegido
- **THEN** la respuesta es la sesión original del gateway, el reto se consume y no puede reutilizarse

#### Scenario: Código incorrecto
- **WHEN** el código no es válido
- **THEN** la respuesta es `401` con un mensaje genérico, no se entrega ningún token y se cuenta un intento fallido

#### Scenario: Intentos agotados
- **WHEN** se acumulan 5 intentos fallidos en el mismo reto
- **THEN** el reto se invalida, las siguientes verificaciones responden `429` y hay que iniciar sesión de nuevo

#### Scenario: Bloqueo por persona
- **WHEN** una persona acumula 10 códigos erróneos en 15 minutos, repartidos en uno o varios retos o en acciones con sesión
- **THEN** el inicio de sesión no abre ningún reto nuevo, las verificaciones y las confirmaciones responden `429` aunque el código sea correcto, y todo vuelve a la normalidad al terminar la ventana; las demás personas no se ven afectadas

#### Scenario: Método no disponible
- **WHEN** se verifica con un método que la persona no tiene activo o que la empresa tiene desactivado
- **THEN** la respuesta es `400` y no cuenta como código válido

### Requirement: Código por correo electrónico
El servidor SHALL enviar un código de 6 dígitos de un solo uso, válido 5 minutos, al correo de la cuenta mediante SMTP, y SHALL guardarlo solo como huella, nunca en claro.

#### Scenario: Envío del código
- **WHEN** la persona elige el correo como método del reto
- **THEN** recibe un mensaje con el código en su correo y la respuesta lo confirma con el correo enmascarado, sin incluir el código

#### Scenario: Reenvío limitado
- **WHEN** se piden más de 3 envíos del mismo método en 10 minutos para la misma persona
- **THEN** la respuesta es `429` y no se envía ningún mensaje

#### Scenario: Intentos erróneos del código
- **WHEN** se escriben 5 códigos erróneos contra el mismo código enviado
- **THEN** ese código se descarta y el correcto también falla; hay que pedir uno nuevo

#### Scenario: Código usado o caducado
- **WHEN** se presenta un código ya usado o con más de 5 minutos
- **THEN** la verificación falla como un código incorrecto

#### Scenario: Correo en desarrollo
- **WHEN** el servidor corre con el Docker de desarrollo
- **THEN** los mensajes llegan a la bandeja local de Mailpit y no salen a internet

### Requirement: Código por SMS
El servidor SHALL enviar el código por SMS al teléfono que la persona verificó previamente, a través de Twilio Verify, y SHALL NOT enviar SMS si no están configuradas las credenciales del proveedor.

#### Scenario: Teléfono verificado
- **WHEN** la persona elige SMS en el reto y tiene un teléfono verificado
- **THEN** recibe el código por SMS y la respuesta lo confirma con el número enmascarado

#### Scenario: Sin credenciales del proveedor
- **WHEN** faltan las credenciales de Twilio
- **THEN** el método SMS no aparece como disponible para nadie, y no se intenta ninguna llamada al proveedor

#### Scenario: Proveedor de desarrollo
- **WHEN** el servidor se configura con el proveedor de desarrollo
- **THEN** no se envía ningún SMS real: el texto del mensaje se entrega solo a la bandeja local de Mailpit (el registro del servidor nunca lleva el código)

#### Scenario: Teléfono sin verificar
- **WHEN** la persona no ha verificado ningún teléfono
- **THEN** SMS no figura entre sus métodos del reto

### Requirement: Aplicación autenticadora (TOTP)
El servidor SHALL admitir códigos de un solo uso basados en tiempo (6 dígitos, paso de 30 segundos, compatibles con Google Authenticator) y SHALL guardar el secreto cifrado.

#### Scenario: Alta del método
- **WHEN** la persona inicia el alta de TOTP
- **THEN** recibe la clave en texto y la dirección `otpauth://` para el código QR, y el método no queda activo hasta que confirme con un código válido generado por su aplicación

#### Scenario: Código con desfase de reloj
- **WHEN** el código corresponde al paso anterior o al siguiente
- **THEN** se acepta; un código de cualquier otro paso se rechaza

#### Scenario: Código ya usado
- **WHEN** se presenta un código TOTP que ya se aceptó en su mismo paso
- **THEN** se rechaza

### Requirement: Códigos de recuperación
El servidor SHALL generar 10 códigos de recuperación de un solo uso al activar el primer método y SHALL mostrarlos una única vez; solo se guardan como huellas.

#### Scenario: Uso de un código de recuperación
- **WHEN** se presenta un código de recuperación válido en el reto
- **THEN** se acepta como segundo factor, se consume y la respuesta indica cuántos quedan

#### Scenario: Regeneración
- **WHEN** la persona pide nuevos códigos tras verificar un segundo factor
- **THEN** los anteriores dejan de valer y se muestran los nuevos una sola vez

#### Scenario: Restablecimiento por un administrador
- **WHEN** un administrador restablece el 2FA de una persona de su empresa
- **THEN** se borran sus métodos y sus códigos, y en el siguiente inicio de sesión se aplica la política de la empresa como a una persona sin métodos

### Requirement: Política de la empresa
El servidor SHALL guardar por empresa qué métodos están permitidos y si el segundo factor es obligatorio (para todos o para ciertos roles); por defecto todos los métodos están permitidos y nada es obligatorio.

#### Scenario: Método desactivado por la empresa
- **WHEN** el administrador desactiva un método
- **THEN** ninguna persona de la empresa puede usarlo ni activarlo, y los factores ya guardados se conservan inactivos por si se reactiva

#### Scenario: Segundo factor obligatorio sin métodos
- **WHEN** la política lo exige y la persona no tiene ningún método activo
- **THEN** el inicio de sesión devuelve `mfaEnrollRequired` con un reto, y la persona solo recibe su sesión al activar un método con ese reto

#### Scenario: Todos los métodos de la persona desactivados
- **WHEN** la política obliga al 2FA y la empresa desactiva todos los métodos que la persona tenía
- **THEN** en el siguiente inicio de sesión se le pide activar uno de los permitidos

#### Scenario: Sin ningún método permitido
- **WHEN** la política exige el segundo factor pero la empresa no permite ningún método
- **THEN** el servidor rechaza guardar esa política

### Requirement: Gestión de métodos con sesión
El servidor SHALL validar la sesión de quien llama a `/gateway/mfa/**` con el gateway (identidad, rol y empresa) y SHALL exigir un código de un método activo para desactivar un método propio o regenerar los códigos de recuperación.

#### Scenario: Sin sesión
- **WHEN** se llama a un endpoint de gestión sin un token válido
- **THEN** la respuesta es `401`

#### Scenario: Desactivar un método
- **WHEN** la persona pide desactivar su método sin enviar un código válido
- **THEN** la respuesta es `401` y el método sigue activo

#### Scenario: Activar de nuevo un método ya activo
- **WHEN** la persona intenta activar de nuevo un método que ya tiene verificado (por ejemplo, con otro teléfono)
- **THEN** la respuesta es `409`, el método sigue verificado sin cambios y no se envía ningún código; para cambiarlo hay que desactivarlo antes con un código válido

#### Scenario: El reto de activación no es una sesión
- **WHEN** quien solo tiene un reto de activación obligatoria (sin haber superado el segundo factor) llama a cualquier ruta que no sea el estado o el alta y la confirmación de un método
- **THEN** la respuesta es `403` y no cambia nada: ni la política, ni los restablecimientos, ni las bajas, ni los códigos de recuperación

#### Scenario: Políticas de otra empresa
- **WHEN** un administrador intenta leer o cambiar la política o los factores de una empresa que no es la suya
- **THEN** la respuesta es `403`; solo `super_admin` puede actuar sobre otra empresa

### Requirement: Secretos y almacenamiento
El servidor SHALL cifrar los secretos TOTP con una clave propia (`MFA_SECRET_KEY`), SHALL guardar solo huellas de los códigos y SHALL desactivar todo el módulo si esa clave falta.

#### Scenario: Clave ausente
- **WHEN** `MFA_SECRET_KEY` no está definida
- **THEN** el módulo queda desactivado con un aviso en el registro, el login pasa sin reto y `/gateway/mfa/**` responde `503`

#### Scenario: Secretos fuera de las respuestas y del registro
- **WHEN** se atiende cualquier petición de 2FA
- **THEN** ninguna respuesta (salvo la clave TOTP del alta) ni el registro contienen códigos, secretos, tokens o contraseñas

### Requirement: Simulado y verificación local
El entorno de desarrollo SHALL permitir probar los tres métodos sin cuentas externas.

#### Scenario: Bandeja local
- **WHEN** se levanta el Docker de desarrollo
- **THEN** existe una bandeja Mailpit accesible en el navegador donde aparecen los códigos por correo y los mensajes del proveedor de SMS de desarrollo

#### Scenario: Gateway simulado
- **WHEN** el servidor corre con `GATEWAY_MODE=mock`
- **THEN** el login con segundo factor funciona contra el gateway simulado, que no necesita ninguna ruta de OTP propia
