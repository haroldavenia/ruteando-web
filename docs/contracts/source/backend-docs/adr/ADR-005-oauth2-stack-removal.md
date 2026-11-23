# ADR-005 — Remoción del stack OAuth2 legacy

**Estado:** Aceptado · **Fecha:** 2026-07-18

Espejo de Obsidian `10_Projects/HANOIT-API/ADR/ADR-005-oauth2-stack-removal.md`.

## Decisión

Eliminar `com.hanoit.oauth` y unificar autenticación en `/api/v1/auth/*` con JWT multitenant (`RoutingUser`, `RoutingAuthController`). Migrar refresh tokens a `com.hanoit.routing.security.token`. `SecurityConfig` solo `/api/v1/**` + `denyAll()` para rutas legacy.

## Impacto resumido

- **Eliminado:** `/auth/*`, `/oauth/*`, `/hanoit/api/v1/user/*`, `CustomUserDetailsService`, `Oauth2Config`, cascada Fase 1 (`RestControllerManager`, `ControlPlanUserController`, …).
- **Canónico:** `RoutingAuthController`, `RefreshTokenService` (`routing.security.token`), `JwtAuthenticationFilter` sin fallback DB.
- **Validación:** `mvn test` 896 OK; Postman 168 requests `/api/v1/*`.

> **Nota (Jul 2026):** Conteo histórico al aprobar este ADR. Gate vigente: [ADR-006](ADR-006-quality-gates-static-analysis.md) — `mvn verify`, 1088 tests, JaCoCo 90%.

Ver [[ADR-004-rest-endpoint-conventions]] y `docs/api/LEGACY_SUNSET_PLAN.md`.
