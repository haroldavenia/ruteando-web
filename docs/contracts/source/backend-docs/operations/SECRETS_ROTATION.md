# Rotación de secretos (P0) — runbook

> Riesgo **R-01**: credenciales estuvieron en archivos `.properties` versionados
> antes de la migración a `application.yml` + `secrets.yml`. Ignorarlas en git
> **no** las purga del historial. Deben considerarse comprometidas y **rotarse**.

## 1. Modelo de configuración actual (fuente única)

- Config no secreta y versionada: [`application.yml`](../../src/main/resources/application.yml) + `application-{dev,prod,local}.yml`.
- Secretos: [`secrets.yml`](../../src/main/resources/secrets.yml) (gitignored) o variables de entorno `${VAR:default}`.
- Plantilla: [`secrets.yml.example`](../../src/main/resources/secrets.yml.example).
- Import: `spring.config.import: optional:classpath:secrets.yml`.
- Precedencia: `CLI/env > secrets.yml > application-{profile}.yml > application.yml > defaults`.

Los `.properties` legacy están en `.gitignore` "por si reaparecen"; ya no se leen.

## 2. Secretos a rotar

| Secreto | Clave de config | Variable de entorno | Dónde rotar |
|---|---|---|---|
| SMTP Office 365 | `spring.mail.password` (ya no se usa desde 2026-11-19) | `MAIL_PASSWORD` | Revocar en Azure/O365 admin; el correo sale por Brevo |
| Keystore TLS | `server.ssl.key-store-password` | `SSL_KEYSTORE_PASSWORD` | Regenerar `keystore.p12` |
| Claves JWT RSA | `app.jwt.private-key` / `public-key` | (PEM en classpath) | Regenerar par RSA-2048 |
| Brevo | `brevo.api-key` | `BREVO_API_KEY` | Brevo Dashboard > SMTP & API |
| Twilio | `twilio.auth-token` (+ `account-sid`) | `TWILIO_AUTH_TOKEN` | Twilio Console > Auth Tokens |
| OTP pepper | `otp.recipient-pepper` | `OTP_RECIPIENT_PEPPER` | Generar 64 hex aleatorios |
| Stripe | `stripe.secret-key` / `webhook-secret` | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard (roll key) |
| Redis | `spring.data.redis.password` | `REDIS_PASSWORD` | Gestor Redis/infra |
| RabbitMQ | `spring.rabbitmq.password` | `RABBITMQ_PASSWORD` | RabbitMQ admin |

## 3. Procedimiento

1. **Generar** el nuevo valor en el proveedor (o `openssl rand -hex 32` para el pepper / `openssl genpkey` para JWT).
2. **Actualizar** el secreto en el gestor de producción (env vars del deploy o `secrets.yml` montado). No editar `application.yml`.
3. **Desplegar / reiniciar** la app para tomar el nuevo valor.
4. **Revocar** el valor anterior en el proveedor.
5. **Verificar** el flujo afectado (envío de email/SMS, login JWT, webhook Stripe).

> Rotar JWT invalida los access tokens vigentes: los clientes deben re-loguear.
> El pepper OTP es obligatorio en `prod` (fail-fast en `OtpService.validateRecipientPepper`).

## 4. Higiene del historial git (opcional, coordinar)

Para eliminar los secretos del historial (reescritura destructiva, requiere coordinación del equipo):

```bash
# Con git-filter-repo (preferido sobre filter-branch)
git filter-repo --path src/main/resources/application.properties --invert-paths
git filter-repo --path src/main/resources/brevo.properties --invert-paths
# ... repetir por cada .properties con secretos, luego force-push coordinado
```

La rotación (§3) es obligatoria **aunque** se reescriba el historial.

## 5. Hallazgos 2026-07-21 (Fase 5 — checklist accionable)

### 5.1 Claves de aplicación aún versionadas en git

Detectadas trackeadas en el repo (no solo en `.gitignore`): `.gitignore` únicamente
evita **futuros** commits; estos archivos ya están en el árbol y en el historial.

```
src/main/resources/keystore.p12
src/main/resources/private_ruteando_key.pem
src/main/resources/public_ruteando_key.pem
```

Pasos (coordinar; verificar antes que el runtime lea las claves desde `secrets.yml`
o una ruta fuera del repo para no romper el arranque):

```bash
# 1) Dejar de trackearlas (permanecen en disco; ya están en .gitignore)
git rm --cached src/main/resources/keystore.p12 \
  src/main/resources/private_ruteando_key.pem \
  src/main/resources/public_ruteando_key.pem
git commit -m "chore(security): stop tracking committed keys (R-01)"

# 2) Purga del historial (destructivo, force-push coordinado)
git filter-repo --path src/main/resources/keystore.p12 \
  --path src/main/resources/private_ruteando_key.pem \
  --path src/main/resources/public_ruteando_key.pem --invert-paths

# 3) Regenerar el par JWT RSA y el keystore TLS, y actualizar secrets.yml/env.
```

### 5.2 Clave SSH expuesta (incidente 2026-07-21)

La clave privada `id_ed25519_github` (fingerprint `SHA256:/xUFDY464/V/UOsGNlnxVFu6VERqndPrLbjWXoJfWug`,
cuenta `haroldavenia`) quedó expuesta en un canal de chat → **comprometida**.

- [ ] GitHub → *Settings → SSH and GPG keys* → eliminar esa clave.
- [ ] `ssh-keygen -t ed25519 -C "haroldavenia@gmail.com"` y subir la pública nueva.
- [ ] Actualizar `~/.ssh/config` / agente y validar `ssh -T git@github.com`.

### 5.3 Redis HA en producción (R-02)

- [ ] Desplegar Redis en HA (Sentinel o Cluster); sin HA el rate limit distribuido
      degrada a fallback local por instancia (bypass multi-nodo).
- [ ] Alertar sobre la métrica `ratelimit.decisions` (backend=local ⇒ Redis caído).
- [ ] Referencia: `docs/operations/RATE_LIMITING.md`.

## 6. Estado

- [x] Modelo `secrets.yml` como fuente única (verificado en `application.yml`).
- [x] Pepper OTP fail-fast en prod.
- [x] PR #4 mergeado a `main` (2026-07-21) — hardening OAuth-removal + docs.
- [x] `secrets.yml` local operativo (gitignored; arranque `local` OK; Tomcat :8000 HTTPS).
- [x] Rotación clave SSH expuesta (§5.2, 2026-07-21) — nueva fingerprint
      `SHA256:8udIASiDYok3XESuT/bpae8bcY5yQBEaat7ZAsxIEsg`; clave vieja
      (`SHA256:/xUFDY464/…`) respaldada en `~/.ssh/backup_compromised_20260721/`.
- [ ] Rotación efectiva en proveedores (acción de Ops — **staging/prod**).
- [ ] Destrackeo + purga de `keystore.p12` / `*.pem` (§5.1 — **PR separado post-merge**).
- [ ] Redis HA + alertas (§5.3, R-02 — **solo multi-instancia prod**).
- [ ] Purga de historial git de `.properties` legacy (§4 — coordinar con equipo).

Ver también: [[Risks]] R-01/R-02, `docs/configuration/APPLICATION_CONFIG.md`.

## 7. Backlog staging/prod (orden sugerido)

Ejecutar cuando salgas de local/dev:

1. **PR `chore(security): stop tracking committed keys`**
   - Regenerar par JWT RSA + `keystore.p12` antes de destrackear.
   - `git rm --cached` de los 3 archivos (§5.1) → merge → `git filter-repo` coordinado.
2. **Rotación en proveedores** (tabla §2): JWT → Stripe webhook → Brevo/Twilio → OTP pepper → Redis/RabbitMQ.
3. **Redis HA** (R-02): Sentinel/Cluster + alertas `ratelimit.decisions` backend=local.
4. **Purga historial** `.properties` legacy (§4) si el equipo lo aprueba.

Nota local: `/actuator/health` puede reportar `DOWN` si RabbitMQ no está levantado;
`/actuator/health/liveness` responde 200 con la app en marcha.
