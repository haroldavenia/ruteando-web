# Documentación del API (`docs/`)

Índice de la documentación de referencia de **hanoit-api**. Los flujos de Fase 4 citan el código en `src/main/java/...` como fuente de verdad.

## Estructura de carpetas

| Carpeta | Contenido |
|---------|-----------|
| [`api/`](api/) | Referencia REST (`endpoints.md`), ruteo v3, geocoding HTTP |
| [`auth/`](auth/) | Autenticación `/api/v1/auth/*`, material legacy y flujo JWT detallado |
| [`flows/`](flows/) | Flujos end-to-end Fase 4: onboarding, billing, OTP, auditoría |
| [`data/`](data/) | Diccionarios MongoDB, ER, mapa de migración legacy |
| [`testing/`](testing/) | **Gate canónico** [`README.md`](testing/README.md), JaCoCo, análisis estático, E2E F4-11, Stripe local |
| [`routing/`](routing/) | Motor de optimización (VRP, OSRM-JNI) |
| [`operations/`](operations/) | Logging operativo (Logback, driver Mongo) |
| [`frontend/`](frontend/) | Guía de migración URL legacy → `/api/*` |
| [`reference/`](reference/) | Material de referencia (p. ej. roles por campo) |
| [`diagrams/`](diagrams/) | Secuencias y arquitectura (Mermaid) |

## Flujos de dominio (Fase 4)

| Documento | Cubre |
|-----------|-------|
| [`flows/TENANT_ONBOARDING_FLOW.md`](flows/TENANT_ONBOARDING_FLOW.md) | Signup, verify email, login, trial, invitaciones, seats, lifecycle de tenant |
| [`flows/BILLING_SUBSCRIPTIONS_FLOW.md`](flows/BILLING_SUBSCRIPTIONS_FLOW.md) | Planes, Stripe (checkout, portal, webhooks), trial, seats, errores |
| [`flows/NOTIFICATIONS_OTP_FLOW.md`](flows/NOTIFICATIONS_OTP_FLOW.md) | OTP SMS/email, rate limit dual, errores |
| [`flows/AUDIT_LOG_FLOW.md`](flows/AUDIT_LOG_FLOW.md) | Modelo `AuditLog`, acciones, endpoints, privacidad |
| [`testing/PHASE_4_VALIDATION_REPORT.md`](testing/PHASE_4_VALIDATION_REPORT.md) | Validación E2E F4-11 (12 flujos + checklist) |

## Auth y catálogo de endpoints

| Documento | Cubre |
|-----------|-------|
| [`api/endpoints.md`](api/endpoints.md) | Tabla completa `/api/*`, error codes, GeoJSON |
| [`auth/AUTHENTICATION_ENDPOINTS.md`](auth/AUTHENTICATION_ENDPOINTS.md) | Detalle `/api/v1/auth/*`, hardening F4-08, OTP público F4-10 |
| [`auth/AUTH_USER.md`](auth/AUTH_USER.md) | Legacy + tabla comparativa (deprecado) |
| [`auth/FLUJO_AUTENTICACION_DETALLADO.md`](auth/FLUJO_AUTENTICACION_DETALLADO.md) | JWT/refresh a bajo nivel (parcialmente legacy) |

## Swagger / OpenAPI (interactivo)

Con el API levantado en el puerto configurado (por defecto **8000**):

- **Swagger UI:** `https://localhost:8000/swagger-ui.html`
- **Especificación:** `https://localhost:8000/v3/api-docs`

El bean `com.hanoit.OpenAPIConfig` publica el contrato **versión 2.1**: resumen de Fase 4, tags para billing, notificaciones, invitaciones, auditoría y webhooks, seguridad **Bearer JWT**, y ejemplos en anotaciones SpringDoc alineados con [`api/endpoints.md`](api/endpoints.md). Índice raíz del repo: [`INDICE_DOCUMENTACION.md`](../INDICE_DOCUMENTACION.md) (sección *Swagger / OpenAPI*).

## Datos y modelo

| Documento | Cubre |
|-----------|-------|
| [`data/DATABASE_DATA_DICTIONARY.md`](data/DATABASE_DATA_DICTIONARY.md) | Diccionario por colección (incluye Parte C F4) |
| [`data/DATABASE_ER_DIAGRAM.md`](data/DATABASE_ER_DIAGRAM.md) | Diagrama ER MongoDB |
| [`data/Diccionario_Datos_Unificado_MongoDB.md`](data/Diccionario_Datos_Unificado_MongoDB.md) | Decisiones de arquitectura + §F4 |
| [`data/migration-map.md`](data/migration-map.md) | Legacy → modelo multitenant (histórico; no hay migración) |

## API operativa (ruteo y geocoding)

| Documento | Cubre |
|-----------|-------|
| [`api/API_ROUTING_V3.md`](api/API_ROUTING_V3.md) | Endpoints single / nearest / messenger |
| [`api/GEOCODING_API.md`](api/GEOCODING_API.md) | Proveedores de geocoding |
| [`routing/ROUTING_OPTIMIZATION.md`](routing/ROUTING_OPTIMIZATION.md) | Algoritmos y OSRM-JNI |

## Testing y operación

| Documento | Cubre |
|-----------|-------|
| [`testing/README.md`](testing/README.md) | **Fuente canónica:** `mvn verify`, JaCoCo 90%, CI, mocks |
| [`testing/STATIC_ANALYSIS.md`](testing/STATIC_ANALYSIS.md) | Checkstyle, SpotBugs, PMD |
| [`testing/JACOCO_EXCLUSIONS.md`](testing/JACOCO_EXCLUSIONS.md) | Whitelist exclusiones JaCoCo |
| [`testing/TESTING.md`](testing/TESTING.md) | Inventario histórico Fase 1+2 (abr 2026) |
| [`testing/API_TESTING_GUIDE.md`](testing/API_TESTING_GUIDE.md) | Postman versionado + curl |
| [`testing/STRIPE_BILLING_TESTING.md`](testing/STRIPE_BILLING_TESTING.md) | Stripe en local |
| [`testing/GEOCODING_TESTS.md`](testing/GEOCODING_TESTS.md) | Tests de geocoding |
| [`adr/ADR-006-quality-gates-static-analysis.md`](adr/ADR-006-quality-gates-static-analysis.md) | Decisión gates 90% + estático |
| [`operations/LOGGING_MONGODB.md`](operations/LOGGING_MONGODB.md) | Logback y MongoDB |
| [`operations/RATE_LIMITING.md`](operations/RATE_LIMITING.md) | Rate limit Bucket4j + Redis (capas, reglas, proxy) |
| [`operations/LEGACY_DB_CLEANUP.md`](operations/LEGACY_DB_CLEANUP.md) | Borrado de colecciones legacy (script mongosh con dry-run) |
| [`configuration/APPLICATION_CONFIG.md`](configuration/APPLICATION_CONFIG.md) | YAML, secretos, perfiles |

## Frontend y referencia RBAC

| Documento | Cubre |
|-----------|-------|
| [`frontend/migration-guide.md`](frontend/migration-guide.md) | Mapeo URL, errores F4, GeoJSON |
| [`reference/fields-role.md`](reference/fields-role.md) | Roles, planes, seats, permisos por área |

## Diagramas

| Documento | Cubre |
|-----------|-------|
| [`diagrams/architecture/components.md`](diagrams/architecture/components.md) | Capas del sistema |
| [`diagrams/sequence/auth-login.md`](diagrams/sequence/auth-login.md) | Login multitenant |
| [`diagrams/sequence/journey-plan.md`](diagrams/sequence/journey-plan.md) | Planificación de jornadas |
| [`diagrams/sequence/package-upload.md`](diagrams/sequence/package-upload.md) | Upload CSV |
| [`diagrams/sequence/geocoding.md`](diagrams/sequence/geocoding.md) | Geocoding |

## Specs (proceso de implementación)

Las specs viven en [`specs/`](../specs/): **fase 1**, **fase2**, **fase4**. Describen el proceso y pueden incluir *Notas de divergencia* respecto al código; el comportamiento en runtime está en los documentos de **`flows/`** y en [`api/endpoints.md`](api/endpoints.md).

**Cierre Jul 2026:** config YAML (`docs/configuration/APPLICATION_CONFIG.md`), SMS OTP Twilio (ADR-002), rate limit Redis (`operations/RATE_LIMITING.md`), Postman [`postman/`](../postman/), **gates de calidad ADR-006** (`mvn verify`, JaCoCo 90%, análisis estático).

| Spec (ejemplo) | Doc de flujo |
|----------------|--------------|
| `fase4/TASK_F4_02_*.md` | [`flows/AUDIT_LOG_FLOW.md`](flows/AUDIT_LOG_FLOW.md) |
| `fase4/TASK_F4_03_*.md` | [`flows/TENANT_ONBOARDING_FLOW.md`](flows/TENANT_ONBOARDING_FLOW.md) §2–§5 |
| `fase4/TASK_F4_07_*.md` | [`flows/BILLING_SUBSCRIPTIONS_FLOW.md`](flows/BILLING_SUBSCRIPTIONS_FLOW.md) |
| `fase4/TASK_F4_10_*.md` | [`flows/NOTIFICATIONS_OTP_FLOW.md`](flows/NOTIFICATIONS_OTP_FLOW.md) |
| `fase4/TASK_F4_11_*.md` | [`testing/PHASE_4_VALIDATION_REPORT.md`](testing/PHASE_4_VALIDATION_REPORT.md) |

---

**Índice raíz del repo:** [`INDICE_DOCUMENTACION.md`](../INDICE_DOCUMENTACION.md)

**Última reorganización:** abril 2026 — carpetas `api/`, `auth/`, `flows/`, `data/`, `testing/`, `routing/`, `operations/`, `reference/`; documentación OpenAPI 2.1 (Fase 4) enlazada arriba.
