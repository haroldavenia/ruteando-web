# ADR-001 — Consolidación de configuración en YAML

**Estado:** Aceptado  
**Fecha:** 2026-07-17  
**Contexto:** F4 cierre técnico — eliminación de 13 fragmentos `.properties` y `@PropertySource`.

## Contexto

La configuración estaba fragmentada (`application.properties`, `mongo.properties`, `oauth2.properties`, `brevo.properties`, …) con duplicación (`app.security.rate-limit.*` en dos archivos) y secretos versionados en git.

## Decisión

- **Fuente versionada única:** `src/main/resources/application.yml` + perfiles `application-{dev,prod,local}.yml`.
- **Secretos:** `secrets.yml` (gitignored) importado vía `spring.config.import: optional:classpath:secrets.yml`; plantilla `secrets.yml.example`.
- **Precedencia:** CLI/env > `secrets.yml` > perfil > `application.yml`.
- **Eliminar** `@PropertySource` de `AppConfig`, `MongoConfig`, `GeocodingConfig`, `Oauth2Config`.
- **Conservar:** `messages.properties` (i18n), `osrm.properties` (JNI nativo).

## Clases / rutas afectadas

| Ruta | Cambio |
|---|---|
| `AppConfig.java` | Sin `@PropertySource` |
| `MongoConfig.java` | Sin `@PropertySource`; `@Value("${mongodb.database.*}")` conservado (Testcontainers) |
| `GeocodingConfig.java`, `Oauth2Config.java` | Sin `@PropertySource` |
| `application.yml` | Namespace unificado: `spring.*`, `stripe.*`, `brevo.*`, `twilio.*`, `otp.*`, `app.security.rate-limit.*` |
| `.gitignore` | `secrets.yml`, `*.pem`, legacy `.properties` |

## Consecuencias

- Despliegues deben migrar variables a env/`secrets.yml` antes de eliminar `.properties` locales.
- Documentación y specs actualizados; referencias a `application.properties` obsoletas.
- **Riesgo residual:** secretos en historial git → rotación obligatoria (ver Obsidian `Risks.md` R-01 o checklist ops).

## Validación

- `mvn test`: 1146 tests OK.

> **Nota (Jul 2026):** Conteo histórico al aprobar este ADR. Gate vigente: [ADR-006](ADR-006-quality-gates-static-analysis.md) — `mvn verify`, 1088 tests, JaCoCo 90%.
