## Context

Ver `proposal.md` (Why). Estado actual comprobado en el código y en los mocks:

- **El gateway no ofrece segundo factor en el login.** `POST /auth/login` devuelve los tokens con solo la contraseña. Su OTP (`POST /notifications/otp/send|verify|resend`, públicos) solo está capturado con `channel: "email"` y `purpose: "email_2fa"`; la respuesta de `verify` es `{ "verified": true }`, no una sesión, así que no bloquea nada. No hay ningún rastro de TOTP. Hay señales de SMS (`phone`, `phoneVerified` en el usuario y `sms.otp` en `GET /notifications/preferences`) pero **ninguna captura de `channel: "sms"`**: no se sabe si funciona. Antes ya se había anotado que `otp/send` acepta peticiones sin sesión y que no hay límite de intentos (`reference-gateway-hallazgos`).
- **El simulado (`scripts/mock-gateway.mjs`) no tiene nada de esto**: ni `/notifications/**`, ni TOTP, ni teléfono verificado (`phone: null`); `/auth/login` entrega sesión directa. Existen fixtures del OTP por correo en `ng-ruteando/src/testing/fixtures/gateway/` (tomados del Postman) y nada de SMS ni TOTP. No hay un «mock específico del OTP».
- **El servidor Express solo reenvía**: `server/gateway-proxy.js` pasa `/gateway/**` en streaming (antes de `body-parser`) y no tiene base de datos. `ng serve` no usa Express: su proxy es `ng-ruteando/proxy.conf.js`, que arranca el simulado en el mismo proceso (`server/gateway-mode.js`).
- Roles existentes: `tenant_admin`, `super_admin`, `agent` y `driver` (`core/auth/admin-roles.ts`). No hay página de perfil. El bundle inicial está al límite del presupuesto (ver `CLAUDE.md`), así que las pantallas nuevas van en rutas diferidas.

## Goals / Non-Goals

**Goals:**
- Que el segundo factor no se pueda saltar desde el navegador.
- Tres métodos independientes, configurables por empresa y elegibles por persona.
- Poder verificar los tres métodos en local sin cuentas externas (Mailpit).

**Non-Goals:**
- No se cambia el gateway ni se le pide nada para que el 2FA funcione (sí se preguntará al equipo de HanoIT por el canal SMS; no es bloqueante).
- Sin passkeys ni Google/GitHub/Apple (no están en la petición).
- Sin pantalla de auditoría de eventos de 2FA: solo registro del servidor y tabla `mfa_events` para una fase posterior.
- Sin alta de la persona en Twilio ni pagos: las credenciales las pone quien despliega.

## Decisions

**1. El servidor actúa como BFF solo en el login, con los tokens retenidos.** El servidor llama al gateway con las credenciales; si hay reto, guarda los tokens **en memoria** (mapa con caducidad de 5 minutos, 1 sola instancia) y responde `{ mfaRequired, challengeId, methods }`. `POST /gateway/mfa/login/verify` libera la sesión. *Alternativa descartada:* verificar en el frontend y confiar en el navegador (se salta llamando al gateway directo) y *guardar los tokens en SQLite* (dejaría credenciales en disco; en memoria se pierden con un reinicio, lo que obliga a iniciar sesión de nuevo, aceptable).

**2. El OTP del gateway no se usa.** Ni para el correo. Razones: no condiciona el login, no tiene límite de intentos, es accesible sin sesión, solo tiene captura de correo y el 2FA debe poder probarse en local con Mailpit, cosa que un correo enviado por el gateway no permite. Consecuencia: el simulado del gateway **no necesita rutas de OTP** (se descarta añadirlas; si algún día se usa el OTP del gateway, se agregan junto a su uso). *Alternativa:* correo por el OTP del gateway y SMS por Twilio: mezclaría dos mecanismos de código con reglas distintas.

**3. Correo con SMTP propio y `nodemailer`.** Node no trae cliente SMTP; `nodemailer` no tiene dependencias propias. En local, `SMTP_HOST=mailpit`, puerto 1025, sin cifrado ni credenciales; en producción, `SMTP_*` del proveedor. El código lo genera el servidor (6 dígitos con `crypto.randomInt`), se guarda como HMAC con `MFA_SECRET_KEY`, caduca a los 5 minutos y es de un solo uso. *Alternativa:* escribir un cliente SMTP mínimo: más código propio que mantener que una dependencia sin dependencias.

**4. SMS con una interfaz de dos proveedores.** `twilio` (API REST de Verify con `fetch` y autenticación básica, sin SDK; Twilio genera y comprueba el código y aplica su propio límite) y `dev` (genera el código en el servidor y entrega el texto como correo a Mailpit; nada se escribe en el registro). Se elige con `SMS_PROVIDER=twilio|dev`; sin credenciales de Twilio y sin `dev`, SMS no se ofrece. El teléfono se guarda en nuestra tabla (verificado por un primer código), sin escribir en el gateway. *Alternativa:* SDK `twilio` (muchas dependencias para dos llamadas).

**5. TOTP implementado con `node:crypto`.** RFC 6238: HMAC-SHA1, 6 dígitos, paso 30 s, ventana ±1 paso, y se recuerda el último paso aceptado para impedir reutilizar un código. Secreto de 20 bytes en base32; guardado cifrado con AES-256-GCM. *Alternativa:* `otplib` (otra dependencia para ~30 líneas probables con los vectores de la RFC).

**6. Persistencia con `node:sqlite`.** Tablas: `tenant_policy`, `factor` (usuario, tipo, secreto cifrado o destino, verificado, último paso), `recovery_code` (huella, usado) y `mfa_event`. Fichero en `MFA_DB_PATH` (por defecto `data/mfa.sqlite`, en `.gitignore`), esquema creado al arrancar con `PRAGMA user_version` para migrar. Sin dependencias nuevas. El módulo exige Node `^22.13 || >=24`: se actualizan `engines`, `.nvmrc` ya es 22 y `Dockerfile.dev` ya trae Node 22. *Alternativas:* base de datos externa (infraestructura nueva) y un JSON en disco (sin transacciones).

**7. Dónde vive: un router de Express reutilizable.** `server/mfa/index.js` exporta `createMfaRouter(env)`; `server.js` lo registra **antes** del proxy (`/gateway/auth/login` y `/gateway/mfa`). Para `ng serve`, `proxy.conf.js` arranca el mismo router en un puerto local (como ya hace con el simulado, `MFA_DEV_PORT`) y añade entradas `/gateway/auth/login` y `/gateway/mfa` **antes** de `/gateway`, de modo que el comportamiento es idéntico en desarrollo, Docker y producción.

**7b. Las rutas viven bajo `/gateway/mfa`, no en `/mfa`.** Así, desde el navegador, son una ruta más de la API y reutilizan `API_BASE_URL`, el token de acceso, la renovación ante un 401 y el mapa de errores sin código nuevo. Solo los pasos del reto (`/login/send|verify|complete`) y las llamadas con la cabecera `X-MFA-Challenge` se tratan como públicas: no llevan token ni intentan renovar la sesión.

**8. Sesión de las rutas de gestión.** `/gateway/mfa/**` valida el `Authorization: Bearer` con `GET /auth/me` del gateway (de ahí salen id, rol y empresa) en cada petición; el servidor nunca se fía de un rol o una empresa que vengan en el cuerpo. Para el alta obligatoria durante el login, las rutas de alta aceptan el `challengeId` en lugar del token (el reto ya retiene los tokens y con ellos se llama a `/auth/me`).

**9. Política por empresa.** Una fila por `tenantId`: `emailEnabled`, `smsEnabled`, `totpEnabled`, `required` (`none`, `all` o `roles`) y la lista de roles. Un cambio guarda y no borra factores. Rechaza una política obligatoria sin métodos permitidos. `super_admin` puede indicar otra empresa; `tenant_admin` solo la suya.

**10. Límites.** 5 intentos por reto; 3 envíos por persona y método cada 10 minutos; cada fallo y bloqueo se registra en `mfa_event`. El mensaje de error del código no distingue «caducado» de «incorrecto».

**11. Frontend.** `AuthService.login` devuelve una unión (`session | challenge | enroll`); el estado de la aplicación no cambia hasta la sesión. El segundo paso es un componente propio dentro de `features/access/login/`. `features/security/` (ruta `/seguridad`, `ADMIN_ROLES`) y `features/profile/` (`/perfil`) son rutas diferidas; el QR se dibuja con la matriz de `qrcode` importada con `import()` solo dentro de `/perfil`, como SVG en la plantilla (sin `innerHTML`, por la CSP). Los estilos van en la hoja de cada componente (< 2 kB). Todo con `t()` en tres idiomas e iconos nuevos con `node scripts/icon-names.mjs --update`.

**12. Docker.** Servicio `mailpit` (`axllent/mailpit`, versión fijada al implementar) con SMTP en 1025 y la interfaz en `http://localhost:8025`; `web` y `app` reciben `SMTP_HOST=mailpit`, `SMTP_PORT=1025`, `SMS_PROVIDER=dev` y una `MFA_SECRET_KEY` de desarrollo. Fuera de Docker, `.env.example` documenta cómo apuntar a un Mailpit local.

## Risks / Trade-offs

- [Los retos viven en memoria: con varias instancias o un reinicio se pierden] → documentado como una sola instancia; el efecto es iniciar sesión de nuevo.
- [SQLite en un contenedor efímero pierde los factores en cada despliegue y deja a la gente sin segundo factor o, peor, con la política vacía] → exigir un volumen persistente en producción y avisar en el registro si el fichero es nuevo y hay políticas esperadas; probar antes de activar en producción.
- [Pérdida del teléfono o de la aplicación sin códigos de recuperación] → 10 códigos, y restablecimiento por el administrador.
- [Si el SMTP o Twilio caen, quien solo tiene ese método queda fuera] → la política obliga a tener al menos un método y se recomienda TOTP o códigos de recuperación; el login muestra los métodos activos.
- [El servidor valida la sesión llamando a `/auth/me` en cada petición de gestión: carga y latencia extra] → solo en `/gateway/mfa/**`, tráfico bajo; sin caché para no conservar sesiones revocadas.
- [`GET /auth/me`, el listado de usuarios (para restablecer) y el canal SMS no están verificados con el gateway real] → se prueba contra el simulado ampliado con lo mínimo y se verifica con el real cuando esté activo; el restablecimiento se limita a ids que devuelva el listado de la empresa.
- [`node:sqlite` es experimental en Node 22] → aviso en consola aceptado; se fija el mínimo en 22.13 y se prueba en 22 y 24.
- [Se retiene el token en el servidor entre la contraseña y el código] → solo en memoria, caduca a los 5 minutos, nunca se registra.
- [Subir el mínimo de Node a 22.13 en el servidor] → la imagen de desarrollo y `.nvmrc` ya son 22; comprobar la imagen de producción antes de desplegar.

## Migration Plan

1. Fusionar con el módulo **apagado** (sin `MFA_SECRET_KEY`): el login sigue como hoy.
2. En cada entorno, definir `MFA_SECRET_KEY` (32 bytes en base64, secreto), SMTP y, si se usa, Twilio; montar el volumen de `MFA_DB_PATH`; reiniciar.
3. Cada persona activa sus métodos en `/perfil`; el administrador decide en `/seguridad` si se hace obligatorio.
4. **Reversión:** quitar `MFA_SECRET_KEY` y reiniciar devuelve el login al comportamiento anterior sin tocar datos.
5. Cambiar `MFA_SECRET_KEY` invalida los secretos TOTP guardados (hay que volver a activarlos); no se rota sin avisar.

## Open Questions

- ¿El gateway real admite `channel: "sms"` en su OTP y devuelve el rol y la empresa en `GET /auth/me` para cualquier rol? No cambia el diseño (el 2FA usa el suyo), solo la verificación final.
