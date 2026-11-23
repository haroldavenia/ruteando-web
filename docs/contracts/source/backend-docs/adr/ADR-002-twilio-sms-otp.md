# ADR-002 — SMS OTP vía Twilio (separación de canales)

**Estado:** Aceptado  
**Fecha:** 2026-07-17  
**Supersedes:** Diseño original F4-01 (SMS vía Brevo Transactional SMS API)

## Contexto

F4-01 especificaba OTP SMS y email en `BrevoNotificationService`. En implementación final el SMS se externalizó a Twilio por fiabilidad operativa y separación de responsabilidades.

## Decisión

| Canal | Proveedor | Clase principal | Método |
|---|---|---|---|
| SMS OTP | **Twilio** | `TwilioSmsServiceImpl` | `sendOtpSms(phoneE164, code, purpose)` |
| Email OTP | **Brevo** | `BrevoNotificationServiceImpl` | `sendOtpEmail(email, code, firstName)` |
| Orquestación | — | `OtpService` | `sendOtp`, `resendOtp`, `verifyOtp`, `dispatchOtp` |

- Validación E.164 centralizada: `PhoneE164.isValid`, `toSmsRecipient`.
- Config tipada: `TwilioConfig` (`twilio.*`), `OtpConfig` (`otp.*` — length, ttl, pepper).
- Dependencia Maven: `com.twilio.sdk:twilio:10.9.2`.

## Grafo (Codebase Memory)

`NotificationController.sendOtp` → `OtpService.sendOtp` → `dispatchOtp` → `TwilioSmsServiceImpl.sendOtpSms` (SMS) | `BrevoNotificationServiceImpl.sendOtpEmail` (email).

## Consecuencias

- `BrevoNotificationService` ya no expone SMS; specs F4-01 y flow OTP actualizados.
- Operadores configuran `TWILIO_*` en `secrets.yml`/env, no `brevo.sms.*`.
- Tests: `TwilioSmsServiceImplTest`, `Flow10OtpDualChannelTest`, `PhoneE164Test`.

## Validación

- E2E Flow10 OTP dual-channel en suite verde.
