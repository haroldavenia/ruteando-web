## 1. Base: dependencias, Docker y configuración

- [x] 1.1 Subir `engines` del servidor a `^22.13 || >=24`, añadir `nodemailer` a la raíz (`pnpm add`) y comprobar que `pnpm install --frozen-lockfile` y `pnpm audit --prod --audit-level=high` pasan
- [x] 1.2 Añadir el servicio `mailpit` a `compose.yaml` (SMTP 1025, interfaz 8025, versión fijada) y las variables `SMTP_*`, `SMS_PROVIDER`, `MFA_SECRET_KEY` de desarrollo a `web` y `app`; verificar con `docker compose up` que `http://localhost:8025` abre la bandeja
- [x] 1.3 Documentar en `.env.example` (`MFA_SECRET_KEY`, `MFA_DB_PATH`, `MFA_DEV_PORT`, `SMTP_*`, `SMS_PROVIDER`, `TWILIO_*`) y añadir `data/` al `.gitignore`; verificar con `git status` que el fichero SQLite no se versiona

## 2. Servidor: almacén y primitivas

- [x] 2.1 `server/mfa/store.js` con `node:sqlite` (tablas de política, factores, códigos de recuperación y eventos, `PRAGMA user_version`); prueba en `server/test/` que crea, lee y migra sobre un fichero temporal
- [x] 2.2 `server/mfa/crypto.js`: AES-256-GCM para secretos, HMAC para códigos y generación de códigos con `randomInt`; pruebas de ida y vuelta, de manipulación y de que sin clave el módulo se desactiva
- [x] 2.3 `server/mfa/totp.js` (RFC 6238 con `node:crypto`) y prueba con los vectores de la RFC, la ventana ±1 y el rechazo del mismo paso dos veces
- [x] 2.4 `server/mfa/limits.js` (5 intentos por reto, 3 envíos por 10 minutos) y prueba con reloj simulado

## 3. Servidor: canales de envío

- [x] 3.1 `server/mfa/mailer.js` con `nodemailer` y prueba que envía a un servidor SMTP de prueba local y no incluye el código en el registro
- [x] 3.2 `server/mfa/sms.js` con los proveedores `twilio` (REST de Verify con `fetch` simulado en la prueba) y `dev` (correo a Mailpit); pruebas de que sin credenciales SMS no se ofrece y de que no se llama a Twilio
- [x] 3.3 Verificar a mano los tres envíos locales con Docker: correo y SMS de desarrollo aparecen en Mailpit

## 4. Servidor: reto, política y gestión

- [x] 4.1 `server/mfa/challenges.js` en memoria con caducidad de 5 minutos y descarte de tokens; prueba de caducidad, consumo único y agotamiento de intentos
- [x] 4.2 Intercepción de `POST /gateway/auth/login` (reto, `mfaEnrollRequired`, paso libre sin 2FA o sin clave) y `POST /gateway/mfa/login/{send,verify}`; pruebas con un gateway falso para cada escenario de la spec, incluida la imposibilidad de obtener tokens sin verificar
- [x] 4.3 Validación de sesión de `/gateway/mfa/**` con `GET /auth/me`, alta y baja de TOTP, SMS y correo, códigos de recuperación (generar, usar, regenerar) y reglas de desactivar con un código; pruebas por escenario
- [x] 4.4 Política por empresa (`GET/PUT /mfa/policy`) y restablecimiento por administrador (`POST /gateway/mfa/users/:id/reset`) con pruebas de roles, de otra empresa (403) y de política imposible
- [x] 4.5 Registrar el router en `server.js` antes del proxy y el 404 JSON de `/gateway/mfa/**`; pruebas de integración de orden de rutas y de `503` sin clave
- [x] 4.6 Arrancar el router en `ng-ruteando/proxy.conf.js` (`MFA_DEV_PORT`) con las entradas `/gateway/auth/login` y `/gateway/mfa` antes de `/gateway`; verificar con `ng serve` y el simulado que el login con 2FA funciona de punta a punta

## 5. Frontend: acceso

- [x] 5.1 `AuthService.login` con la unión `session | challenge | enroll` sin tocar el estado hasta tener sesión, y `MfaApi` (retos); pruebas por escenario de `auth-session`
- [x] 5.2 Segundo paso en `features/access/login/` (método, código, reenviar, código de recuperación, alta obligatoria) con foco, avisos para lectores y pegado del código; pruebas de componente y de teclado
- [x] 5.3 Traducciones en/es/pt de los textos nuevos y `node scripts/i18n-check.mjs` en verde

## 6. Frontend: Perfil y Seguridad

- [x] 6.1 Ruta diferida `/perfil` con el estado de cada método, alta de TOTP con QR (matriz de `qrcode` importada con `import()` solo ahí) y clave en texto, alta de SMS y de correo, desactivación con código y los códigos de recuperación mostrados una vez; pruebas por escenario
- [x] 6.2 Ruta diferida `/seguridad` (`ADMIN_ROLES`) con la política de la empresa, validación de política imposible y restablecimiento del 2FA de una persona con confirmación; pruebas de rol y de cada escenario
- [x] 6.3 Menú (`nav-items.ts`: Perfil para todos, Seguridad para administradores), búsqueda global, iconos nuevos (`node scripts/icon-names.mjs --update`) y comprobación del presupuesto del bundle inicial (`pnpm run build`)
- [x] 6.4 Traducciones en/es/pt y comprobación del banco visual (`titulos`, responsive 320 a 2560 px) de las pantallas nuevas

## 7. Cierre

- [ ] 7.1 Actualizar `CLAUDE.md` (sección de 2FA, variables, Mailpit y límites), `README.md` y las specs principales al archivar
- [x] 7.2 `pnpm lint`, `pnpm format`, `pnpm --filter ng-ruteando run test:ci`, `pnpm run test:server` y `openspec validate add-mfa --strict` sin errores
- [x] 7.3 Prueba manual completa en Chrome con Docker y Mailpit: los tres métodos, recuperación, política obligatoria y restablecimiento por el administrador
- [ ] 7.4 Con el gateway real activo: verificar `GET /auth/me`, el listado de usuarios y el canal SMS, y registrar el resultado en el change
- [ ] 7.5 CI del PR en verde y registro en la hoja de seguimiento
