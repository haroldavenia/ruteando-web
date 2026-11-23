# Proposal

## Why

Al probar el acceso contra el gateway real (2026-10-28) apareció un desajuste que afecta a cualquier persona que se registre o restablezca su contraseña: el gateway exige **16 caracteres o más, con mayúscula, minúscula, dígito y un símbolo de `@$!%*?&`** (`400 PASSWORD_POLICY_VIOLATION`), pero la aplicación solo valida 8 caracteres en el cliente. Una contraseña de 10 o 12 caracteres pasa la validación local y el gateway la rechaza, y la persona no sabe por qué:

- En el **registro**, un `400` se muestra como «Revisa los datos e inténtalo de nuevo», sin decir cuál es la regla.
- En **restablecer contraseña**, la pantalla trata *todo* `400` como «el enlace no es válido o ha caducado», vacía el formulario y manda a pedir otro enlace. Con un token válido y una contraseña débil, la persona recibe un diagnóstico falso y no puede corregir la contraseña.

Se arregla ahora porque es un fallo visible en el flujo de entrada a la aplicación y porque la misma política aplicará al cambio de contraseña que se añadirá después.

## What Changes

- Se define la **política de contraseña del gateway** en el cliente (una sola fuente de verdad) y se valida en registro y en restablecer: mínimo 16 caracteres, al menos una mayúscula, una minúscula, un dígito y uno de `@$!%*?&`. El mínimo de 8 deja de aplicarse a estas dos pantallas.
- Las pantallas de **registro** y **restablecer** muestran la regla de forma visible y accesible (sugerencia del campo) y un mensaje de error que dice qué falta, antes de enviar.
- Si el gateway responde `PASSWORD_POLICY_VIOLATION` (por ejemplo, porque admite una regla distinta a la del cliente), el error se muestra en el formulario con el texto de la regla y **se conservan los datos escritos** salvo las contraseñas, como ya se hace con el correo duplicado.
- **Restablecer contraseña** distingue el motivo del `400` por el **código** del error, no por el estado: `INVALID_TOKEN` (y los estados 401, 404 y 410 de siempre) sigue mostrando «El enlace no es válido o ha caducado»; `PASSWORD_POLICY_VIOLATION` y `VALIDATION_ERROR` se muestran en el formulario sin descartar el enlace.
- Se actualiza `gateway-api.md` con los códigos de error y la política observados.
- Fuera de alcance:
  - **Formulario de conductores** (`features/fleet/drivers/`): comparte hoy el mínimo de 8 caracteres, pero el gateway no se ha probado para `POST /users`. Se conserva su comportamiento actual y se anota como comprobación pendiente.
  - Cambiar contraseña, editar perfil, invitaciones, OTP y el aviso de correo sin verificar (fases posteriores de la rama).
  - Cualquier cambio en el gateway o en el servidor Express.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities
- `access-screens`: la creación de cuenta y el restablecimiento exigen la política completa de contraseña, la muestran al usuario y distinguen un token no válido de una contraseña rechazada.
- `auth-session`: los errores de registro y de restablecimiento se identifican por el código del gateway (`PASSWORD_POLICY_VIOLATION`, `INVALID_TOKEN`) y llevan el mensaje que corresponde a cada uno.

## Impact

- `ng-ruteando/src/app/features/access/shared/form-utils.ts` (política y validador), `shared/form/access.messages.ts` y `shared/form/password-field.component.ts` (mensaje y sugerencia), `features/access/register/register.component.ts`, `features/access/reset-password/reset-password.component.ts`, `core/auth/auth-messages.ts`, y los specs de todos ellos.
- Fixtures: se añaden los errores reales capturados (`PASSWORD_POLICY_VIOLATION`, `INVALID_TOKEN`, `VALIDATION_ERROR`, `EMAIL_ALREADY_EXISTS`) para las pruebas.
- `.claude/skills/angular-ruteando/references/gateway-api.md`.
- Sin dependencias nuevas ni cambios en el servidor.
