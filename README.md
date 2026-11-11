# ruteando-web

Aplicación web de planificación de rutas. El frontend es Angular (`ng-ruteando/`) y se apoya en el HanoIT Gateway; un pequeño servidor Express publica la compilación y reenvía las peticiones al gateway sin exponer su clave.

## Requisitos

- Node `^20.19 || ^22.12 || >=24` para el frontend y `^22.13 || >=24` para el servidor (usa `node:sqlite`); en `ng-ruteando/.nvmrc` está la 22: `nvm use`.
- pnpm 10 (la versión exacta está en `packageManager` de `package.json`): `corepack enable` (viene con Node 20 a 24) o `npm install -g pnpm`; con pnpm 10 instalado, descarga solo la versión que pide el proyecto.
- Dirección y clave de API del HanoIT Gateway.

## Puesta en marcha

```
pnpm install --frozen-lockfile          # servidor (raíz) y frontend (un solo pnpm-lock.yaml)
cp .env.example .env                    # y rellena GATEWAY_URL y GATEWAY_API_KEY
pnpm run build:web                       # compila ng-ruteando
pnpm start                               # http://localhost:3000
```

Sin `.env` el servidor arranca y avisa, pero `/gateway/**` responde 503. `PORT` cambia el puerto y `WEB_DIST` el directorio que se publica.

El servidor añade cabeceras de seguridad a todas las respuestas (`server/security-headers.js`). La política de contenido (CSP) va por defecto en modo solo informe (`CSP_MODE=report-only`: el navegador anota las violaciones en la consola y no bloquea nada); `CSP_MODE=enforce` la aplica y `off` la quita. Si cambias el proveedor de teselas del mapa, añade su origen a `CSP_IMG_SRC` (varios, separados por espacios). La compilación de producción no lleva manejadores en línea (`optimization.styles.inlineCritical = false` en `angular.json`), así que `enforce` no rompe nada hoy; tras añadir recursos externos o scripts en línea, recorre la aplicación con `report-only` y sin violaciones antes de usarlo.

## Probar sin el gateway real

`scripts/mock-gateway.mjs` es un gateway falso con datos en memoria (lugares, flota, paquetes, jornadas ya planificadas con rutas y paradas, zonas), para iniciar sesión y recorrer la aplicación sin el gateway real. No es el contrato oficial y los datos se pierden al pararlo.

```
pnpm run mock:gateway                                              # puerto 4010 (MOCK_GATEWAY_PORT)
GATEWAY_URL=http://localhost:4010 GATEWAY_API_KEY=mock pnpm start  # la app contra el mock, en otra terminal
```

Usuarios (contraseña `demo1234`): `admin@example.invalid` (administración), `agente@example.invalid` (agente) y `conductor@example.invalid` (conductor, sin áreas). Las variables del entorno tienen prioridad sobre `.env`.

## Segundo factor (opcional)

El inicio de sesión admite un segundo factor: código por correo, código por SMS (Twilio Verify) o aplicación autenticadora (TOTP, Google Authenticator). Lo impone el servidor, no el navegador. Sin `MFA_SECRET_KEY` está apagado y el acceso funciona como siempre. Cada persona activa sus métodos en **Perfil** (`/perfil`) y las personas administradoras deciden en **Seguridad** (`/seguridad`) cuáles se permiten y si son obligatorios. Todas las variables están comentadas en `.env.example`; aquí van los pasos.

### Variables

| Variable | Qué es | Desarrollo | Producción |
|---|---|---|---|
| `MFA_SECRET_KEY` | Clave de 32 bytes en base64 que cifra los secretos TOTP. **Secreto.** Sin ella el módulo está apagado. Cambiarla invalida los TOTP ya activados. | Genera una (con Docker ya viene una de pruebas) | **Una propia y guardada en el gestor de secretos** |
| `MFA_DB_PATH` | Fichero SQLite con la política, los factores y los códigos de recuperación (`data/mfa.sqlite`, ignorado por git). | Por defecto | **Volumen persistente**: si se pierde, todo el mundo tiene que volver a activar sus métodos |
| `MFA_DEV_PORT` | Solo `ng serve`: puerto del módulo (4020). | Opcional | No se usa |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Correo de los códigos (y de los «SMS» de desarrollo). Sin `SMTP_HOST` no hay método de correo. | Mailpit: `localhost` / `1025` | Tu proveedor SMTP (ver abajo) |
| `SMS_PROVIDER` | `dev` (el «SMS» llega como correo a Mailpit, no se envía nada real) o `twilio`. Con otro valor el SMS no se ofrece. | `dev` | `twilio` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Credenciales de Twilio Verify. **El token es un secreto.** Si falta alguna, el SMS no se ofrece a nadie. | Vacías | Las tres, de la cuenta **Live** |

Generar la clave: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

### Desarrollo (sin enviar nada real)

- **Con Docker** (lo más simple): `docker compose up` levanta Mailpit (http://localhost:8025) con una `MFA_SECRET_KEY` de pruebas. Los correos con códigos y, con `SMS_PROVIDER=dev`, los «SMS» llegan a esa bandeja. Para activar SMS en `/perfil` usa cualquier número en formato internacional (por ejemplo `+573001234567`): no sale del equipo.
- **Sin Docker**: `docker compose up mailpit` y en el `.env` `MFA_SECRET_KEY=<la que generaste>`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` y `SMS_PROVIDER=dev`; reinicia `pnpm start` o `ng serve`.
- Docker toma `SMS_PROVIDER` y `TWILIO_*` del `.env` (por defecto `dev`). Tras cambiarlos: `docker compose restart web`.
- Con el gateway simulado los usuarios cambian de id en cada arranque: tras reiniciarlo hay que volver a activar los métodos.
- Límites (también en desarrollo): 5 intentos por código, 10 códigos erróneos por persona cada 15 minutos y 3 envíos por persona y método cada 10 minutos; al superarlos responde 429.

### Configurar Twilio (SMS real)

Pruébalo primero con una cuenta de prueba y tu propio teléfono.

1. Crea la cuenta en https://www.twilio.com, verifica el correo y tu teléfono.
2. En la consola, **Account → API keys & tokens → Auth Tokens → Live credentials**: copia el **Account SID** (`AC…`) y el **Auth Token**. Usa las **Live**; las credenciales *Test* de Twilio sirven para pocos recursos de su API y no están pensadas para Verify. El token da acceso a toda la cuenta: solo va en el `.env` o en el gestor de secretos, nunca en git ni en un chat.
3. **Verify → Services → Create new** (o usa uno existente): nombre «Ruteando» (aparece en el texto del SMS), canal **SMS** activo y **Fraud Guard** activado. Verifica que la longitud del código sea **6**. Copia el **Service SID** (`VA…`).
4. **Geo permissions** (Messaging → Settings): habilita los países de tus usuarios (por ejemplo Colombia `+57` o República Dominicana `+1`). Si un país está apagado, el envío falla.
5. Cuenta de prueba (*trial*): solo envía a números verificados. Verifica el tuyo en **Phone Numbers → Manage → Verified Caller IDs**. El saldo de prueba alcanza para pocas verificaciones.
6. En el `.env`:
   ```
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_VERIFY_SERVICE_SID=VA...
   ```
   y reinicia (`docker compose restart web`, o `pnpm start`).
7. Comprueba: en `/perfil` aparece «Mensaje de texto (SMS)», actívalo con tu número (`+57…`), llega el SMS y confirma; cierra sesión e inicia otra vez eligiendo SMS. Si falla, mira **Monitor → Logs → Verify** en la consola de Twilio (estado y motivo del error).

Twilio es quien genera, envía y comprueba el código. El número de teléfono se guarda en `MFA_DB_PATH`: trátalo como dato personal en los respaldos. Los textos legales que Twilio pide para el alta (privacidad, términos y consentimiento de SMS) están en `/legal/privacidad`, `/legal/terminos` y `/legal/sms`; son un **borrador** que debe revisar quien responda legalmente, y la aplicación tiene que estar en un dominio público.

### Producción

1. **Requisitos**: Node `^22.13 || >=24` (usa `node:sqlite`) y **una sola instancia** del servidor (los retos de acceso viven en memoria).
2. `MFA_SECRET_KEY`: una clave nueva y propia (no la de Docker). Guárdala: si se pierde o cambia, los TOTP activos dejan de valer.
3. `MFA_DB_PATH` en un **volumen persistente** con copia de seguridad.
4. **Correo**: `SMTP_HOST`, `SMTP_PORT` y `SMTP_FROM` de tu proveedor, con `SMTP_USER` y `SMTP_PASS`. Puerto 587 con `SMTP_SECURE=false` (STARTTLS) o 465 con `SMTP_SECURE=true`. Sin usuario el servidor no negocia TLS: no lo dejes así fuera de Mailpit. `SMTP_FROM` debe ser un remitente de un dominio que controles (con SPF/DKIM) para que los códigos no caigan en spam.
5. **SMS**: `SMS_PROVIDER=twilio` y las tres `TWILIO_*` de la cuenta **Live**. No uses `dev` en producción: no envía SMS reales.
6. **Cuenta de Twilio de pago**: pasa de *trial* a cuenta pagada (método de pago y saldo), confirma los *Geo permissions* y define alertas o un límite de gasto. Twilio cobra por verificación y además la tarifa del SMS de cada país: consulta los precios de Verify antes de ofrecerlo a todos. Los límites de la aplicación (3 envíos y 10 errores) ayudan contra el abuso pero no sustituyen ese tope.
7. **HTTPS** delante del servidor, con `X-Forwarded-Proto: https` (activa HSTS). Prueba el acceso **a través del proxy real**, no solo contra el puerto de la aplicación.
8. **Gateway**: `GATEWAY_MODE=real` con `GATEWAY_URL` y `GATEWAY_API_KEY`. Si usas el simulado en un servidor accesible desde fuera, define `MOCK_GATEWAY_PASSWORD` (si no, cualquiera entra con `demo1234`).
9. **CSP**: empieza con `CSP_MODE=report-only`; pasa a `enforce` solo tras recorrer la aplicación sin violaciones.
10. **Comprobación final**: con una sesión iniciada, `GET /gateway/mfa/status` debe mostrar `methods.sms.available: true` (y el de correo también). Activa un método con una persona real de cada país objetivo antes de exigirlo en **Seguridad**.

## Con Docker (desarrollo)

Sin instalar Node ni copiar `.env`: `docker compose up` (o `pnpm run docker:dev`) levanta el gateway simulado y `ng serve` en http://localhost:4200 (usuarios y contraseña como en la sección anterior). La primera vez instala las dependencias en volúmenes de Docker y tarda unos minutos; después solo reinstala si cambia el `pnpm-lock.yaml`. Tras la migración a pnpm (que cambia `Dockerfile.dev`), reconstruye las imágenes una vez: `docker compose --profile prod-like --profile test build` (o `docker compose up --build`); si una imagen vieja se queda con `pnpm: not found`, es eso. Los volúmenes con `node_modules` de npm se reinstalan solos (el hash del lock cambió); si algo queda raro, `docker compose down -v`. El código se monta desde el equipo y recarga al guardar.

```
docker compose up                              # app en :4200 + gateway simulado en :4010
docker compose --profile prod-like up app      # compilación + servidor Express en :3000, como en producción
docker compose --profile test run --rm test    # pruebas del frontend (pnpm run docker:test)
docker compose down                            # parar (pnpm run docker:down); `down -v` borra también las dependencias
```

Para usar otro gateway define `DOCKER_GATEWAY_URL` y `DOCKER_GATEWAY_API_KEY` (en `.env` o en el entorno); `GATEWAY_URL` y `GATEWAY_API_KEY` no se usan aquí a propósito, para no apuntar al gateway real por accidente. La base de datos del segundo factor es un SQLite en un volumen de Docker (`mfa_data`). Es una imagen de desarrollo (`Dockerfile.dev`), no la de producción.

## Desarrollo

Desde `ng-ruteando/`: `pnpm start` (puerto 4200, con el mismo proxy `/gateway` y las mismas variables), `pnpm run test:ci` (Karma con Chrome sin interfaz) y `pnpm run build`.

## Instalar como aplicación (PWA)

La compilación de producción es una PWA: en Chrome o Edge aparece «Instalar aplicación» en el menú de usuario (y en la barra de direcciones); en iPhone/iPad, «Compartir → Añadir a pantalla de inicio». Carga desde caché y avisa cuando hay una versión nueva; los datos siempre vienen del gateway (sin conexión se ve la carcasa, no los datos). Se prueba con `pnpm run build:web && pnpm start` (en `ng serve` no hay service worker). Requiere HTTPS salvo en `localhost`.

## Vigilancia con Jenkins (`/healthCheck`)

### Ruta

| | |
|---|---|
| Ruta | `GET /healthCheck` (también responde `HEAD`) |
| Acceso | Público: sin sesión, sin `X-Api-Key` y sin pasar por el gateway |
| Producción | `https://<tu-dominio>/healthCheck` (la misma dirección y puerto que la aplicación) |
| Local | `http://localhost:3000/healthCheck` con `pnpm run build:web && pnpm start` (con `PORT` cambia el puerto) |
| Docker | `http://localhost:3000/healthCheck` con `docker compose --profile prod-like up app`; el servicio `web` de desarrollo (`ng serve`) no la tiene |
| Cabeceras | `Cache-Control: no-store`, `Content-Type: application/json` |

```
curl -i https://<tu-dominio>/healthCheck
```

| Respuesta | Cuerpo | Significa |
|---|---|---|
| `200` | `{"status":"ok","frontend":"ok","uptime":3600}` | El servidor atiende y el frontend está compilado. `uptime` son los segundos desde que arrancó el proceso. |
| `503` | `{"status":"error","frontend":"sin compilar","uptime":12}` | El servidor atiende pero falta la compilación (`pnpm run build:web`): los usuarios no ven la aplicación. |
| sin respuesta, `502`/`504` del proxy | | El servidor está caído o el proxy inverso no lo alcanza. |

No consulta el gateway (una caída del gateway no es una caída de esta aplicación), no se cachea y no se registra en el log. Si un proxy inverso (nginx, Traefik, Coolify) va delante, comprueba que no pida autenticación en esa ruta y que la reenvía a la aplicación.

### Configurar Jenkins

El `Jenkinsfile` de la raíz consulta la URL cada 5 minutos con `curl` (3 intentos separados 10 s, para no avisar por un parpadeo), envía un correo si falla y otro cuando se recupera.

1. **Correo de Jenkins**: Manage Jenkins → System → «E-mail Notification» (servidor SMTP y remitente). Sin esto el paso `mail` no envía nada.
2. **Crear el trabajo**: New Item → «Pipeline» → en «Pipeline» elige «Pipeline script from SCM», Git, la URL de este repositorio (con credenciales si es privado), la rama que se despliega (`main`) y el script `Jenkinsfile`. El agente de Jenkins necesita `curl`.
3. **Ejecutarlo una vez** («Build Now»): Jenkins lee los parámetros del `Jenkinsfile` en esa primera ejecución (con los valores de ejemplo fallará, es normal). A partir de ahí el trabajo se programa solo.
4. **Poner los valores reales**: «Build with Parameters» → `HEALTH_URL` (la URL pública de producción, por ejemplo `https://tu-dominio/healthCheck`) y `ALERT_EMAIL` (quién recibe el aviso). Para que las ejecuciones programadas los usen, cambia también los `defaultValue` en el `Jenkinsfile` y súbelo.
5. **Comprobar el aviso**: pon temporalmente una `HEALTH_URL` inexistente o detén el servidor; en la siguiente ejecución debe llegar el correo «CAÍDA». Al restablecerla llega «Ruteando se recuperó».

Requisitos: Jenkins debe alcanzar la URL pública (si está en otra red, usa un agente dentro de ella) y el proxy inverso no debe pedir sesión ni autenticación en `/healthCheck`. Para avisar por Slack, Teams u otro canal, sustituye los dos `mail` del `post` por el paso de su plugin.

## Integración continua

`.github/workflows/ci.yml` verifica cada pull request (a cualquier rama base) y cada push a `main` con cinco trabajos: `Frontend` (lint con ESLint, formato con Prettier, pruebas con Chrome sin interfaz y compilación de producción), `Servidor` (pruebas), `Specs` (`openspec validate --specs --strict`), `Auditoría` (`pnpm audit` de las dependencias de producción, nivel alto) y `ci`, que resume los anteriores. **La comprobación obligatoria de `main` es `ci`.** Usa el Node de `ng-ruteando/.nvmrc`, pnpm (versión de `packageManager`) y `pnpm install --frozen-lockfile`, y no necesita secretos ni el gateway real.

Lo mismo en local:

```
pnpm install --frozen-lockfile && pnpm lint && pnpm format
pnpm --filter ng-ruteando run test:ci && pnpm --filter ng-ruteando run build
pnpm run test:server
npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict
pnpm audit --prod --audit-level=high
```

Dependabot propone cada semana las actualizaciones de las dependencias (raíz y frontend, ecosistema `npm` de Dependabot, que lee `pnpm-lock.yaml`) y de las acciones, que pasan por el mismo CI. La versión del CLI de OpenSpec (`OPENSPEC_VERSION` en el flujo) y los SHA de las acciones se actualizan a mano o con esos pull requests.

## Pruebas del servidor

```
pnpm run test:server
```

## Más información

`CLAUDE.md` describe la arquitectura, y las decisiones y requisitos están en `openspec/`. El código de la aplicación AngularJS anterior sigue en el historial de git (último commit que lo contiene: `19b1cb4`).
