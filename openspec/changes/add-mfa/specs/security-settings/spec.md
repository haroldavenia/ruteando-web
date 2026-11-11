## Purpose

Define las dos pantallas que gestionan el segundo factor: el módulo de Seguridad, reservado a los administradores para configurar la empresa, y la página de Perfil, donde cada persona activa y desactiva sus propios métodos.

## ADDED Requirements

### Requirement: Módulo de Seguridad para administradores
La aplicación SHALL ofrecer la ruta `/seguridad` solo a `tenant_admin` y `super_admin`, desde donde se activa o desactiva cada método para la empresa y se decide si el segundo factor es obligatorio.

#### Scenario: Acceso por rol
- **WHEN** una persona con otro rol abre `/seguridad`
- **THEN** se la lleva a la pantalla de sin permiso y el menú no le muestra la entrada

#### Scenario: Cambiar la política
- **WHEN** el administrador activa o desactiva un método o cambia la obligatoriedad y guarda
- **THEN** la política se guarda en el servidor, la pantalla confirma el cambio y refleja lo guardado al recargar

#### Scenario: Política imposible
- **WHEN** el administrador marca el segundo factor como obligatorio sin dejar ningún método permitido
- **THEN** la pantalla lo impide con un mensaje claro y no se guarda nada

#### Scenario: Restablecer el 2FA de una persona
- **WHEN** el administrador elige restablecer el 2FA de una persona de la lista de su empresa y confirma
- **THEN** se borran sus métodos y códigos, la pantalla lo confirma y la acción no se repite sin una nueva confirmación

#### Scenario: Servicio no disponible
- **WHEN** el servidor responde que el módulo está desactivado
- **THEN** la pantalla lo explica en lugar de mostrar controles que no pueden funcionar

### Requirement: Página de Perfil
La aplicación SHALL ofrecer `/perfil` a cualquier persona con sesión, con el estado de cada método permitido por su empresa y los controles para activarlo o desactivarlo.

#### Scenario: Estado de los métodos
- **WHEN** la persona abre su perfil
- **THEN** ve cada método con su estado (activo, sin activar o no permitido por la empresa) y los métodos no permitidos no se pueden activar

#### Scenario: Activar la aplicación autenticadora
- **WHEN** la persona inicia el alta de TOTP
- **THEN** ve el código QR y la clave en texto como alternativa accesible, y el método solo queda activo tras confirmar un código válido

#### Scenario: Activar SMS
- **WHEN** la persona escribe su teléfono en formato internacional y confirma el código que recibe
- **THEN** el teléfono queda verificado y el método SMS activo

#### Scenario: Activar el correo
- **WHEN** la persona activa el correo y confirma el código que le llega
- **THEN** el método queda activo

#### Scenario: Códigos de recuperación
- **WHEN** la persona activa su primer método o regenera los códigos
- **THEN** la pantalla muestra los 10 códigos una sola vez, con copiar y descargar, y avisa de que no volverán a mostrarse

#### Scenario: Desactivar un método
- **WHEN** la persona desactiva un método y escribe un código válido de un método activo
- **THEN** el método queda inactivo y la pantalla lo refleja

#### Scenario: Obligatorio para su empresa
- **WHEN** la empresa exige el segundo factor y la persona tiene un solo método activo
- **THEN** la pantalla avisa de que no puede desactivar el último método

### Requirement: Segundo paso en el acceso
La pantalla de acceso SHALL mostrar un segundo paso cuando el servidor devuelve un reto, con el método elegible, el campo del código, el reenvío y el uso de un código de recuperación.

#### Scenario: Reto de segundo factor
- **WHEN** el inicio de sesión devuelve `mfaRequired`
- **THEN** la pantalla pasa al segundo paso sin mostrar la contraseña ni guardar sesión alguna

#### Scenario: Código correcto
- **WHEN** la persona escribe un código válido
- **THEN** inicia la sesión y se la lleva a su destino habitual

#### Scenario: Código incorrecto o reto caducado
- **WHEN** el código es incorrecto, o el reto caducó o se agotaron los intentos
- **THEN** la pantalla lo avisa; si el reto ya no vale, vuelve al primer paso

#### Scenario: Activación obligatoria
- **WHEN** el inicio de sesión devuelve `mfaEnrollRequired`
- **THEN** la pantalla guía a activar un método permitido antes de entrar

#### Scenario: Accesibilidad
- **WHEN** se usa solo el teclado o un lector de pantalla
- **THEN** el campo del código recibe el foco, anuncia los errores y admite pegar el código completo

### Requirement: Textos en tres idiomas
Todo texto nuevo de estas pantallas SHALL estar traducido al inglés, al español y al portugués.

#### Scenario: Verificador de traducciones
- **WHEN** se ejecuta el verificador de traducciones de la integración continua
- **THEN** no reporta textos sin traducir ni marcadores inconsistentes
