# EMP-004: Suscripción, plan, asientos y facturas (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f6-empresa` |
| Clave anterior | F6-04 · `BILLING` |
| Depende de | EMP-003 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-billing` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `POST /billing/upgrade`, `PUT /billing/seats`, `POST /billing/cancel`, `GET /billing/invoices`, `GET /billing/usage` |
| Maqueta | `docs/ui/maquetas/index.html#emp-004` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Autogestión de la suscripción con Stripe: estado, uso, contratar, portal, cambiar plan/intervalo, asientos, cancelar y facturas.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | Tipos de usuario BASIC/PREMIER/ENTERPRISE fijos en el front | `constant.js `user.type`` | Se retira: plan de `billing` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/billing/subscription` | — | `SubscriptionResponse` (plan, billingInterval, status, quantity, amount en céntimos, currentPeriodEnd, cancelAtPeriodEnd, latestInvoicePdfUrl…) | 404 sin suscripción (trial/free) | `get__billing__subscription.json` |
| POST | `/api/v1/billing/checkout` | `{plan(basic\|standard\|premium),billingInterval(monthly\|annual),initialQuantity≥1,successUrl,cancelUrl}` (URLs absolutas) | 201 `{checkoutUrl,sessionId}` | 422 ENTERPRISE_PLAN_SELF_SERVICE, 502 | — |
| POST | `/api/v1/billing/portal` | `{returnUrl}` | `{portalUrl}` | 502 | — |
| POST | `/api/v1/billing/upgrade` | `{plan,billingInterval}` | Plan nuevo, mismos asientos | 422, 502 | — |
| PUT | `/api/v1/billing/seats` | `{op:'increase'\|'decrease',quantity}` (`quantity` es delta) | 200 `{subscription:{previousQuantity,newQuantity,billingInterval},tenant:{seatLimit,seatUsed}}` | 422 SEAT_DECREASE_BLOCKED/ENTERPRISE_PLAN_SELF_SERVICE | — |
| POST | `/api/v1/billing/cancel` | — | `{cancelAtPeriodEnd,currentPeriodEnd,message}` | 502 | — |
| GET | `/api/v1/billing/invoices` | — | `[{id,number,status,amountPaid,currency,created,pdfUrl}]` | 502 | `get__billing__invoices.json` |
| GET | `/api/v1/billing/usage` | — | `{plan,seats{…,usagePercent},limits{deposits,drivers,routesMonthly{…,resetsAt},admins,addressesPerFile},subscription,trial}` | — | `get__billing__usage.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero gestionar plan, asientos, pagos y facturas, para pagar solo lo que uso.

## 3. Alcance

**Incluye**

- Panel de suscripción (o «sin suscripción» en 404), uso y cuotas con %, botones a Checkout/Portal (redirección), cambio de plan e intervalo, ajuste de asientos, cancelación al fin de periodo, listado de facturas con enlace.

**Excluye (no tocar)**

- Webhook de Stripe.
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/custom/billing/**`
- `master/js/custom/config/constant.js`
- `master/js/modules/config.js`
- `master/js/modules/services/billing.api.js`
- `server/sidebar-menu.json`
- `tests/api/billing.api.test.mjs`
- `tests/e2e/billing.e2e.mjs`
- `tests/integration/billing/**`
- `tests/unit/billing/**`
- `specs/migracion-api-v1/f6-empresa/evidencia/EMP-004/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Ver suscripción o estado «sin suscripción»
- **RF-2** — Ver uso y cuotas del mes (rutas, asientos, prueba)
- **RF-3** — Contratar plan vía Checkout
- **RF-4** — Abrir el portal de cliente
- **RF-5** — Cambiar plan o intervalo
- **RF-6** — Ajustar asientos
- **RF-7** — Programar cancelación
- **RF-8** — Ver facturas
- **RF-9** — Volver de Stripe (`#/app/billing/success` y `/cancel`) y refrescar suscripción y empresa tolerando el retraso del webhook
- **RF-10** — Mostrar un aviso de pago fallido con acceso al portal cuando `subscriptionStatus = past_due`
- **RF-11** — Mostrar el estado de prueba (`trialing`) y los importes tal como los devuelve Stripe

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado 404, Entonces «No tienes suscripción» y botón Contratar
- **CA-2** (RF-2) — Dado el fixture de uso, Entonces barras con % de rutas y asientos
- **CA-3** (RF-3) — Dado Contratar, Entonces `POST /billing/checkout` → 201 y redirección a `checkoutUrl`; 422 enterprise → «Contacta con ventas»
- **CA-4** (RF-4) — Dado Portal, Entonces `POST /billing/portal` y redirección
- **CA-5** (RF-5) — Dado cambio a anual, Entonces confirmación y `POST /billing/upgrade`
- **CA-6** (RF-6) — Dado 5 asientos comprados y 4 usados, Entonces el control no permite bajar más de 1 (`op:'decrease'`); si llega 422 `SEAT_DECREASE_BLOCKED`, Entonces se explica
- **CA-7** (RF-7) — Dado Cancelar, Entonces confirmación con fecha de fin y `POST /billing/cancel`
- **CA-8** (RF-8) — Dado facturas, Entonces tabla fecha/importe/estado/enlace
- **CA-9** (RF-1) — Dado 502 `STRIPE_INTEGRATION_ERROR`, Entonces «Facturación no disponible»
- **CA-10** (RF-9) — Dado la vuelta por `successUrl`, Cuando `GET /billing/subscription` da 404, Entonces «Confirmando el pago…» y reintenta (3 veces, 3 s) antes de avisar; no se muestra como fallo
- **CA-11** (RF-10) — Dado `past_due`, Entonces franja de pago fallido con botón al portal y la operación no se bloquea en el cliente
- **CA-12** (RF-11) — Dado una suscripción `trialing` (premium mensual, quantity 5), Entonces la insignia «Prueba» con la fecha de fin y el importe de `amount`/`currency` sin recalcular descuentos anuales en el cliente
- **CA-13** (RF-6) — Dado 10 asientos y «Añadir 3», Entonces se envía `PUT /billing/seats {op:"increase",quantity:3}` (delta, no el cupo final) y con el 200 la pantalla muestra `subscription.newQuantity` 13 y `tenant.seatLimit`/`seatUsed` de la respuesta (no los calcula), y refresca `GET /billing/usage`

## 6. Diseño y restricciones técnicas

Crear `billing.api.js`, `custom/billing/*`.

**Pantallas y flujos.** Empresa → Facturación. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.billing (nuevo)` | `pages/billing/billing.jade` | tenant_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[EMP-004 CA-1]` en `tests/unit/billing/` |
| T-2 | CA-1 | contrato | Prueba `[EMP-004 CA-1]` en `tests/integration/billing/` |
| T-3 | CA-2 | unitaria | Prueba `[EMP-004 CA-2]` en `tests/unit/billing/` |
| T-4 | CA-2 | contrato | Prueba `[EMP-004 CA-2]` en `tests/integration/billing/` |
| T-5 | CA-3 | unitaria | Prueba `[EMP-004 CA-3]` en `tests/unit/billing/` |
| T-6 | CA-3 | e2e | Prueba `[EMP-004 CA-3]` en `tests/e2e/billing.e2e.mjs` |
| T-7 | CA-4 | unitaria | Prueba `[EMP-004 CA-4]` en `tests/unit/billing/` |
| T-8 | CA-5 | unitaria | Prueba `[EMP-004 CA-5]` en `tests/unit/billing/` |
| T-9 | CA-6 | unitaria | Prueba `[EMP-004 CA-6]` en `tests/unit/billing/` |
| T-10 | CA-7 | unitaria | Prueba `[EMP-004 CA-7]` en `tests/unit/billing/` |
| T-11 | CA-7 | e2e | Prueba `[EMP-004 CA-7]` en `tests/e2e/billing.e2e.mjs` |
| T-12 | CA-8 | unitaria | Prueba `[EMP-004 CA-8]` en `tests/unit/billing/` |
| T-13 | CA-8 | contrato | Prueba `[EMP-004 CA-8]` en `tests/integration/billing/` |
| T-14 | CA-9 | unitaria | Prueba `[EMP-004 CA-9]` en `tests/unit/billing/` |
| T-15 | CA-10 | unitaria | Prueba `[EMP-004 CA-10]` en `tests/unit/billing/` |
| T-16 | CA-10 | e2e | Prueba `[EMP-004 CA-10]` en `tests/e2e/billing.e2e.mjs` |
| T-17 | CA-11 | unitaria | Prueba `[EMP-004 CA-11]` en `tests/unit/billing/` |
| T-18 | CA-12 | unitaria | Prueba `[EMP-004 CA-12]` en `tests/unit/billing/` |
| T-19 | CA-12 | sonda API | Prueba `[EMP-004 CA-12]` en `tests/api/billing.api.test.mjs` |
| T-20 | CA-13 | unitaria | Prueba `[EMP-004 CA-13]` en `tests/unit/billing/` |
| T-21 | CA-13 | contrato | Prueba `[EMP-004 CA-13]` en `tests/integration/billing/` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: EMP-003.
- Riesgos: Pruebas live contra Stripe test mode solamente (D13 comprobado 2026-11-23: checkout premium mensual → `trialing`). Los precios anuales del sandbox no coinciden con el descuento del spec del backend: no mostrar porcentajes de ahorro calculados en el cliente. El webhook es del backend (fuera de alcance).
- Pregunta no bloqueante: Planes e intervalos → Decisión propuesta: Resuelta (§6): basic/standard/premium; enterprise no es autoservicio

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/EMP-004/...` |
| CA-2 | | | `evidencia/EMP-004/...` |
| CA-3 | | | `evidencia/EMP-004/...` |
| CA-4 | | | `evidencia/EMP-004/...` |
| CA-5 | | | `evidencia/EMP-004/...` |
| CA-6 | | | `evidencia/EMP-004/...` |
| CA-7 | | | `evidencia/EMP-004/...` |
| CA-8 | | | `evidencia/EMP-004/...` |
| CA-9 | | | `evidencia/EMP-004/...` |
| CA-10 | | | `evidencia/EMP-004/...` |
| CA-11 | | | `evidencia/EMP-004/...` |
| CA-12 | | | `evidencia/EMP-004/...` |
| CA-13 | | | `evidencia/EMP-004/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §6); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | D13 comprobado: sondas de checkout en Stripe test mode; estado `trialing`; importes solo desde Stripe | BACKEND_PENDIENTES D13 | pendiente |
| 2026-11-24 | Forma real de la respuesta de asientos; checkout 200/201 | Colección Postman del backend (2026-11-24) | pendiente |
| 2026-11-24 | G22 cerrada: checkout 201 `checkoutUrl`; seats con `quantity` delta | migration-guide 2026-11-24 (G19–G23 cerradas) | pendiente |
