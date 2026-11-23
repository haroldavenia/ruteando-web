# Design

## Context

Ver proposal.md (Why). Estado observado en el código y en el gateway real (2026-10-28):

- `features/access/shared/form-utils.ts` exporta `PASSWORD_MIN_LENGTH = 8`. Lo usan `register.component.ts`, `reset-password.component.ts` y también `features/fleet/drivers/driver-form.component.ts`. El mensaje `minlength` («Usa al menos 8 caracteres») vive en `shared/form/access.messages.ts` y lo comparten los tres formularios.
- `PasswordFieldComponent` (`shared/form/`) recibe un control, una etiqueta y `messages`; no tiene sugerencia (`mat-hint`).
- `ApiError.code` ya sale del campo `error` del gateway cuando tiene forma de código (`readErrorBody`), y `withErrorMessage` da prioridad al código sobre el estado dentro del mismo nivel. `registerErrors()` y `linkErrors()` (`core/auth/auth-messages.ts`) solo mapean estados.
- `reset-password.component.ts` define `LINK_ERRORS = [400, 401, 404, 410]` y trata cualquiera como «enlace no válido»; además `linkErrors()` mapea el 400 al mensaje de enlace no válido, de modo que ya el mensaje del error es el equivocado.
- Respuestas reales del gateway: contraseña débil → `400 PASSWORD_POLICY_VIOLATION` («Password must be at least 16 characters and contain uppercase, lowercase, digit and special character (@$!%*?&).»); token inválido → `400 INVALID_TOKEN`; campos vacíos → `400 VALIDATION_ERROR`; correo duplicado → `409 EMAIL_ALREADY_EXISTS`. En el restablecimiento el token se valida **antes** que la contraseña (con un token falso siempre responde `INVALID_TOKEN`); en el registro se valida el correo antes que la contraseña.
- Los fixtures de `src/testing/fixtures/gateway/` se generan desde la colección Postman, que no trae ninguna respuesta de error.

## Goals / Non-Goals

**Goals:**
- Que la persona vea los requisitos al empezar a escribir y cuáles ya cumple, sin ir y volver al gateway.
- Que el diagnóstico del `400` en restablecer sea correcto y no destruya un enlace válido.
- Una sola definición de la política en el cliente.

**Non-Goals:**
- No se replica el cálculo de «fortaleza» ni se bloquean contraseñas comunes: la autoridad es el gateway.
- No se cambia el formulario de conductores ni se toca el servidor Express.
- No se traduce el texto en inglés del gateway: la aplicación usa su propio mensaje en español por código.

## Decisions

1. **Validador propio `passwordPolicy` y constantes de política en `core/auth/password-policy.ts`** (no en `form-utils.ts`: la usan también `shared/form/access.messages.ts` y `core/auth/auth-messages.ts`, y `shared/` y `core/` no importan de `features/`), sin tocar `PASSWORD_MIN_LENGTH`. Registro y restablecer usan `passwordPolicy` (que devuelve un error `policy` con las reglas que faltan: `{ length, upper, lower, digit, symbol }`); el formulario de conductores sigue con `PASSWORD_MIN_LENGTH = 8`. Alternativa: subir `PASSWORD_MIN_LENGTH` a 16; descartada porque cambiaría sin pruebas el formulario de conductores (`POST /users` no se ha probado contra el gateway) y porque el mínimo y la política completa son cosas distintas.
2. **El símbolo exigido es uno de `@$!%*?&`; el resto de caracteres no se prohíbe en el cliente.** El gateway da esa lista y no está comprobado si rechaza otros símbolos (`#`, `_`…). Si la rechaza, responde `PASSWORD_POLICY_VIOLATION` y el flujo de la decisión 5 muestra la regla. Así el cliente no es más estricto que el gateway ni se queda corto sin red de seguridad. Alternativa: aceptar cualquier símbolo como «especial»; descartada porque dejaría pasar `Contraseña#2026abcd` que el gateway podría rechazar, con el mismo mal diagnóstico de hoy.
3. **Los requisitos son una lista que se marca punto por punto, dentro de `PasswordFieldComponent`** (`input` `requirements`), que sustituye al texto de ayuda. Cinco puntos con icono y texto de estado («cumplido», «pendiente», «no cumplido»), que no dependen solo del color. Se muestra **al enfocar el campo** y permanece visible mientras el campo se haya tocado y falte algún requisito, de modo que tras un envío fallido se ve qué falta; se oculta al salir con todo cumplido. Si no se muestra, la lista sigue en el DOM oculta visualmente y enlazada con `aria-describedby` (vía el `aria-describedby` propio del `matInput`, que `mat-form-field` suma a los suyos), así que los lectores de pantalla siempre la reciben. El mensaje de error del campo pasa a ser breve («La contraseña no cumple los requisitos»): lo que falta lo dice la lista. Alternativas: mantener el texto de ayuda (descartada, repite la regla y obliga a releerla), poner la lista dentro de `mat-hint` (descartada: `mat-form-field` oculta la ayuda cuando hay un error, justo cuando más hace falta la lista). La lista se reparte en las columnas que caben (una en móviles estrechos, dos desde tabletas) y deja bajo ella el mismo hueco que hay entre los demás campos.
4. **Los textos de los requisitos viven en un único sitio (`core/auth/password-policy.ts`, `PASSWORD_REQUIREMENTS`)** y el cálculo de lo que falta (`missingRules`) lo usan el validador y la lista, de modo que no pueden discrepar. `PASSWORD_POLICY_TEXT` se conserva solo para el mensaje con que se muestra un rechazo del gateway (`PASSWORD_POLICY_VIOLATION`). Se elimina `passwordPolicyMessage`: ya no hay un mensaje por cada requisito que falte.
5. **Mensajes por código en `auth-messages.ts`**: `registerErrors()` añade `PASSWORD_POLICY_VIOLATION` → regla; `linkErrors()` mapea por código `INVALID_TOKEN` a «enlace no válido», `PASSWORD_POLICY_VIOLATION` a la regla y `VALIDATION_ERROR` a «Revisa los datos e inténtalo de nuevo»; por estado conserva 400 (sin código reconocible), 401, 404 y 410 como enlace no válido, por prudencia. Como el código manda sobre el estado, el `400` de la contraseña ya no se confunde con un token caducado. La verificación de correo usa también `linkErrors()` (solo recibe `INVALID_TOKEN`, comportamiento sin cambios).
6. **`reset-password.component.ts` decide por código, no por estado.** El enlace se da por perdido (`linkInvalid`) cuando el error es `INVALID_TOKEN` o su estado es 401, 404 o 410; un `400` sin código reconocible se sigue tratando como enlace no válido por prudencia (comportamiento actual). Un `PASSWORD_POLICY_VIOLATION` o un `VALIDATION_ERROR` deja el formulario, vacía las dos contraseñas, muestra el error y da el foco al primer campo. El token no se descarta: sigue en memoria, así que se puede reintentar. Alternativa: llamar siempre al gateway para validar el token antes de mostrar el formulario; descartada porque el token es de un solo uso y esa llamada lo gastaría.
7. **Fixtures de error aparte: `src/testing/fixtures/gateway-errors/`**, con los cuerpos reales de hoy (`PASSWORD_POLICY_VIOLATION`, `INVALID_TOKEN`, `VALIDATION_ERROR`, `EMAIL_ALREADY_EXISTS`, `INVALID_CREDENTIALS`). Alternativa: añadirlos a `fixtures/gateway/`; descartada porque ese directorio lo regenera `scripts/extract-gateway-fixtures.mjs` desde la colección y los perdería. Los correos y contraseñas de las capturas se sustituyen por valores ficticios.
8. **Las pruebas existentes de «8 caracteres» se actualizan, no se borran:** pasan a comprobar la política completa en registro, restablecer y `form-utils`; el spec del formulario de conductores conserva el mínimo de 8.

## Risks / Trade-offs

- [La política del cliente se desincroniza con la del gateway si cambia] → El gateway sigue siendo la autoridad: su `PASSWORD_POLICY_VIOLATION` siempre se muestra con la regla; la política vive en un solo sitio y el fixture documenta el texto observado.
- [Un símbolo fuera de `@$!%*?&` podría rechazarse] → No se bloquea en el cliente (decisión 2); queda como pregunta para el equipo del gateway.
- [Un `400` sin código se sigue leyendo como enlace caducado] → Es el comportamiento actual y el más prudente; el caso ya identificado (política) se resuelve por código.
- [Contraseñas largas son más difíciles de escribir] → Se mantiene el botón de mostrar/ocultar y se admiten gestores de contraseñas (`autocomplete="new-password"` ya está).
- [Registro de pruebas reales] → Las capturas de error se hicieron con una cuenta de prueba creada en el gateway real el 2026-10-28; no hay datos personales en los fixtures.

## Open Questions

- ¿El gateway rechaza símbolos fuera de `@$!%*?&` (por ejemplo `#`)? No cambia el diseño: el cliente ya delega la última palabra al gateway.
- ¿`POST /users` (alta de conductores) aplica la misma política de 16 caracteres? Hay que comprobarlo antes de decidir si el formulario de conductores adopta `passwordPolicy`.
