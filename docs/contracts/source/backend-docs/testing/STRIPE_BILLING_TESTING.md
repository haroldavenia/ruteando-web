# Stripe Billing — Guía de pruebas E2E (F4-07)

Guía práctica para validar la integración Stripe per-seat con tiers desde backend y frontend. Cubre Checkout, Portal, upgrade, seats, cancelación, webhooks, idempotencia, fallos de pago y re-suscripción.

> **Scope**: F4-07 (`/api/billing/**` + `/api/webhooks/stripe`) sobre el modelo per-seat documentado en `TASK_F4_07_STRIPE_INTEGRATION.md` y `PROMPT_MIGRACION_FASE4.md`.
>
> **Pre-condición**: F4-01…F4-06 ya implementados. Existe al menos un tenant con un `TENANT_ADMIN` (creado vía F4-03 self-service o seed) y un JWT válido.

## Índice

1. [Pre-flight](#1-pre-flight)
2. [Preparar TENANT_ADMIN + JWT](#2-preparar-tenant_admin--jwt)
3. [Happy path: Checkout → pago → webhooks](#3-happy-path)
4. [PUT /api/billing/seats](#4-put-apibillingseats)
5. [POST /api/billing/upgrade](#5-post-apibillingupgrade)
6. [POST /api/billing/portal](#6-post-apibillingportal)
7. [POST /api/billing/cancel + downgrade](#7-post-apibillingcancel--downgrade)
8. [Idempotencia de webhooks](#8-idempotencia-de-webhooks)
9. [Firma inválida](#9-firma-inv%C3%A1lida)
10. [Pagos fallidos + auto-cancel tras 3](#10-pagos-fallidos--auto-cancel-tras-3)
11. [Re-suscripción tras cancelación](#11-re-suscripci%C3%B3n-tras-cancelaci%C3%B3n)
12. [Checklist de aceptación](#12-checklist-de-aceptaci%C3%B3n)
13. [Anexos](#13-anexos)

---

## 1. Pre-flight

### Terminal A — Stripe CLI

Deja corriendo (no cerrar durante las pruebas):

```bash
stripe listen \
  --forward-to localhost:8000/api/webhooks/stripe \
  --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
```

Anota el secreto que imprime:

```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Ese valor **debe** coincidir con `STRIPE_WEBHOOK_SECRET` en tu entorno. Si cambió, expórtalo y reinicia la app.

### Terminal B — App Spring Boot

```bash
mvn spring-boot:run
# o el comando que uses habitualmente
```

Verifica en logs:

- `Tomcat started on port 8000`.
- Ningún `MissingStripePriceException` al arrancar (confirma que `stripe.prices.*` están cargados).
- `StripeConfig.init()` ejecutó sin errores.

### Terminal C — Mongo shell / Compass

Para inspeccionar estado en las colecciones clave:

```bash
mongosh hanoit
```

### Sanity checks inmediatos

```bash
# 1) Webhook vivo (sin firma → 400 esperado, no 404/500)
curl -i -X POST http://localhost:8000/api/webhooks/stripe \
  -H 'Content-Type: application/json' -d '{}'
# → HTTP/1.1 400  Missing Stripe-Signature header

# 2) Billing requiere auth TENANT_ADMIN
curl -i http://localhost:8000/api/billing/subscription
# → 401 / 403
```

---

## 2. Preparar TENANT_ADMIN + JWT

Obtén un JWT de un user con rol `TENANT_ADMIN`. El tenant debe estar en plan `free` o `trial` para poder hacer el primer checkout.

```bash
# Login
export JWT=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@acme.test","password":"TuPassword123!"}' | jq -r .accessToken)

# Perfil → anota tenantId
curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8000/api/auth/me | jq
export TENANT_ID="<tenantId hex>"
```

---

## 3. Happy path

### 3.1 Crear Checkout Session

```bash
curl -s -X POST http://localhost:8000/api/billing/checkout \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "standard",
    "billingInterval": "monthly",
    "initialQuantity": 5,
    "successUrl": "https://example.com/success",
    "cancelUrl":  "https://example.com/cancel"
  }' | jq
```

Esperado: `201 Created` con `{checkoutUrl, sessionId}`.

### 3.2 Pagar la sesión

Abre `checkoutUrl` en el navegador y usa una tarjeta de prueba:

| Tarjeta | Uso |
|---|---|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0025 0000 3155` | Requiere 3DS (autenticación) |
| `4000 0000 0000 9995` | Fondos insuficientes |
| `4000 0000 0000 0341` | Éxito inicial, falla en renovación |

CVC: `123`, fecha: cualquier futura.

### 3.3 Verificar webhooks recibidos

En Terminal A deberías ver en orden:

```
checkout.session.completed    [evt_...]   200 OK
customer.subscription.created [evt_...]   200 OK   (no manejado, log debug)
customer.subscription.updated [evt_...]   200 OK
invoice.paid                  [evt_...]   200 OK
```

En logs de la app:

```
StripeWebhookService.process eventId=evt_... type=checkout.session.completed
SubscriptionSyncService.sync  tenantId=... status=active quantity=5 plan=standard
```

### 3.4 Estado esperado en Mongo

```js
// subscriptions
db.subscriptions.findOne({tenantId: ObjectId("<TENANT_ID>")})
/*
{
  tenantId: ObjectId("..."),
  stripeSubscriptionId: "sub_...",
  stripeCustomerId: "cus_...",
  plan: "standard",
  billingInterval: "monthly",
  status: "active",
  quantity: 5,
  unitAmount: <cents>,
  amount: unitAmount * 5,
  currency: "usd",
  consecutivePaymentFailures: 0,
  latestInvoiceId: "in_...",
  latestInvoicePdfUrl: "https://..."
}
*/

// tenants
db.tenants.findOne(
  {_id: ObjectId("<TENANT_ID>")},
  {plan:1, seatLimit:1, subscriptionStatus:1,
   stripeCustomerId:1, stripeSubscriptionId:1,
   trialPlan:1, trialStartedAt:1, trialEndsAt:1, trialSeatLimit:1})
/*
{
  plan: "standard",
  seatLimit: 5,                // mirror de subscription.quantity
  subscriptionStatus: "active",
  stripeCustomerId: "cus_...",
  stripeSubscriptionId: "sub_...",
  // Si el tenant venía de trial, estos 4 deben estar en null:
  trialPlan: null,
  trialStartedAt: null,
  trialEndsAt: null,
  trialSeatLimit: null
}
*/

// idempotencia
db.stripe_webhook_events.count()   // > 0

// audit trail
db.audit_logs.find({action: /^billing\./}).sort({createdAt:-1}).limit(5)
// → billing.subscription.create y, si aplica, billing.trial.converted
```

### 3.5 Verificar vía API

```bash
curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8000/api/billing/subscription | jq
# → {status:"active", plan:"standard", quantity:5, ...}

curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8000/api/billing/invoices | jq
# → [{id:"in_...", status:"paid", amountPaid:..., pdfUrl:"https://..."}]
```

---

## 4. `PUT /api/billing/seats`

### 4.1 Increase

```bash
curl -s -X PUT http://localhost:8000/api/billing/seats \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"op":"increase","quantity":3}' | jq
# → previousQuantity:5, newQuantity:8, totalAmount:unitPrice*8
```

Verifica:

- Llega `customer.subscription.updated` (Terminal A).
- `subscription.quantity = 8`, `tenant.seatLimit = 8`.
- `audit_logs`: `billing.seats.increase` con `{before:5, after:8}`.

### 4.2 Decrease bloqueado por `seatUsed`

Asume `tenant.seatUsed = 4` (admin + 3 invitados aceptados). Intenta bajar a 3:

```bash
curl -i -X PUT http://localhost:8000/api/billing/seats \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"op":"decrease","quantity":5}'
# → 422 SEAT_DECREASE_BLOCKED
#   details: {seatUsed:4, requested:3}
```

### 4.3 Decrease válido

```bash
curl -s -X PUT http://localhost:8000/api/billing/seats \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"op":"decrease","quantity":2}' | jq
# 8-2=6 ≥ seatUsed → OK, webhook updated, seatLimit:6
```

---

## 5. `POST /api/billing/upgrade`

### 5.1 Upgrade plan + interval

```bash
curl -s -X POST http://localhost:8000/api/billing/upgrade \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"plan":"premium","billingInterval":"annual"}' | jq
```

Verifica:

- Llega `customer.subscription.updated`.
- `subscription.plan = "premium"`, `billingInterval = "annual"`.
- `tenant.plan = "premium"`, `tenant.config` con defaults de premium.
- `subscription.quantity` se mantiene (upgrade **no** toca seats).
- `audit_logs`: `billing.subscription.update` con `before/after`.
- Email Brevo `sendPlanChangeEmail` disparado (ver logs).

### 5.2 Guards

```bash
# Enterprise → 422 ENTERPRISE_PLAN_SELF_SERVICE
curl -i -X POST http://localhost:8000/api/billing/upgrade \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"plan":"enterprise","billingInterval":"monthly"}'

# Sin suscripción activa → 404 SUBSCRIPTION_NOT_FOUND
```

---

## 6. `POST /api/billing/portal`

```bash
curl -s -X POST http://localhost:8000/api/billing/portal \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"returnUrl":"https://example.com/billing"}' | jq
# → {portalUrl: "https://billing.stripe.com/p/session/..."}
```

Abre la URL — debe cargar el Customer Portal de Stripe con métodos de pago, facturas e historial del tenant.

---

## 7. `POST /api/billing/cancel` + downgrade

### 7.1 Programar cancelación al fin de período

```bash
curl -s -X POST http://localhost:8000/api/billing/cancel \
  -H "Authorization: Bearer $JWT" | jq
# → {cancelAtPeriodEnd: true, currentPeriodEnd: "2026-05-21T...", message: "..."}
```

- `subscription.cancelAtPeriodEnd = true`.
- `audit_logs`: `billing.subscription.cancel`.
- **Tenant sigue activo** hasta que Stripe dispare `customer.subscription.deleted`.

### 7.2 Forzar `customer.subscription.deleted` sin esperar

Útil para validar el flujo de downgrade en la prueba:

```bash
SUB_ID=$(curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8000/api/billing/subscription | jq -r .stripeSubscriptionId)

stripe subscriptions cancel $SUB_ID
```

En Terminal A llega `customer.subscription.deleted → 200 OK`.

### 7.3 Estado esperado tras el downgrade

```js
db.tenants.findOne({_id: ObjectId("<TENANT_ID>")},
  {plan:1, seatLimit:1, subscriptionStatus:1,
   stripeSubscriptionId:1, stripeCustomerId:1, canceledAt:1})
/*
{
  plan: "free",
  seatLimit: 2,                      // 2 fijos en FREE
  subscriptionStatus: "free",
  stripeSubscriptionId: null,        // limpiado
  stripeCustomerId: "cus_...",       // CONSERVADO (Customer es reusable)
  canceledAt: ISODate("...")
}
*/

db.subscriptions.findOne({tenantId: ObjectId("<TENANT_ID>")})
// → null  (BORRADO: libera el unique index para re-suscripción)

db.routing_users.find({tenantId: ObjectId("<TENANT_ID>"), isActive:false})
// → users no-admin excedentes desactivados por enforceDowngrade(tenantId, 2)

db.refresh_tokens.find({username: "<email_user_desactivado>"})
// → tokens revocados (no deben existir activos)

db.audit_logs.find({
  tenantId: ObjectId("<TENANT_ID>"),
  action: "billing.subscription.cancel"
}).sort({createdAt:-1}).limit(1)
// → changes: {plan:"free", seatLimit:2, previousStripeSubscriptionId:"sub_..."}
```

Email Brevo `sendSubscriptionCanceledEmail` disparado al `billingEmail` del tenant.

---

## 8. Idempotencia de webhooks

Captura un `event.id` cualquiera del Terminal A y reenvíalo:

```bash
stripe events resend evt_abc123
```

Logs esperados:

```
StripeWebhookService.process duplicate eventId=evt_abc123 type=... ignored
```

La colección `stripe_webhook_events` no crece (el `_id` ya existía). Ningún efecto secundario en `subscriptions` ni `tenants`.

---

## 9. Firma inválida

```bash
curl -i -X POST http://localhost:8000/api/webhooks/stripe \
  -H 'Stripe-Signature: t=1,v1=invalid' \
  -H 'Content-Type: application/json' \
  -d '{"id":"evt_fake","type":"invoice.paid","data":{}}'
# → HTTP/1.1 400  Invalid signature
```

No se persiste nada. No hay efectos secundarios.

---

## 10. Pagos fallidos + auto-cancel tras 3

### Opción A — Realista con tarjeta

En `POST /api/billing/checkout` usa `4000 0000 0000 0341` (éxito inicial, falla al renovar). Cuando Stripe intenta renovar, llegan `invoice.payment_failed` eventos.

### Opción B — Rápida con CLI (solo valida el handler, no la lógica de reintento)

```bash
for i in 1 2 3; do
  stripe trigger invoice.payment_failed
  sleep 2
done
```

> Nota: `stripe trigger invoice.payment_failed` crea un invoice/customer sintético que **no** tiene tu `metadata.tenantId`. Para validar realmente el auto-cancel, necesitas un `Subscription` real del tenant. La ruta realista es Opción A.

### Estado esperado tras el 3er fallo consecutivo

- `subscription.consecutivePaymentFailures` pasó por 1 → 2 → 3.
- `tenant.subscriptionStatus = "past_due"` en cada fallo.
- Logs: `handleInvoicePaymentFailed: 3rd consecutive failure for tenantId=..., canceling immediately`.
- Llega `customer.subscription.deleted` → dispara el flujo del §7.3 (downgrade a FREE, borrado del doc, `enforceDowngrade(2)`, email de cancelación).
- `audit_logs` con `billing.payment.failed` (3 entradas) y `billing.subscription.cancel` (1 entrada).

---

## 11. Re-suscripción tras cancelación

Después del downgrade del §7.3, repite el §3 (`POST /api/billing/checkout`).

Debe funcionar sin `DuplicateKeyException` porque:

- El `Subscription` doc anterior fue borrado → unique index libre.
- `stripeCustomerId` se reusa (`createOrRetrieveCustomer` detecta que ya existe en `tenant.stripeCustomerId`).
- Un nuevo `Subscription` doc se crea con `consecutivePaymentFailures = 0`.

---

## 12. Checklist de aceptación

| # | Criterio | Cómo verificar |
|---|---|---|
| 1 | Webhook recibe firma válida → 200 | Terminal A muestra `200 OK` por evento |
| 2 | Cada `event.id` se procesa una sola vez | `db.stripe_webhook_events.count()` = nº eventos únicos |
| 3 | Invariante `subscription.quantity == tenant.seatLimit` | Tras checkout, seats, upgrade, webhook update |
| 4 | Invariante `subscription.amount == unitAmount * quantity` | Validar matemática en Mongo |
| 5 | Trial → paid limpia los 4 campos trial | `tenant.trialPlan/StartedAt/EndsAt/SeatLimit = null` |
| 6 | Cancel webhook: borra doc, limpia `stripeSubscriptionId`, conserva `stripeCustomerId`, downgrade a FREE con `seatLimit=2` | §7.3 |
| 7 | `enforceDowngrade(2)` desactiva users excedentes y revoca refresh tokens | `isActive:false` + `refresh_tokens` purgados |
| 8 | 3 fallos consecutivos → `cancelImmediately` → downgrade | Logs + `consecutivePaymentFailures` + `billing.subscription.cancel` |
| 9 | Cada operación deja un `audit_log` con `tenantId` correcto | `db.audit_logs.find({action:/^billing\./})` |
| 10 | Re-suscripción tras cancel funciona | Repetir §3 tras §7.3 sin error |
| 11 | Guards de validación | `initialQuantity<1` → 422, `initialQuantity<seatUsed` → 422, sub activa → 409, enterprise → 422, decrease<seatUsed → 422 |
| 12 | `/api/billing/**` requiere `TENANT_ADMIN` | 401 sin JWT, 403 con JWT de otro rol |
| 13 | `/api/webhooks/stripe` es público | 400 sin firma (no 401/403) |

---

## 13. Anexos

### 13.1 Tarjetas de prueba Stripe

| Número | Resultado |
|---|---|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0025 0000 3155` | Requiere 3DS |
| `4000 0000 0000 9995` | Fondos insuficientes |
| `4000 0000 0000 0341` | Éxito inicial, falla en renovación |
| `4000 0000 0000 0002` | Declinada genérica |

Más: [stripe.com/docs/testing](https://stripe.com/docs/testing).

### 13.2 Mapa de endpoints

| Método | Path | Rol | Request DTO | Response DTO |
|---|---|---|---|---|
| GET | `/api/billing/subscription` | TENANT_ADMIN | — | `SubscriptionResponse` |
| POST | `/api/billing/checkout` | TENANT_ADMIN | `CheckoutRequest` | `CheckoutResponse` |
| POST | `/api/billing/portal` | TENANT_ADMIN | `PortalRequest` | `PortalResponse` |
| POST | `/api/billing/upgrade` | TENANT_ADMIN | `UpgradeRequest` | `UpgradeResponse` |
| PUT | `/api/billing/seats` | TENANT_ADMIN | `SeatChangeRequest` | `SeatChangeResponse` |
| POST | `/api/billing/cancel` | TENANT_ADMIN | — | `CancelSubscriptionResponse` |
| GET | `/api/billing/invoices` | TENANT_ADMIN | — | `List<InvoiceResponse>` |
| POST | `/api/webhooks/stripe` | público (firma) | raw `byte[]` | `200 ok` / `400` |

### 13.3 Códigos de error (RoutingExceptionHandler)

| Código | HTTP | Cuándo |
|---|---|---|
| `SEAT_QUANTITY_INVALID` | 422 | `initialQuantity < 1` o `< tenant.seatUsed` |
| `SEAT_DECREASE_BLOCKED` | 422 | `newQuantity < 1` o `< tenant.seatUsed` (details: `{seatUsed, requested}`) |
| `ENTERPRISE_PLAN_SELF_SERVICE` | 422 | `plan=enterprise` en checkout/upgrade |
| `ACTIVE_SUBSCRIPTION_CONFLICT` | 409 | Checkout cuando ya hay sub en `active|past_due|trialing` |
| `SUBSCRIPTION_NOT_FOUND` | 404 | Operación que requiere sub activa y no existe |
| `STRIPE_INTEGRATION_ERROR` | 502 | `StripeException` envuelto (mensaje genérico al cliente) |
| `MISSING_STRIPE_PRICE` | 500 | `stripe.prices[plan][interval]` no configurado |

### 13.4 Eventos Stripe manejados

| Evento | Handler | Efecto principal |
|---|---|---|
| `checkout.session.completed` | `handleCheckoutCompleted` | Crea/actualiza Subscription + mirror tenant. Trial→paid emite `billing.trial.converted` y limpia campos trial |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Sync `status`, `quantity`, `plan`, `billingInterval`, períodos, `cancelAtPeriodEnd` |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Downgrade FREE+2 seats, borra doc local, limpia `stripeSubscriptionId`, `enforceDowngrade(tenantId, 2)` |
| `invoice.paid` | `handleInvoicePaid` | Actualiza `latestInvoice*`, resetea `consecutivePaymentFailures=0` |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | `status=past_due`, `consecutivePaymentFailures++`, email; al 3º → `cancelImmediately` |

### 13.5 Colecciones MongoDB tocadas

- `subscriptions` — mirror local de Stripe Subscription, 1:1 con tenant (unique index en `tenantId` + `stripeSubscriptionId`).
- `stripe_webhook_events` — idempotencia webhook, TTL 30 días.
- `tenants` — campos `plan`, `seatLimit`, `seatUsed`, `subscriptionStatus`, `stripeCustomerId`, `stripeSubscriptionId`, `canceledAt`, `trial*`.
- `routing_users` — `isActive=false` tras `enforceDowngrade`.
- `refresh_tokens` — revocados tras desactivación por downgrade.
- `audit_logs` — todos los cambios de billing auditados con `tenantId` explícito.

### 13.6 Comandos útiles de debug

```bash
# Tail de eventos del CLI (JSON completo)
stripe listen --print-json | jq

# Listar suscripciones de un customer
stripe subscriptions list --customer cus_XXX

# Inspeccionar un evento específico
stripe events retrieve evt_XXX

# Reenvío manual de un evento (para idempotencia)
stripe events resend evt_XXX

# Logs filtrados por componente
tail -f logs/app.log | grep -E "StripeWebhookService|SubscriptionSyncService|BillingServiceImpl|SeatEnforcement"

# Estado rápido en Mongo
mongosh hanoit --eval '
  print("=== tenant ===");
  printjson(db.tenants.findOne({_id: ObjectId("TENANT_ID")},
    {plan:1, seatLimit:1, seatUsed:1, subscriptionStatus:1,
     stripeCustomerId:1, stripeSubscriptionId:1, trialPlan:1}));
  print("=== subscription ===");
  printjson(db.subscriptions.findOne({tenantId: ObjectId("TENANT_ID")}));
  print("=== audit_logs billing.* ===");
  db.audit_logs.find({tenantId: ObjectId("TENANT_ID"), action:/^billing\./})
    .sort({createdAt:-1}).limit(5).forEach(printjson);
'
```

### 13.7 Referencias

- Spec: `specs/fase4/TASK_F4_07_STRIPE_INTEGRATION.md`
- Master spec: `specs/fase4/PROMPT_MIGRACION_FASE4.md`
- ER diagram: `docs/data/DATABASE_ER_DIAGRAM.md`
- Reglas del proyecto: `.cursorrules` (sección Stripe)
- Stripe testing: https://stripe.com/docs/testing
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Customer Portal: https://stripe.com/docs/customer-management

---

**Última actualización**: 2026-04-21 · F4-07 v2.0 (per-seat con tiers)
