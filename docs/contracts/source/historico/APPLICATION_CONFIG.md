# Configuración de la aplicación

> Cierre técnico Jul 2026 — reemplaza la convención de múltiples `.properties` fragmentados.

## Archivos

| Archivo | Versionado | Contenido |
|---------|------------|-----------|
| `src/main/resources/application.yml` | Sí | Config común (no secreta): Spring, Mongo, Redis, mail, rate-limit, stripe/brevo/twilio/otp namespaces |
| `src/main/resources/application-dev.yml` | Sí | Perfil dev (default) |
| `src/main/resources/application-prod.yml` | Sí | Perfil producción |
| `src/main/resources/application-local.yml` | Sí | Perfil local (p. ej. sin Redis) |
| `src/main/resources/secrets.yml.example` | Sí | Plantilla de secretos |
| `src/main/resources/secrets.yml` | **No** (gitignore) | Secretos reales |
| `src/main/resources/messages.properties` | Sí | i18n Bean Validation |
| `src/main/resources/osrm.properties` | Sí | Perfiles OSRM (JNI nativo `-Dosrm.properties`) |

Tests: `src/test/resources/application.yml`, `application-test.yml`.

## Precedencia

```
CLI / variables de entorno
  > secrets.yml (optional import)
  > application-{profile}.yml
  > application.yml
  > defaults @ConfigurationProperties
```

## Clases de configuración

| Clase | Prefix / namespace |
|-------|-------------------|
| `StripeConfig` | `stripe.*` |
| `BrevoConfig` | `brevo.*` |
| `TwilioConfig` | `twilio.*` |
| `OtpConfig` | `otp.*` |
| `RateLimitProperties` | `app.security.rate-limit.*` |
| `RateLimitConfig` | Beans Redis + `LettuceBasedProxyManager` |
| `MongoConfig` | `@Value("${mongodb.database.*}")` (Testcontainers) |
| `GeocodingConfig` | geocoding namespaces en YAML |
| `Oauth2Config` | oauth2 en YAML |

## Propiedades que afectan al frontend

### CORS (`cors.*`, `CorsProperties`)

| Propiedad | Valor por defecto |
|-----------|-------------------|
| `cors.allowed-origins` | `http://localhost:3010,http://localhost:8080` |
| `cors.allowed-methods` | `GET,POST,PUT,DELETE,PATCH,OPTIONS` |
| `cors.allowed-headers` | `Authorization,Content-Type,X-Requested-With,Accept,Origin` |
| `cors.allow-credentials` | `true` |
| `cors.max-age` | `3600` |

Decisión (ADR-F001 del frontend): **proxy del mismo origen**. ruteando-web llama a la API por su
propio origen y el proxy reenvía sin la cabecera `Origin`, así que no se añaden orígenes por
entorno. Una petición con un `Origin` que no está en la lista responde 403 desde el filtro CORS
(por ejemplo, el login llamado directamente desde el navegador); es el comportamiento esperado.
Si algún entorno necesitara llamadas directas, se añade su origen a `cors.allowed-origins` en el
perfil de ese entorno.

### Enlaces de los correos (`app.*`)

| Propiedad | Defecto | Perfil `dev` | Uso |
|-----------|---------|--------------|-----|
| `app.frontend-url` | `https://app.hanoit.com` | — | Base de los enlaces al SPA |
| `app.email-verification-link-base` | `""` | `https://hanoit:8000` | Si tiene valor, el correo de verificación apunta al backend |

Enlaces resultantes:

| Correo | Enlace |
|--------|--------|
| Verificación (plantilla #1) | `{email-verification-link-base}/api/v1/auth/verify-email?token=` si la propiedad tiene valor (el backend responde HTML con un enlace a `{frontend-url}/login`); si no, `{frontend-url}/verify-email?token=` |
| Restablecer (plantilla #2) | `{frontend-url}/reset-password?token=` |
| Invitación (plantilla #3) | El backend solo envía el parámetro `invitation_token`; la URL la arma la plantilla en Brevo |

Las rutas `/verify-email` y `/reset-password` no llevan `#`. Un SPA con rutas hash debe
redirigirlas o el entorno debe ajustar `app.frontend-url` y la plantilla #3.

### OpenAPI (`springdoc.*`)

`/v3/api-docs` (JSON) y `/swagger-ui.html` están habilitados y son públicos en todos los perfiles
(`SecurityConfig` los deja en `permitAll`). El frontend usa `/v3/api-docs` para su `contract-diff`.

## Migración desde `.properties`

Eliminados: `application.properties`, `mongo.properties`, `oauth2.properties`, `brevo.properties`, `general.properties`, `swagger.properties`, perfiles `.properties` legacy.

`AppConfig` ya no usa `@PropertySource`.

## ADR

Decisión formal: [`docs/adr/ADR-001-yaml-configuration.md`](../adr/ADR-001-yaml-configuration.md)

## Operación

1. Copiar `secrets.yml.example` → `secrets.yml` y completar valores.
2. O exportar variables de entorno (`BREVO_API_KEY`, `TWILIO_*`, `STRIPE_*`, `OTP_RECIPIENT_PEPPER`, …).
3. Perfil: `-Dspring.profiles.active=prod`.

Ver también: [`operations/RATE_LIMITING.md`](../operations/RATE_LIMITING.md), [`postman/README.md`](../../postman/README.md).
