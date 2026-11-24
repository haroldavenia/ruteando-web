# Postman — Hanoit API (`/api/v1/*`)

Colección oficial y versionada de la plataforma Hanoit (endpoints canónicos `/api/v1/*`, Fase 1/2/4).
Reemplaza la configuración manual descrita en `docs/testing/API_TESTING_GUIDE.md`.

## Archivos

| Archivo | Descripción |
|---|---|
| `Hanoit-API.postman_collection.json` | Colección completa (schema v2.1.0). |
| `environments/Hanoit-Local.postman_environment.json` | Environment local (`https://localhost:8000`). |
| `environments/Hanoit-Staging.postman_environment.json` | Entorno `hanoit` (`https://hanoit:8000`, rutas `/api/v1/*`). |

## Importar en Postman

1. **Import** → arrastra `Hanoit-API.postman_collection.json`.
2. **Import** → arrastra el environment que uses (`Hanoit API - Local`).
3. Selecciona el environment en el selector (arriba a la derecha).
4. El environment local ya trae `test_email` = `admin.sdd-test@hanoit.test`. Pega en `test_password` la contraseña de ese usuario (no está en el repositorio). Una contraseña incorrecta bloquea la cuenta a los 5 intentos.
5. El backend usa un certificado autofirmado (`CN=hanoit`, SAN `localhost` y `hanoit`). En Postman, Settings → Certificates, añade el PEM del servidor, o desactiva la verificación SSL solo para este entorno local.

## Organización

- `00 _Flows`: escenarios end-to-end **ordenados** (ejecutables con Collection Runner / Newman).
  - `A. Onboarding & Session` — register → login → me → tenants/me → refresh → logout.
  - `B. Team & Seats` — verificar seats → invitar → listar → aceptar (público).
  - `C. Billing lifecycle` — subscription → checkout → usage → seats → cancel.
  - `D. OTP dual-channel` — send → resend → verify.
  - `E. Logistics operation` — place → zone → package → settings → plan journey → navigations.
- `01`–`17` + **`09b`**: carpetas por **dominio** (bounded context). El nombre indica el rol mínimo
  (`PUBLIC` / `AUTH` / `TENANT_ADMIN` / `SUPER_ADMIN` / `DRIVER`) según `SecurityConfig`.

### Carpetas nuevas (Jul 2026)

| Carpeta | Contenido |
|---|---|
| `09b Routing Engine [AUTH]` | `POST /api/v1/routing/{directions,matrix,route,nearest,messenger,optimizations,optimizations/point-route,optimizations/collection}` — requiere JWT |
| `10 Driver [DRIVER]` | `driver/routes`, `driver/positions`, `driver/packages/report` y la lectura `GET /positions` |
| `16 Admin [SUPER_ADMIN]` | `admin/geocoding-config` GET/PUT (singleton). Sin endpoints de migración desde 2026-11-19 |

## Buenas prácticas incorporadas

- **Auth heredada a nivel de colección**: `Authorization: Bearer {{access_token}}`.
  Los endpoints públicos hacen override a *No Auth*.
- **Nada hardcodeado**: `{{base_url}}` + variables para todos los IDs y tokens.
- **Encadenamiento automático**: los scripts de `Tests` guardan `access_token`, `refresh_token`,
  `user_id`, `tenant_id` y los IDs de recursos creados (`place_id`, `package_id`, `journey_id`, …).
- **Secretos solo en el environment**: la colección se puede publicar sin exponer credenciales.
- **Aserciones globales**: un test a nivel de colección verifica que ninguna respuesta sea 5xx
  y avisa por consola cuando hay `429` (rate limit) con su `Retry-After`.

## Versionado `/api/v1` (ADR-004)

La superficie **canónica** es `/api/v1/*`. Las variables de entorno incluyen:

- `api_version` = `v1`
- `api_base` = `{{base_url}}/api/v1`

Para integraciones nuevas usa `{{api_base}}/<recurso>` (p. ej. `{{api_base}}/tenants/me`).

**Filtros por query param** (no en el path):
`{{api_base}}/packages?status=pending`, `?serviceType=delivery`, `{{api_base}}/journeys?status=planning`,
`{{api_base}}/resources?active=true`. Plan journey: `POST {{api_base}}/journeys/plan?mode=packages|messenger`.
Activación de tenant unificada: `PATCH {{api_base}}/tenants/{id}` con `{ "active": false, "reason": "..." }`.

Mapa completo: `docs/api/ENDPOINT_MIGRATION_MAP.md`. Retiro legacy: `docs/api/LEGACY_SUNSET_PLAN.md`.

**OAuth2 legacy eliminado (2026-07-18):** no uses `/auth/*`, `/oauth/*` ni `/hanoit/**` en requests Postman; la API responde **403**. Auth canónica: `/api/v1/auth/*`.

## Primer uso (orden recomendado)

1. Abre `00 _Flows > A. Onboarding & Session`.
2. Ejecuta `2. Login` (o `1. Register` si el tenant no existe). Esto puebla `access_token`,
   `refresh_token`, `user_id` y `tenant_id`.
3. A partir de ahí, cualquier request protegido de las carpetas `01`–`17` ya funciona.

> Nota: el **token de invitación** y los tokens de **verify-email / reset-password** llegan por
> email (Brevo) y no se exponen por API. Cópialos manualmente en las variables
> `invitation_token`, o en el body correspondiente, para probar los flujos públicos de aceptación.

## Ejecutar con Newman (CI)

```bash
npm install -g newman

newman run postman/Hanoit-API.postman_collection.json \
  -e postman/environments/Hanoit-Local.postman_environment.json \
  --folder "00 _Flows" \
  --reporters cli,junit \
  --reporter-junit-export target/newman/report.xml
```

Para correr solo un dominio, cambia `--folder` (por ejemplo `--folder "01 Auth & Session [PUBLIC]"`).

> Los flujos que dependen de servicios externos (Stripe, Brevo, geocoding) requieren esos
> servicios configurados o mockeados. En CI, limita la ejecución a los folders que no dependan
> de terceros, o usa Stripe CLI (`stripe listen` / `stripe trigger`) para el webhook.

## Mantenimiento

La fuente de verdad son los controllers bajo `/api/v1` en `src/main/java/com/hanoit/routing/controller`
y controllers operacionales (`OsrmController`, `DeliveryControllerJNI`, mobile, etc.).
Al añadir o cambiar un endpoint `/api/v1/*`, actualiza esta colección (request + ejemplo + descripción)
en la misma PR. Prefiere `{{api_base}}/...` para requests nuevos.
