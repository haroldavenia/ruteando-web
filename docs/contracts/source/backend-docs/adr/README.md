# ADR — Architecture Decision Records

Índice de decisiones técnicas post–Fase 4 (cierre Jul 2026). Copia operativa de Obsidian `10_Projects/HANOIT-API/ADR/`.

| ID | Título | Estado |
|---|---|---|
| [ADR-001](ADR-001-yaml-configuration.md) | Consolidación YAML + `secrets.yml` | Aceptado |
| [ADR-002](ADR-002-twilio-sms-otp.md) | SMS OTP vía Twilio | Aceptado |
| [ADR-003](ADR-003-distributed-rate-limiting.md) | Rate limit Bucket4j + Redis | Aceptado |
| [ADR-004](ADR-004-rest-endpoint-conventions.md) | Convenciones REST `/api/v1` | Aceptado |
| [ADR-005](ADR-005-oauth2-stack-removal.md) | Remoción stack OAuth2 legacy | Aceptado |
| [ADR-006](ADR-006-quality-gates-static-analysis.md) | JaCoCo 90% + Checkstyle/SpotBugs/PMD en `mvn verify` | Aceptado |

Validación: `mvn verify` 1088 tests OK, 0 violaciones estáticas (Jul 2026).
