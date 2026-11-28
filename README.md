# ruteando-web

Aplicación web de planificación de rutas. Es una aplicación Next.js (`next-ruteando/`) que actúa como BFF del HanoIT Gateway: guarda la sesión en cookies `httpOnly`, reenvía las peticiones al gateway sin exponer su clave ni sus tokens al navegador, e impone el segundo factor y el inicio de sesión único.

## Requisitos

- Node `^22.22.3 || ^24.15 || >=26` (el 2FA y el SSO usan `node:sqlite`); en `.nvmrc` está la 26: `nvm use`.
- pnpm 10 (la versión exacta está en `packageManager` de `package.json`): `corepack enable` (viene con Node hasta la 24; desde la 25 se instala con `npm install -g corepack`) o `npm install -g pnpm`; con pnpm 10 instalado, descarga solo la versión que pide el proyecto.
- Dirección y clave de API del HanoIT Gateway.

## Puesta en marcha

```
pnpm install --frozen-lockfile
cp next-ruteando/.env.example next-ruteando/.env.local   # y rellena GATEWAY_URL, GATEWAY_API_KEY y SESSION_SECRET
pnpm run build
pnpm start                               # http://localhost:3000
```

Las variables (todas comentadas) están en `next-ruteando/.env.example`; en local se leen de `next-ruteando/.env.local` (o `.env`) y las del entorno tienen prioridad. **Al desplegar se definen en la plataforma, no en un archivo: la lista completa, qué es obligatorio y los pasos para Render y Docker están en [Despliegue](#despliegue).** `pnpm start` es el lanzador `scripts/start.mjs`: con `GATEWAY_MODE=mock` levanta antes el gateway simulado y después la aplicación.

`proxy.ts` añade cabeceras de seguridad a todas las respuestas. La política de contenido (CSP, con nonce por petición) va por defecto en modo solo informe (`CSP_MODE=report-only`: el navegador anota las violaciones y no bloquea nada); `CSP_MODE=enforce` la aplica y `off` la quita. Si cambias el proveedor de teselas del mapa, actualiza `img-src` en `proxy.ts`. Verificada en navegador con `enforce` y sin violaciones; tras añadir recursos externos o scripts en línea, recorre la aplicación con `report-only` antes de usarlo.

## Probar sin el gateway real

`scripts/mock-gateway.mjs` es un gateway falso con datos en memoria (lugares, flota, paquetes, jornadas ya planificadas con rutas y paradas, zonas), para iniciar sesión y recorrer la aplicación sin el gateway real. No es el contrato oficial y los datos se pierden al pararlo.

```
pnpm run mock:gateway                                              # puerto 4010 (MOCK_GATEWAY_PORT)
GATEWAY_MODE=mock pnpm start   # la app contra el mock (o GATEWAY_URL=http://localhost:4010 GATEWAY_API_KEY=mock)
```

Usuarios (contraseña `demo1234`): `admin@example.invalid` (administración), `agente@example.invalid` (agente) y `conductor@example.invalid` (conductor, sin áreas). Las variables del entorno tienen prioridad sobre `.env`.

## Segundo factor (opcional)

El inicio de sesión admite un segundo factor: código por correo, código por SMS (Twilio Verify) o aplicación autenticadora (TOTP, Google Authenticator). Lo impone el servidor, no el navegador. Sin `MFA_SECRET_KEY` está apagado y el acceso funciona como siempre. Cada persona activa sus métodos en **Perfil** (`/profile`) y las personas administradoras deciden en **Seguridad** (`/security`) cuáles se permiten y si son obligatorios. Todas las variables están comentadas en `.env.example`; aquí van los pasos.

### Variables

| Variable | Qué es | Desarrollo | Producción |
|---|---|---|---|
| `MFA_SECRET_KEY` | Clave de 32 bytes en base64 que cifra los secretos TOTP. **Secreto.** Sin ella el módulo está apagado. Cambiarla invalida los TOTP ya activados. | Genera una (con Docker ya viene una de pruebas) | **Una propia y guardada en el gestor de secretos** |
| `MFA_DB_PATH` | Fichero SQLite con la política, los factores y los códigos de recuperación (`data/mfa.sqlite`, ignorado por git). | Por defecto | **Volumen persistente**: si se pierde, todo el mundo tiene que volver a activar sus métodos |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Correo de los códigos (y de los «SMS» de desarrollo). Sin `SMTP_HOST` no hay método de correo. | Mailpit: `localhost` / `1025` | Tu proveedor SMTP (ver abajo) |
| `SMS_PROVIDER` | `dev` (el «SMS» llega como correo a Mailpit, no se envía nada real) o `twilio`. Con otro valor el SMS no se ofrece. | `dev` | `twilio` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Credenciales de Twilio Verify. **El token es un secreto.** Si falta alguna, el SMS no se ofrece a nadie. | Vacías | Las tres, de la cuenta **Live** |

Generar la clave: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

### Desarrollo (sin enviar nada real)

- **Con Docker** (lo más simple): `docker compose up` levanta Mailpit (http://localhost:8025) con una `MFA_SECRET_KEY` de pruebas. Los correos con códigos y, con `SMS_PROVIDER=dev`, los «SMS» llegan a esa bandeja. Para activar SMS en `/profile` usa cualquier número en formato internacional (por ejemplo `+573001234567`): no sale del equipo.
- **Sin Docker**: `docker compose up mailpit` y en el `.env` `MFA_SECRET_KEY=<la que generaste>`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` y `SMS_PROVIDER=dev`; reinicia `pnpm start`.
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
7. Comprueba: en `/profile` aparece «Mensaje de texto (SMS)», actívalo con tu número (`+57…`), llega el SMS y confirma; cierra sesión e inicia otra vez eligiendo SMS. Si falla, mira **Monitor → Logs → Verify** en la consola de Twilio (estado y motivo del error).

Twilio es quien genera, envía y comprueba el código. El número de teléfono se guarda en `MFA_DB_PATH`: trátalo como dato personal en los respaldos. Los textos legales que Twilio pide para el alta (privacidad, términos y consentimiento de SMS) están en `/legal/privacy`, `/legal/terms` y `/legal/sms`; son un **borrador** que debe revisar quien responda legalmente, y la aplicación tiene que estar en un dominio público.

### Producción

1. **Requisitos**: Node `^22.22.3 || ^24.15 || >=26` (usa `node:sqlite`) y **una sola instancia** del servidor (los retos de acceso viven en memoria).
2. `MFA_SECRET_KEY`: una clave nueva y propia (no la de Docker). Guárdala: si se pierde o cambia, los TOTP activos dejan de valer.
3. `MFA_DB_PATH` en un **volumen persistente** con copia de seguridad.
4. **Correo**: `SMTP_HOST`, `SMTP_PORT` y `SMTP_FROM` de tu proveedor, con `SMTP_USER` y `SMTP_PASS`. Puerto 587 con `SMTP_SECURE=false` (STARTTLS) o 465 con `SMTP_SECURE=true`. Sin usuario el servidor no negocia TLS: no lo dejes así fuera de Mailpit. `SMTP_FROM` debe ser un remitente de un dominio que controles (con SPF/DKIM) para que los códigos no caigan en spam.
5. **SMS**: `SMS_PROVIDER=twilio` y las tres `TWILIO_*` de la cuenta **Live**. No uses `dev` en producción: no envía SMS reales.
6. **Cuenta de Twilio de pago**: pasa de *trial* a cuenta pagada (método de pago y saldo), confirma los *Geo permissions* y define alertas o un límite de gasto. Twilio cobra por verificación y además la tarifa del SMS de cada país: consulta los precios de Verify antes de ofrecerlo a todos. Los límites de la aplicación (3 envíos y 10 errores) ayudan contra el abuso pero no sustituyen ese tope.
7. **HTTPS** delante del servidor, con `X-Forwarded-Proto: https` (activa HSTS). Prueba el acceso **a través del proxy real**, no solo contra el puerto de la aplicación.
8. **Gateway**: `GATEWAY_MODE=real` con `GATEWAY_URL` y `GATEWAY_API_KEY`. Si usas el simulado en un servidor accesible desde fuera, define `MOCK_GATEWAY_PASSWORD` (si no, cualquiera entra con `demo1234`).
9. **CSP**: empieza con `CSP_MODE=report-only`; pasa a `enforce` solo tras recorrer la aplicación sin violaciones.
10. **Comprobación final**: con una sesión iniciada, `GET /gateway/mfa/status` debe mostrar `methods.sms.available: true` (y el de correo también). Activa un método con una persona real de cada país objetivo antes de exigirlo en **Seguridad**.

## Inicio de sesión único (opcional)

Entrar con Google, GitHub, Apple o con el proveedor OpenID Connect de la empresa. Apagado por defecto: solo se ofrecen los proveedores de `SSO_ENABLED_PROVIDERS` que tengan sus credenciales (y hacen falta `SSO_REDIRECT_BASE_URL` y `MFA_SECRET_KEY`). La sesión sigue siendo del gateway: el servidor identifica a la persona con el proveedor y se la pide con `POST /auth/sso/exchange` (contrato en `openspec/changes/add-sso/design.md`); nunca crea cuentas, y el segundo factor se sigue pidiendo.

### Variables

| Variable | Qué es |
|---|---|
| `SSO_ENABLED_PROVIDERS` | Lista separada por comas: `google`, `github`, `apple`, `enterprise` |
| `SSO_REDIRECT_BASE_URL` | Dirección pública de la aplicación, sin barra final (`https://ruteando.example.com`; en local, `http://localhost:3000`) |
| `SSO_GOOGLE_CLIENT_ID`, `SSO_GOOGLE_CLIENT_SECRET` | Cliente OAuth de Google Cloud («Aplicación web») |
| `SSO_GITHUB_CLIENT_ID`, `SSO_GITHUB_CLIENT_SECRET` | OAuth App de GitHub |
| `SSO_APPLE_CLIENT_ID`, `SSO_APPLE_TEAM_ID`, `SSO_APPLE_KEY_ID`, `SSO_APPLE_PRIVATE_KEY` | Services ID, equipo, clave y su PEM (con `\n` en una sola línea) de «Sign in with Apple» |
| `SSO_DB_PATH` | Fichero SQLite de identidades y proveedores de empresa (`data/sso.sqlite`; en producción, un volumen persistente) |

En cada proveedor se registra la dirección de regreso `<SSO_REDIRECT_BASE_URL>/gateway/sso/<proveedor>/callback` (`google`, `github`, `apple`; la de cada empresa aparece en **Seguridad**). El proveedor de empresa (emisor, cliente, secreto y dominios de correo) lo da de alta el administrador en **Seguridad**; el secreto se guarda cifrado con `MFA_SECRET_KEY`.

### Desarrollo (sin cuentas reales)

```
node scripts/mock-oidc-provider.cjs          # proveedor OIDC simulado en :4030
# .env:
GATEWAY_MODE=mock
MFA_SECRET_KEY=<la de siempre>
SSO_ENABLED_PROVIDERS=google
SSO_REDIRECT_BASE_URL=http://localhost:3000
SSO_ALLOW_INSECURE=true
SSO_GOOGLE_ISSUER=http://127.0.0.1:4030
SSO_GOOGLE_CLIENT_ID=mock
SSO_GOOGLE_CLIENT_SECRET=mock
```

Con `pnpm start` y «Continuar con Google» el proveedor simulado pide un correo: escribe uno del gateway simulado (`admin@example.invalid`). `SSO_ALLOW_INSECURE` y `SSO_GOOGLE_ISSUER` solo existen para esto: no las uses fuera de tu máquina.

### Producción

1. `SSO_REDIRECT_BASE_URL` con el dominio público y HTTPS (la cookie del flujo lleva `Secure` con HTTPS).
2. `SSO_DB_PATH` en un volumen persistente y una sola instancia (flujos y tickets viven en memoria).
3. El gateway debe ofrecer `POST /auth/sso/exchange`.
4. Si usas el SSO de empresa, el proveedor debe ser `https` con nombre público (no se admiten IP ni `localhost`).

## Despliegue

**Dónde van las variables.** En local, en `.env.local` (Next lo lee solo; ignorado por git y por Docker). En un despliegue (Render, Docker, Coolify…) no hay archivo `.env`: cada variable se define en el panel de la plataforma (o con `--env-file` / `-e` en Docker) y **tiene prioridad** sobre cualquier archivo. `next-ruteando/.env.example` lista todas, comentadas, y `render.yaml` es el mismo inventario en formato Blueprint de Render.

### Variables

| Variable | Obligatoria | Valor | Notas |
|---|---|---|---|
| `SESSION_SECRET` | **Sí** | `openssl rand -base64 32` (32 caracteres o más) | Firma la cookie de sesión. Sin ella el servidor **no arranca** (sale con código 1). Cambiarla cierra todas las sesiones. |
| `SITE_URL` | **Sí** | `https://tu-dominio` (sin barra final) | Direcciones absolutas del manifiesto, `sitemap.xml`, `robots.txt` y datos estructurados. Sin ella, `http://localhost:3000`. |
| `GATEWAY_MODE` | **Sí** | `real` (por defecto) o `mock` | `mock` usa el gateway simulado (datos ficticios, se pierden al reiniciar). Cualquier otro valor impide arrancar. |
| `GATEWAY_URL`, `GATEWAY_API_KEY` | Con `real` | Dirección base y clave del HanoIT Gateway | La clave es un **secreto**: solo en la plataforma, nunca en git ni en el navegador. |
| `GATEWAY_TIMEOUT_MS` | No | `30000` | Súbelo si planificar jornadas agota el tiempo. |
| `MOCK_GATEWAY_PASSWORD` | **Sí** con `mock` y un `SITE_URL` público | Una contraseña propia (no `demo1234`) | Con `mock` y un `SITE_URL` público, sin ella (o con `demo1234`) el servidor **no arranca**: cualquiera entraría con los usuarios de prueba. En local se admite `demo1234`. `MOCK_GATEWAY_PORT` (4010) casi nunca se toca. |
| `MFA_SECRET_KEY` | Para el 2FA y el SSO | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | Sin ella el segundo factor y el SSO quedan apagados, y el acceso **falla cerrado** salvo `ALLOW_LOGIN_WITHOUT_MFA=true`. Guárdala: cambiarla invalida los TOTP. |
| `MFA_DB_PATH`, `SSO_DB_PATH` | No | `/data/mfa.sqlite`, `/data/sso.sqlite` (Docker), `/var/data/…` (disco de Render) | Bases SQLite del 2FA y del SSO. **Necesitan un volumen persistente**: sin él se pierden y hay que reactivar los métodos. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Para el 2FA por correo | Ver [Segundo factor](#segundo-factor-opcional) | `587` con `SMTP_SECURE=false` o `465` con `true`. |
| `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Para el 2FA por SMS | `twilio` y las tres de una cuenta **Live** | `dev` no envía SMS reales: no lo uses en producción. |
| `SSO_ENABLED_PROVIDERS`, `SSO_REDIRECT_BASE_URL`, `SSO_GOOGLE_*`, `SSO_GITHUB_*`, `SSO_APPLE_*` | Para el SSO | Ver [Inicio de sesión único](#inicio-de-sesión-único-opcional) | Apagado sin proveedores, dirección pública y `MFA_SECRET_KEY`. |
| `CSP_MODE` | No | `report-only` (por defecto), `enforce` u `off` | Pasa a `enforce` tras recorrer la aplicación sin violaciones. |
| `TRUSTED_PROXY_HOPS` | No | `1` (por defecto) | Proxys de confianza delante, para la IP del cliente (límites de intentos). `0` = no confiar en `X-Forwarded-For`. |
| `COOKIE_SECURE` | No | vacío | Las cookies son `Secure` en producción; solo se pone `false` en local con `http://`. |
| `PORT`, `HOSTNAME` | No | `3000`, `0.0.0.0` | La imagen de Docker ya los fija; Render define `PORT` solo. |

**Nunca en un despliegue**: `SSO_ALLOW_INSECURE=true` (el servidor no arranca: desactiva la defensa contra SSRF), `SSO_GOOGLE_ISSUER` (proveedor simulado) ni `ALLOW_LOGIN_WITHOUT_MFA=true` si el 2FA debe cumplirse. Los secretos (`SESSION_SECRET`, `GATEWAY_API_KEY`, `MFA_SECRET_KEY`, `SMTP_PASS`, `TWILIO_AUTH_TOKEN`, `SSO_*_SECRET`) solo viven en la plataforma.

### Render (Node, sin Docker)

Servicio web con estos valores (los mismos de `render.yaml`):

| Ajuste | Valor |
|---|---|
| Build Command | `pnpm install --frozen-lockfile && pnpm run build` |
| Start Command | `pnpm start` |
| Health Check Path | `/healthCheck` |
| Rama | `main` |
| Node | Render elige el más alto que cumple `engines` (hoy 26); pnpm sale de `packageManager`. Para fijarlo, variable `NODE_VERSION`. |

1. **Servicio nuevo**: New → Blueprint apuntando al repositorio (Render lee `render.yaml` y pide los secretos); o New → Web Service con la tabla de arriba y las variables de la sección anterior.
2. **Servicio que ya existía** (creado cuando el repositorio tenía Angular): cambia el *Build Command*, que seguía llamando a `pnpm run build:web` (ya no existe), y confirma que el *Start Command* es `pnpm start` (o `npm start`, que ejecuta lo mismo).
3. **Una sola instancia**: los retos de acceso del 2FA y los flujos del SSO viven en memoria.
4. **Base de datos del 2FA y del SSO**: el plan Free no tiene disco, así que `MFA_DB_PATH=/tmp/mfa.sqlite` y `SSO_DB_PATH=/tmp/sso.sqlite` se pierden al dormirse o redesplegar (cada persona reactiva sus métodos). Con un plan de pago: disco montado en `/var/data` y `MFA_DB_PATH=/var/data/mfa.sqlite`, `SSO_DB_PATH=/var/data/sso.sqlite`.
5. **Guardar variables o el comando de build dispara un despliegue**, salvo que se elija «Save only». Si el despliegue automático por commit no se dispara tras un merge, lanza *Manual Deploy → Deploy latest commit*.
6. **HTTPS y proxy**: Render ya termina TLS y envía `X-Forwarded-Proto` (activa HSTS). Si pones otro proxy delante (nginx, Traefik, Cloudflare), debe conservar `Host` (o enviar `X-Forwarded-Host`) y `Origin`: la protección CSRF compara el `Origin` de cada petición que cambia datos con el host público, y sin esa cabecera responde 403.

### Docker (imagen de producción)

```
docker build -f next-ruteando/Dockerfile -t ruteando-next .          # desde la raíz del repositorio
docker run -d --name ruteando -p 3000:3000 -v ruteando-data:/data --env-file next-ruteando/.env.local ruteando-next
```

El contenedor corre sin root, trae su propio `HEALTHCHECK` (`/healthCheck`) y guarda las bases SQLite del 2FA y del SSO en el volumen `/data` (`MFA_DB_PATH` y `SSO_DB_PATH` ya apuntan allí): **sin volumen se pierden al recrearlo**. Con `GATEWAY_MODE=mock` el contenedor levanta además el gateway simulado en `127.0.0.1` (`MOCK_GATEWAY_PASSWORD` es obligatoria con un `SITE_URL` público). En Coolify u otro orquestador: construir con ese `Dockerfile` (contexto = raíz), puerto 3000, volumen en `/data`, las variables de la tabla y el *health check* en `/healthCheck`.

### Antes de dar el sitio por bueno

1. `curl -i https://<dominio>/healthCheck` → `200` con `{"status":"ok"}` (y no pide sesión).
2. `curl -i https://<dominio>/robots.txt` y `/sitemap.xml` muestran el dominio de `SITE_URL`, no `localhost`.
3. En el registro del arranque no aparece «Configuración no válida» (si falta `SESSION_SECRET` o `GATEWAY_MODE` es inválido, el servidor sale con código 1 y lo dice).
4. Entrar con una persona real: el acceso pide el segundo factor (si `MFA_SECRET_KEY` está definida) y, con una sesión, `GET /gateway/mfa/status` muestra los métodos disponibles (correo y SMS en `available: true` si están configurados).
5. Una pantalla con mapa (Lugares o Zonas) carga las teselas y la consola del navegador no muestra violaciones de la CSP (con `CSP_MODE=report-only` solo se anotan).
6. Todo detrás del proxy real y por HTTPS: el service worker de la PWA solo se registra con HTTPS y las cookies de sesión son `Secure`.

## Con Docker (desarrollo)

Sin instalar Node ni copiar `.env`: `docker compose up` (o `pnpm run docker:dev`) levanta el gateway simulado, Mailpit y `next-ruteando` compilado y servido en http://localhost:3000 (usuarios y contraseña como en la sección anterior). La primera vez instala las dependencias en volúmenes de Docker y compila, y tarda unos minutos; después solo reinstala si cambia el `pnpm-lock.yaml`. Si algo queda raro, `docker compose down -v`. No hay recarga al guardar (`next dev` no hidrata detrás de `proxy.ts`): tras cambiar código, `docker compose restart web`.

```
docker compose up                              # app en :3000 + gateway simulado en :4010 + Mailpit en :8025
docker compose --profile test run --rm test    # pruebas de next-ruteando (pnpm run docker:test)
docker compose down                            # parar (pnpm run docker:down); `down -v` borra también las dependencias
```

Para usar otro gateway define `DOCKER_GATEWAY_URL` y `DOCKER_GATEWAY_API_KEY` (en `.env` o en el entorno); `GATEWAY_URL` y `GATEWAY_API_KEY` no se usan aquí a propósito, para no apuntar al gateway real por accidente. La base de datos del segundo factor es un SQLite en un volumen de Docker (`mfa_data`). Es una imagen de desarrollo (`Dockerfile.dev`), no la de producción.

## Desarrollo

Desde la raíz: `pnpm run build` y `pnpm start` (puerto 3000), y `pnpm --filter next-ruteando run test` (Vitest) o `... run test:coverage` (umbral del 80 %). Lint, formato y tipos del BFF: `pnpm --filter next-ruteando run lint`, `format` y `typecheck`. `next dev` no hidrata detrás de `proxy.ts`: verifica en navegador contra `build` + `start`.

## Instalar como aplicación (PWA)

La compilación de producción es una PWA: en Chrome o Edge aparece «Instalar aplicación» en la barra de direcciones; en iPhone/iPad, «Compartir → Añadir a pantalla de inicio». El service worker (`next-ruteando/public/sw.js`) guarda la carcasa estática, los iconos y las teselas del mapa; los datos y la sesión siempre vienen de la red y sin conexión se muestra `/offline`. Se registra solo en producción (en `next dev` no hay service worker). Requiere HTTPS salvo en `localhost`. `SITE_URL` define las direcciones absolutas del manifiesto, el `sitemap.xml`, el `robots.txt` y los datos estructurados de `/about`.

## Vigilancia con Jenkins (`/healthCheck`)

### Ruta

| | |
|---|---|
| Ruta | `GET /healthCheck` (también responde `HEAD`) |
| Acceso | Público: sin sesión, sin `X-Api-Key` y sin pasar por el gateway |
| Producción | `https://<tu-dominio>/healthCheck` (la misma dirección y puerto que la aplicación) |
| Local | `http://localhost:3000/healthCheck` con `pnpm run build && pnpm start` |
| Docker | `http://localhost:3000/healthCheck` con `docker compose up` |
| Cabeceras | `Content-Type: application/json` |

```
curl -i https://<tu-dominio>/healthCheck
```

| Respuesta | Cuerpo | Significa |
|---|---|---|
| `200` | `{"status":"ok"}` | El servidor atiende. |
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

`.github/workflows/ci.yml` verifica cada pull request (a cualquier rama base) y cada push a `main` con cuatro trabajos: `Next.js BFF` (lint, formato, tipos, pruebas con cobertura del 80 %, compilación de producción e imagen de Docker), `Specs` (`openspec validate --specs --strict`), `Auditoría` (`pnpm audit` de las dependencias de producción, nivel alto) y `ci`, que resume los anteriores. **La comprobación obligatoria de `main` es `ci`.** Usa el Node de `.nvmrc`, pnpm (versión de `packageManager`) y `pnpm install --frozen-lockfile`, y no necesita secretos ni el gateway real.

Lo mismo en local:

```
pnpm install --frozen-lockfile
pnpm --filter next-ruteando run lint && pnpm --filter next-ruteando run format && pnpm --filter next-ruteando run typecheck
pnpm --filter next-ruteando run test:coverage && pnpm --filter next-ruteando run build
npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict
pnpm audit --prod --audit-level=high
```

Dependabot propone cada semana las actualizaciones de las dependencias (ecosistema `npm` de Dependabot, que lee `pnpm-lock.yaml`) y de las acciones, que pasan por el mismo CI. La versión del CLI de OpenSpec (`OPENSPEC_VERSION` en el flujo) y los SHA de las acciones se actualizan a mano o con esos pull requests.

## Más información

`CLAUDE.md` describe la arquitectura, y las decisiones y requisitos están en `openspec/`. El frontend Angular (`ng-ruteando/`) y el servidor Express (`server/`) se retiraron al migrar a Next.js: siguen en el historial de git (último commit que los contiene: `75d5dc78`; el de la aplicación AngularJS, `19b1cb4`).
