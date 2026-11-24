# EMP-002: Invitaciones de usuarios (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f6-empresa` |
| Clave anterior | F6-02 · `INVITATIONS` |
| Depende de | EMP-001, ACC-002 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-invitations` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `POST /invitations`, `GET /invitations`, `DELETE /invitations/{id}`, `POST /invitations/{token}/resend`, `GET /invitations/accept/{token}`, `POST /invitations/accept/{token}` |
| Maqueta | `docs/ui/maquetas/index.html#emp-002` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Invitar personas por correo y permitirles aceptar creando su cuenta en una pantalla pública.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe | `—` | Nuevo |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/invitations` | `{email,role(agent\|driver),metadata{firstName,lastName,phone}}` | 201 `InviteResponse{id,email,role,status,expiresAt(7 días),invitedBy,createdAt}` | 409 EMAIL_ALREADY_EXISTS/SEAT_LIMIT_EXCEEDED, 429 (20/h) | `post__invitations.json` |
| GET | `/api/v1/invitations` | `?status=pending\|accepted\|expired\|revoked` | Lista | 403 | `get__invitations.json` |
| DELETE | `/api/v1/invitations/{id}` | — | 204 | 404 | `delete__invitations__id.json` |
| POST | `/api/v1/invitations/{token}/resend` | — | 200 | 410 | `post__invitations__token__resend.json` |
| GET | `/api/v1/invitations/accept/{token}` | — | `{email,role,tenantName,inviterName,expiresAt}` | 410 INVITATION_TOKEN_GONE | `get__invitations__accept__token.json` |
| POST | `/api/v1/invitations/accept/{token}` | `{firstName*,lastName*,password*,phone,identifierType,identifierValue}` | `LoginResponse` (sesión iniciada) | 400 política, 409 SEAT_LIMIT_EXCEEDED, 410 | `post__invitations__accept__token.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como administrador de la empresa, quiero invitar personas por correo, para que se den de alta ellas mismas con el rol correcto.

## 3. Alcance

**Incluye**

- Enviar invitación (correo, rol), listar pendientes, revocar, reenviar, página pública de aceptación con vista previa (empresa, rol, correo) y alta de contraseña.

**Excluye (no tocar)**

- —
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/js/modules/config.js`
- `master/js/modules/services/invitations.api.js`
- `server/sidebar-menu.json`
- `tests/api/invitations.api.test.mjs`
- `tests/e2e/invitations.e2e.mjs`
- `tests/integration/invitations/**`
- `tests/unit/invitations/**`
- `specs/migracion-api-v1/f6-empresa/evidencia/EMP-002/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Enviar invitación con rol
- **RF-2** — Listar invitaciones pendientes
- **RF-3** — Revocar una invitación
- **RF-4** — Reenviar el correo
- **RF-5** — Mostrar vista previa pública del token
- **RF-6** — Aceptar la invitación creando la cuenta y entrar

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado correo y rol, Entonces `POST /invitations`; 409 y 429 con mensajes propios
- **CA-2** (RF-2) — Dado el listado, Entonces `GET /invitations?status=pending`
- **CA-3** (RF-3) — Dado revocar, Entonces confirmación y `DELETE /invitations/{id}`
- **CA-4** (RF-4) — Dado reenviar, Entonces `POST /invitations/{token}/resend`
- **CA-5** (RF-5) — Dado `#/access/invitation?token=t`, Entonces vista previa con empresa y rol; 410 → «Invitación caducada o ya usada»
- **CA-6** (RF-6) — Dado datos válidos, Entonces `POST /invitations/accept/{token}` y entra con la sesión del `LoginResponse`; 409 → «La empresa no tiene cupo, contacta con su administrador»
- **CA-7** (RF-1) — Dado el formulario de invitación, Entonces el rol solo ofrece `agent` y `driver`, y se muestran asientos usados/límite antes de enviar
- **CA-8** (RF-6) — Dado `POST /invitations/accept/{token}` → **201** `LoginResponse` (`message`, `accessToken`, `refreshToken`, `expiresIn`, `user`), Entonces se guardan los dos tokens con el mismo servicio de sesión que ACC-001 y se entra al tablero sin pasar por login; si por defecto del backend faltara `accessToken`, se va a `access.login` con el correo precargado (defensivo, no es el contrato)

## 6. Diseño y restricciones técnicas

Crear `invitations.api.js`, controladores y vistas.

**Pantallas y flujos.** Usuarios → Invitar. Correo → aceptar → cuenta. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.invitations (nuevo)` | `pages/users/invitations.jade` | tenant_admin | Nuevo |
| `access.invitation (nuevo)` | `pages/access/invitation.jade` | tenant_admin | Nuevo |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[EMP-002 CA-1]` en `tests/unit/invitations/` |
| T-2 | CA-1 | contrato | Prueba `[EMP-002 CA-1]` en `tests/integration/invitations/` |
| T-3 | CA-1 | e2e | Prueba `[EMP-002 CA-1]` en `tests/e2e/invitations.e2e.mjs` |
| T-4 | CA-2 | unitaria | Prueba `[EMP-002 CA-2]` en `tests/unit/invitations/` |
| T-5 | CA-2 | contrato | Prueba `[EMP-002 CA-2]` en `tests/integration/invitations/` |
| T-6 | CA-3 | unitaria | Prueba `[EMP-002 CA-3]` en `tests/unit/invitations/` |
| T-7 | CA-3 | e2e | Prueba `[EMP-002 CA-3]` en `tests/e2e/invitations.e2e.mjs` |
| T-8 | CA-4 | unitaria | Prueba `[EMP-002 CA-4]` en `tests/unit/invitations/` |
| T-9 | CA-5 | unitaria | Prueba `[EMP-002 CA-5]` en `tests/unit/invitations/` |
| T-10 | CA-5 | e2e | Prueba `[EMP-002 CA-5]` en `tests/e2e/invitations.e2e.mjs` |
| T-11 | CA-6 | unitaria | Prueba `[EMP-002 CA-6]` en `tests/unit/invitations/` |
| T-12 | CA-6 | contrato | Prueba `[EMP-002 CA-6]` en `tests/integration/invitations/` |
| T-13 | CA-6 | e2e | Prueba `[EMP-002 CA-6]` en `tests/e2e/invitations.e2e.mjs` |
| T-14 | CA-7 | unitaria | Prueba `[EMP-002 CA-7]` en `tests/unit/invitations/` |
| T-15 | CA-8 | unitaria | Prueba `[EMP-002 CA-8]` en `tests/unit/invitations/` |
| T-16 | CA-8 | sonda API | Prueba `[EMP-002 CA-8]` en `tests/api/invitations.api.test.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: EMP-001, ACC-002.
- Riesgos: correos de verificación, restablecer e invitación comprobados en el entorno de desarrollo (B1, 2026-11-23; remitente `info@routengio.com`): la prueba en vivo usa la cuenta `sdd-test`. La plantilla de invitación es la id 6 y solo recibe `invitation_token`: su URL debe apuntar a `/invitations/accept?token=` (server.js la redirige) o a `#/access/invitation?token=`.
- Pregunta no bloqueante: URL del enlace de invitación → Decisión propuesta: La SPA expone `#/access/invitation?token=`; configurar la plantilla en el backend

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/EMP-002/...` |
| CA-2 | | | `evidencia/EMP-002/...` |
| CA-3 | | | `evidencia/EMP-002/...` |
| CA-4 | | | `evidencia/EMP-002/...` |
| CA-5 | | | `evidencia/EMP-002/...` |
| CA-6 | | | `evidencia/EMP-002/...` |
| CA-7 | | | `evidencia/EMP-002/...` |
| CA-8 | | | `evidencia/EMP-002/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §5); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
| 2026-11-23 | B1 comprobado: se retira la dispensa de prueba en vivo de los correos | BACKEND_PENDIENTES B1 | pendiente |
| 2026-11-24 | Respuesta de aceptar invitación: tolerar cuerpo sin tokens (G20) | Colección Postman del backend (2026-11-24) | pendiente |
| 2026-11-24 | G20 cerrada: aceptar invitación responde 201 `LoginResponse` y deja la sesión iniciada | migration-guide 2026-11-24 (G19–G23 cerradas) | pendiente |
