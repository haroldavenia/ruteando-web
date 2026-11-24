# OTP (One-Time Password) — Flujo completo

> **Audiencia:** integradores frontend y QA.
> **Scope:** módulo `Notifications/OTP` de `hanoit-api`. Cubre los 3 endpoints públicos (`send`, `resend`, `verify`), los dos canales (SMS y email), las dos capas de rate limit (Redis + Mongo) y todos los casos de error mapeados por `RoutingExceptionHandler`.
> **Cierre Jul 2026:** SMS vía **Twilio** (`TwilioSmsServiceImpl`); email vía **Brevo**. Config en `application.yml` (`brevo.*`, `twilio.*`, `otp.*`). Ver `docs/configuration/APPLICATION_CONFIG.md`.

## 1. Mapa rápido

| Ruta | Método | Auth | DTO request | DTO response | Caps. global | Caps. interno |
|---|---|---|---|---|---|---|
| `/api/v1/notifications/otp/send` | POST | **público** | [`SendOtpRequest`](../../src/main/java/com/hanoit/routing/dto/SendOtpRequest.java) | [`SendOtpResponse`](../../src/main/java/com/hanoit/routing/dto/SendOtpResponse.java) | 3 / 1 h por `recipient` | 3 / 1 h por hash de recipient |
| `/api/v1/notifications/otp/resend` | POST | **público** | [`ResendOtpRequest`](../../src/main/java/com/hanoit/routing/dto/ResendOtpRequest.java) | [`SendOtpResponse`](../../src/main/java/com/hanoit/routing/dto/SendOtpResponse.java) | 2 / 1 h por `otpId` | máx. 2 reenvíos totales por OTP |
| `/api/v1/notifications/otp/verify` | POST | **público** | [`VerifyOtpRequest`](../../src/main/java/com/hanoit/routing/dto/VerifyOtpRequest.java) | [`VerifyOtpResponse`](../../src/main/java/com/hanoit/routing/dto/VerifyOtpResponse.java) | 5 / 15 min por `otpId` | máx. `brevo.otp.max-attempts` (3) intentos fallidos |

Los tres endpoints están **excluidos de la autenticación** en [`SecurityConfig`](../../src/main/java/com/hanoit/SecurityConfig.java) líneas 113-117 (`permitAll`).

## 2. Configuración

Namespaces en `src/main/resources/application.yml` (secretos en `secrets.yml` o env):

| Key | Ejemplo | Uso |
|---|---|---|
| `otp.length` | 6 | longitud código |
| `otp.ttl-seconds` | 300 | TTL Mongo |
| `otp.max-attempts` | 3 | intentos verify |
| `otp.recipient-pepper` | env `OTP_RECIPIENT_PEPPER` | hash SHA-256 recipient |
| `otp.send-max-per-window` / `otp.send-window-minutes` | 3 / 60 | rate limit interno Mongo |
| `brevo.templates.otp-email` | 9 | template Brevo email |
| `twilio.account-sid`, `twilio.auth-token`, `twilio.from-number` | secrets | SMS Twilio |

Clases: `OtpConfig`, `BrevoConfig`, `TwilioConfig`.

| Propiedad | Default | Significado |
|---|---|---|
| `otp.length` | 6 | longitud del código numérico generado |
| `otp.ttl-seconds` | 300 | TTL aplicado a `expiresAt` y al índice TTL Mongo |
| `otp.max-attempts` | 3 | intentos de **verificación fallidos** antes de bloquear con `MAX_ATTEMPTS_EXCEEDED` |
| `otp.recipient-pepper` | — | sal aplicada a SHA-256 del `recipient` (`OtpConfig`) |
| `brevo.templates.otp-email` | 9 | template ID de Brevo para email |
| `twilio.from-number` | secrets | remitente SMS (Twilio) |

Constantes en [`OtpService`](../../src/main/java/com/hanoit/routing/service/notification/OtpService.java) (desde `OtpConfig`):

| Constante | Valor | Uso |
|---|---|---|
| `MAX_RESENDS` | 2 | máximo de reenvíos por OTP (el 3.º falla con 422) |
| `RATE_LIMIT_WINDOW_MINUTES` | 60 | ventana de rate limit interno por `recipientHash` |
| `RATE_LIMIT_MAX_REQUESTS` | 3 | máximo de OTPs nuevos por `recipientHash` y ventana |

## 3. DTOs

### 3.1 `SendOtpRequest`

```json
{
  "recipient": "+573001112233",
  "channel": "sms",
  "purpose": "phone_verification"
}
```

| Campo | Validación |
|---|---|
| `recipient` | `@NotBlank`. Si `channel=sms` → debe coincidir con `^\+\d{10,15}$` (E.164). Si `channel=email` → regex de email básico. |
| `channel` | `@NotBlank`, `@Pattern(^(sms\|email)$)` |
| `purpose` | `@NotBlank`, `@Pattern(^(phone_verification\|login_2fa\|email_2fa)$)` |

### 3.2 `SendOtpResponse`

```json
{
  "otpId": "0c2b48ee-0b9b-4f2d-8c2f-1e6ea6f05aa1",
  "expiresInSeconds": 300,
  "channel": "sms",
  "message": "Código OTP enviado al número terminado en **1233."
}
```

- En `send`, `expiresInSeconds` = TTL completo (`brevo.otp.ttl-seconds`).
- En `resend`, `expiresInSeconds` = segundos restantes hasta `expiresAt` (no se reinicia la ventana).

### 3.3 `ResendOtpRequest`

```json
{
  "otpId": "0c2b48ee-...",
  "channel": "email",
  "recipient": "user@hanoit.com"
}
```

`channel` y `recipient` pueden cambiar respecto al send original (caso típico: SMS → email).

### 3.4 `VerifyOtpRequest`

```json
{ "otpId": "0c2b48ee-...", "code": "123456" }
```

`code` se valida con `@Pattern(^\d{6}$)` — fijo en el DTO. Si cambias `brevo.otp.length`, este patrón NO se actualiza solo y devolverá `VALIDATION_ERROR` para códigos de otra longitud.

### 3.5 `VerifyOtpResponse`

```json
{ "verified": true }
```

(sólo se devuelve en éxito).

## 4. Modelo `OtpRecord`

Persistido en colección **`otp_codes`**.

| Campo | Tipo | Notas |
|---|---|---|
| `otpId` | `String` | índice **único** |
| `recipientHash` | `String` | SHA-256(`recipient` + `brevo.otp.recipient-pepper`) en hex |
| `codeHash` | `String` | BCrypt del código en claro |
| `channel` | `String` | `"sms"` o `"email"` |
| `purpose` | `String` | `phone_verification \| login_2fa \| email_2fa` |
| `attempts` | `int` | intentos de verificación fallidos acumulados |
| `resendCount` | `int` | reenvíos exitosos acumulados |
| `expiresAt` | `Instant` | índice TTL Mongo (`expireAfterSeconds=0`) |
| `createdAt` | `Instant` | poblado por Spring Data (`@CreatedDate`) |

**Importante:** la verificación correcta **borra** el documento (`otpRepository.delete(record)`); no es idempotente.

## 5. Lógica `OtpService`

### 5.1 `sendOtp(recipient, channel, purpose)`

1. Calcula `recipientHash = SHA256(recipient + pepper)`.
2. Cuenta documentos con ese `recipientHash` creados en los últimos 60 min. Si `>= 3` → `OtpRateLimitException` (capa **interna**).
3. Genera código numérico (`otp.length`), `otpId = UUID`, `expiresAt = now + ttl`.
4. Llama canal vía `dispatchOtp` y espera la aceptación del proveedor:
   - **SMS:** `TwilioSmsServiceImpl.sendOtpSms(PhoneE164.toSmsRecipient(...), code, purpose)`
   - **Email:** `BrevoNotificationServiceImpl.sendOtpEmail(...)`
   - Si Twilio o Brevo rechazan, o no están configurados, lanza `NotificationDeliveryException` → **502 `OTP_DELIVERY_FAILED`**. No se persiste el OTP.
5. Persiste `OtpRecord` con `attempts=0`, `resendCount=0`, `codeHash = BCrypt(code)`.
6. Devuelve `OtpResult(otpId, ttlSeconds)`.

### 5.2 `resendOtp(otpId, newChannel, newRecipient)`

1. Busca por `otpId`. Si no existe → `OtpExpiredException`.
2. Si `expiresAt < now` → `OtpExpiredException`.
3. Si `resendCount >= 2` → `OtpMaxResendsException`.
4. Genera **nuevo código** y llama `dispatchOtp` (Twilio SMS o Brevo email). Si el proveedor rechaza, el documento no cambia y la API responde **502**.
5. Solo tras la aceptación actualiza `channel`, `recipientHash`, `codeHash`, **`expiresAt` no cambia**, `resendCount++`, y persiste.

### 5.3 `verifyOtp(otpId, code)`

1. Si no existe registro → `OtpExpiredException`.
2. Si `expiresAt < now` → `OtpExpiredException`.
3. Si `attempts >= maxAttempts` → `OtpMaxAttemptsException` (sin comparar código).
4. Si `BCrypt.matches(code, codeHash)` → **borra** documento → retorna `verified=true`.
5. Si código incorrecto → `attempts++`, guarda, retorna `OtpVerifyResult(false, attemptsRemaining=max(0, maxAttempts - attempts))`. **No lanza excepción**: el controller construye 400 manualmente.

### 5.4 Hash del recipient

```183:194:src/main/java/com/hanoit/routing/service/notification/OtpService.java
    private String hashRecipient(String recipient) {
        try {
            String pepper = brevoConfig.getOtp() != null
                    ? Optional.ofNullable(brevoConfig.getOtp().getRecipientPepper()).orElse("")
                    : "";
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(
                    (recipient + pepper).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
```

> ⚠ El hash usa el `recipient` **tal cual** (sin lower-case ni trim). El `RateLimitFilter` (capa Redis) sí normaliza a minúsculas. Para emails con mayúsculas las dos capas pueden llevar contadores divergentes.

## 6. Doble capa de rate limiting

### 6.1 Capa global (Redis + Bucket4j) — [`RateLimitFilter`](../../src/main/java/com/hanoit/routing/security/ratelimit/RateLimitFilter.java)

| Regla | Capacity | Window | Key |
|---|---|---|---|
| `OTP_SEND` | 3 | 1 h | `OTP_SEND:<recipient lower>` |
| `OTP_RESEND` | 2 | 1 h | `OTP_RESEND:<otpId lower>` |
| `OTP_VERIFY` | 5 | 15 min | `OTP_VERIFY:<otpId lower>` |

Respuesta 429 generada por el filtro:

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Try again in N seconds.",
  "timestamp": "2026-04-23T12:00:00Z",
  "path": "/api/v1/notifications/otp/send"
}
```

Header **`Retry-After: <segundos>`** dinámico (de Bucket4j).

> Si `app.security.rate-limit.enabled=false` (modo test sin Redis), esta capa se desactiva y sólo aplica la interna.

### 6.2 Capa interna (Mongo count) — `OtpService.sendOtp`

Cuenta documentos `otp_codes` con el mismo `recipientHash` creados en los últimos 60 min. Si `>= 3` lanza `OtpRateLimitException` → **429** con `Retry-After: 3600` fijo (handler).

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many OTP requests for this recipient. Try again later.",
  "timestamp": "2026-04-23T12:00:00Z",
  "path": "/api/v1/notifications/otp/send"
}
```

## 7. Proveedores (canales reales)

### 7.1 SMS — `TwilioSmsServiceImpl.sendOtpSms(phoneE164, code, purpose)`

- SDK Twilio; remitente `twilio.from-number`.
- Mensaje plano con código y TTL en minutos.
- Llamada síncrona. Si Twilio no está configurado o rechaza el mensaje, lanza `NotificationDeliveryException` → **502 `OTP_DELIVERY_FAILED`**. El cuerpo de Twilio no sale al cliente.

### 7.2 Email — `BrevoNotificationServiceImpl.sendOtpEmail(email, code, firstName)`

- Template ID: `brevo.templates.otp-email` (default 9).
- Params: `firstName` (resuelto vía `RoutingUserRepository.findByEmailAndDeletedAtIsNull`, fallback `"Usuario"`), `otpCode`.
- Llamada síncrona. Template ausente o rechazo de Brevo → **502 `OTP_DELIVERY_FAILED`**. El resto de correos Brevo sigue siendo asíncrono y no falla la acción de negocio.

### 7.3 Enmascaramiento del `message` HTTP

Hecho en `NotificationController` antes de devolver `SendOtpResponse`:

- **SMS**: `"…terminado en **" + recipient.substring(len-4)`.
- **Email**: `"u***@dominio"` (`maskEmail`).

## 8. Mapping HTTP por excepción

[`RoutingExceptionHandler`](../../src/main/java/com/hanoit/routing/exception/RoutingExceptionHandler.java) (anotado con `@Order(Ordered.HIGHEST_PRECEDENCE)`):

| Escenario | HTTP | `error` | `message` | `details` |
|---|---|---|---|---|
| Validación Jakarta | 400 | `VALIDATION_ERROR` | `"Request validation failed"` | mapa campo→error |
| `IllegalArgumentException` (canal/recipient inválido en controller) | 400 | `BAD_REQUEST` | mensaje del throw | — |
| `OtpVerifyResult.verified=false` (código incorrecto, aún hay intentos) | **400** | `INVALID_OTP` | `"Invalid OTP code"` | `{ attemptsRemaining: <int> }` |
| `OtpExpiredException` (verify/resend; OTP no existe o caducó) | **410** | `OTP_EXPIRED` | `"OTP code has expired or does not exist."` | — |
| `OtpMaxResendsException` | **422** | `MAX_RESENDS` | `"Maximum resend attempts reached (2)"` (mensaje **fijo**, no usa `ex.getMessage()`) | — |
| `OtpMaxAttemptsException` | **422** | `MAX_ATTEMPTS_EXCEEDED` | `"Maximum verification attempts exceeded for this OTP."` | — |
| `OtpRateLimitException` (capa interna) | **429** | `RATE_LIMIT_EXCEEDED` | `"Too many OTP requests for this recipient. Try again later."` | — (header `Retry-After: 3600` fijo) |
| `RateLimitExceededException` (capa Redis) | **429** | `RATE_LIMIT_EXCEEDED` | `"Rate limit exceeded. Try again in N seconds."` | — (header `Retry-After: N` dinámico) |
| `NotificationDeliveryException` (Twilio o Brevo rechazan el OTP) | **502** | `OTP_DELIVERY_FAILED` | `"The verification code could not be delivered. Please try again later."` | — |

> No existe `InvalidOtpException`: `INVALID_OTP` se construye desde el controller, no es una excepción.

## 9. Flujos completos

### 9.1 SEND inicial (SMS) — happy path

```bash
curl -X POST https://api.hanoit.com/api/v1/notifications/otp/send \
  -H 'Content-Type: application/json' \
  -d '{"recipient":"+573001112233","channel":"sms","purpose":"phone_verification"}'
```

Respuesta `200`:

```json
{
  "otpId": "0c2b48ee-...",
  "expiresInSeconds": 300,
  "channel": "sms",
  "message": "Código OTP enviado al número terminado en **1233."
}
```

### 9.2 SEND inicial (email)

```bash
curl -X POST .../api/v1/notifications/otp/send \
  -d '{"recipient":"user@hanoit.com","channel":"email","purpose":"login_2fa"}'
```

Respuesta `200` con `message: "Código OTP enviado a u***@hanoit.com"`.

### 9.3 VERIFY happy path

```bash
curl -X POST .../api/v1/notifications/otp/verify \
  -d '{"otpId":"0c2b48ee-...","code":"948271"}'
```

Respuesta `200`:

```json
{ "verified": true }
```

> Tras esto el `OtpRecord` ya no existe; un segundo verify con el mismo `otpId` devuelve **410 `OTP_EXPIRED`**.

### 9.4 VERIFY código incorrecto (degradación)

| Intento | Estado del registro | HTTP | Body |
|---|---|---|---|
| 1 | `attempts=1` | 400 | `INVALID_OTP`, `attemptsRemaining=2` |
| 2 | `attempts=2` | 400 | `INVALID_OTP`, `attemptsRemaining=1` |
| 3 | `attempts=3` | 400 | `INVALID_OTP`, `attemptsRemaining=0` |
| 4 | `attempts >= 3` | **422** | `MAX_ATTEMPTS_EXCEEDED` |

A partir del 4.º intento, **incluso con el código correcto**, devuelve 422.

### 9.5 RESEND con cambio de canal

```bash
# Send original con SMS, luego resend a email
curl -X POST .../api/v1/notifications/otp/resend \
  -d '{"otpId":"0c2b48ee-...","channel":"email","recipient":"user@hanoit.com"}'
```

- Genera **nuevo código** y lo envía por email.
- `expiresAt` no se modifica.
- `resendCount` pasa de 0→1.
- El **código original ya no es válido** (verify devolverá `INVALID_OTP`).

### 9.6 RESEND con `MAX_RESENDS`

| Resend # | `resendCount` antes | Resultado |
|---|---|---|
| 1 | 0 | 200 |
| 2 | 1 | 200 |
| 3 | 2 | **422 `MAX_RESENDS`** |

### 9.7 SEND con rate limit

#### Capa Redis (filtro)

```bash
# 4ª llamada en 1h al mismo recipient (case-insensitive)
HTTP/1.1 429 Too Many Requests
Retry-After: 875
Content-Type: application/json

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Try again in 875 seconds.",
  "timestamp": "2026-04-23T12:00:00Z",
  "path": "/api/v1/notifications/otp/send"
}
```

#### Capa interna (Mongo)

Cuando el filtro está deshabilitado o el caller logra evadirlo (por ejemplo cambiando capitalización del email), la capa interna captura el abuso:

```bash
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
Content-Type: application/json

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many OTP requests for this recipient. Try again later.",
  "timestamp": "...",
  "path": "/api/v1/notifications/otp/send"
}
```

### 9.8 VERIFY con `OTP_EXPIRED`

Disparado cuando:

- `otpId` no existe (nunca creado, ya consumido, o eliminado por TTL Mongo);
- `expiresAt < now`.

```json
HTTP/1.1 410 Gone
{ "error": "OTP_EXPIRED", "message": "OTP code has expired or does not exist.", "timestamp": "...", "path": "/api/v1/notifications/otp/verify" }
```

### 9.9 SEND con validación inválida

```bash
curl -X POST .../api/v1/notifications/otp/send \
  -d '{"recipient":"abc","channel":"sms","purpose":"phone_verification"}'
```

```json
HTTP/1.1 400
{
  "error": "BAD_REQUEST",
  "message": "Recipient does not match E.164 phone format",
  "timestamp": "...",
  "path": "/api/v1/notifications/otp/send"
}
```

## 10. Casos límite

| Escenario | Comportamiento real |
|---|---|
| `otpId` desconocido en verify/resend | `OtpExpiredException` → **410 `OTP_EXPIRED`** |
| `otpId` ya consumido (verify exitoso previo) | Documento borrado → siguiente verify es **410** (no 200 idempotente) |
| Recipient distinto en resend | Permitido. El nuevo canal/recipient sustituye al anterior; nuevo código |
| Canal en verify | Verify no recibe canal; sólo `otpId` + `code` |
| Email con mayúsculas | Hash interno usa string original; rate limit Redis lo lower-casea → **divergencia entre capas** |
| `brevo.otp.length != 6` | `OtpService` genera el código con el length configurado pero `VerifyOtpRequest` exige 6 dígitos → respuesta `VALIDATION_ERROR` |
| Brevo email / Twilio SMS falla | No se guarda el OTP (en reenvío se conserva el código anterior). **502 `OTP_DELIVERY_FAILED`**. El detalle del proveedor queda en el log |
| Resend con OTP expirado | **410 `OTP_EXPIRED`** antes de tocar `resendCount` |
| Reset por TTL Mongo | Documento puede desaparecer aunque la lógica de negocio lo considere "casi expirado"; verify devolverá **410** |

## 11. Auditoría

`AuditActions.NOTIFICATION_OTP_SENT` y `NOTIFICATION_OTP_VERIFIED` están **definidas** ([`AuditActions.java`](../../src/main/java/com/hanoit/routing/model/constants/AuditActions.java)) pero `OtpService` y `NotificationController` **no llaman a `AuditService.log` para OTP**. Si necesitas trazabilidad de envíos/verificaciones, agrega instrumentación o consume los logs de aplicación (`OtpService` loguea send/verify a nivel `INFO`).

## 12. Tabla de errores de referencia

| Escenario | HTTP | `error` | `message` | `details` |
|---|---|---|---|---|
| Validación DTO (formato código, purpose, etc.) | 400 | `VALIDATION_ERROR` | `Request validation failed` | mapa campo→mensaje |
| Canal/recipient inválido (controller) | 400 | `BAD_REQUEST` | texto del throw | — |
| Código OTP incorrecto (con intentos restantes) | 400 | `INVALID_OTP` | `Invalid OTP code` | `{ attemptsRemaining }` |
| OTP expirado o id desconocido | 410 | `OTP_EXPIRED` | `OTP code has expired or does not exist.` | — |
| Demasiados reenvíos | 422 | `MAX_RESENDS` | `Maximum resend attempts reached (2)` | — |
| Demasiados intentos de verificación | 422 | `MAX_ATTEMPTS_EXCEEDED` | `Maximum verification attempts exceeded for this OTP.` | — |
| Rate limit interno (Mongo) | 429 | `RATE_LIMIT_EXCEEDED` | `Too many OTP requests for this recipient. Try again later.` | header `Retry-After: 3600` |
| Rate limit filtro (Redis) | 429 | `RATE_LIMIT_EXCEEDED` | `Rate limit exceeded. Try again in N seconds.` | header `Retry-After: N` dinámico |
| Twilio o Brevo rechazan el OTP | 502 | `OTP_DELIVERY_FAILED` | `The verification code could not be delivered. Please try again later.` | — |

## 13. Archivos relevantes

- Endpoint y orquestación: [`NotificationController`](../../src/main/java/com/hanoit/routing/controller/NotificationController.java)
- Lógica core: [`OtpService`](../../src/main/java/com/hanoit/routing/service/notification/OtpService.java)
- Modelo: [`OtpRecord`](../../src/main/java/com/hanoit/routing/model/OtpRecord.java)
- Excepciones: [`OtpException`](../../src/main/java/com/hanoit/routing/service/notification/exception/OtpException.java), [`OtpExpiredException`](../../src/main/java/com/hanoit/routing/service/notification/exception/OtpExpiredException.java), [`OtpMaxAttemptsException`](../../src/main/java/com/hanoit/routing/service/notification/exception/OtpMaxAttemptsException.java), [`OtpMaxResendsException`](../../src/main/java/com/hanoit/routing/service/notification/exception/OtpMaxResendsException.java), [`OtpRateLimitException`](../../src/main/java/com/hanoit/routing/service/notification/exception/OtpRateLimitException.java)
- Handler HTTP: [`RoutingExceptionHandler`](../../src/main/java/com/hanoit/routing/exception/RoutingExceptionHandler.java)
- Rate limit: [`RateLimitRule`](../../src/main/java/com/hanoit/routing/security/ratelimit/RateLimitRule.java), [`RateLimitFilter`](../../src/main/java/com/hanoit/routing/security/ratelimit/RateLimitFilter.java)
- Brevo email: [`BrevoNotificationService`](../../src/main/java/com/hanoit/routing/service/notification/BrevoNotificationService.java), [`BrevoNotificationServiceImpl`](../../src/main/java/com/hanoit/routing/service/notification/BrevoNotificationServiceImpl.java)
- Twilio SMS: [`TwilioSmsService`](../../src/main/java/com/hanoit/routing/service/notification/TwilioSmsService.java), [`TwilioSmsServiceImpl`](../../src/main/java/com/hanoit/routing/service/notification/TwilioSmsServiceImpl.java)
- Configuración: [`application.yml`](../../src/main/resources/application.yml), [`OtpConfig`](../../src/main/java/com/hanoit/routing/config/OtpConfig.java), [`TwilioConfig`](../../src/main/java/com/hanoit/routing/config/TwilioConfig.java), [`BrevoConfig`](../../src/main/java/com/hanoit/routing/config/BrevoConfig.java)
- Tests E2E: [`Flow10OtpDualChannelTest`](../../src/test/java/com/hanoit/routing/e2e/Flow10OtpDualChannelTest.java), [`Flow11RateLimitingTest`](../../src/test/java/com/hanoit/routing/e2e/Flow11RateLimitingTest.java)
