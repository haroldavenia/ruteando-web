# ADR-003 — Rate limiting distribuido (Bucket4j + Redis)

**Estado:** Aceptado  
**Fecha:** 2026-07-17  
**Supersedes:** `RateLimiter` in-memory (`service/ratelimit/RateLimiter.java` — **eliminado**)

## Contexto

F4-08 introdujo Bucket4j + Redis. El cierre Jul 2026 endureció el modelo: capas global IP / autenticado / por endpoint, greedy refill, fallback fail-closed local, métricas Micrometer.

## Decisión

| Capa | Key | Clases |
|---|---|---|
| Global IP | `GLOBAL_IP:<ip>` | `RateLimitFilter.enforceGlobalLayer`, `RateLimitService.enforceGlobalIp` |
| Autenticado | `AUTHENTICATED:<userId>` | `RateLimitService.enforceAuthenticated` |
| Por endpoint | `<RULE>:<discriminador>` | `RateLimitRule` (LOGIN, REGISTER, OTP_*, INVITATIONS, ROUTING_PUBLIC) |

**Implementación:**
- `RateLimitConfig.bucket4jProxyManager()` → `LettuceBasedProxyManager` + `RedisClient`
- `RateLimitService.enforce(key, rule)` → token bucket **greedy refill**; retorna `RateLimitDecision`
- `RateLimitFilter.doFilterInternal` → resuelve regla, extrae key del body/JWT/IP, escribe headers `RateLimit-*`
- Fallback in-memory (`localBucket`) solo reglas fail-closed si Redis no disponible
- Métrica: `ratelimit.decisions`

**Config:** `app.security.rate-limit.*` en `application.yml`; Redis en `spring.data.redis.*`.

## Reglas OTP (referencia)

| Regla | Endpoint | Límite |
|---|---|---|
| `OTP_SEND` | POST `/api/v1/notifications/otp/send` | 3/h por recipient |
| `OTP_RESEND` | POST `/api/v1/notifications/otp/resend` | 2/h por otpId |
| `OTP_VERIFY` | POST `/api/v1/notifications/otp/verify` | 5/15min por otpId |

Defensa adicional Mongo en `OtpService.sendOtp` (`OtpRepository.countByRecipientHashAndCreatedAtAfter`).

## Consecuencias

- Redis recomendado HA en producción; doc operativa: `docs/operations/RATE_LIMITING.md`.
- Tests: `RateLimitFilterTest`, `RateLimitServiceTest`, `Flow11RateLimitingTest`.
- Edge/WAF/nginx siguen siendo capa 1 anti-volumétrica (defensa en profundidad).

## Validación

- 1146 tests OK; Flow11 rate limiting E2E verde.

> **Nota (Jul 2026):** Conteo histórico al aprobar este ADR. Gate vigente: [ADR-006](ADR-006-quality-gates-static-analysis.md) — `mvn verify`, 1088 tests, JaCoCo 90%.
