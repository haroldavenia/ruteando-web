# ACC-004: Mi perfil y cambio de contraseña (nuevo)

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `migracion-api-v1` / `f1-acceso` |
| Clave anterior | F1-04 · `AUTH-PROFILE` |
| Depende de | ACC-001 |
| Issue | #<n> (pendiente) |
| Rama | `feat/<n>-auth-profile` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | `master/js`, `master/jade`, `server/` |
| Endpoints `/api/v1` | `GET /auth/me`, `PUT /auth/me`, `PUT /auth/change-password` |
| Maqueta | `docs/ui/maquetas/index.html#acc-004` |
| ADR relacionados | ADR-0002, ADR-0004, ADR-0006 |
| Responsable | Ingeniería de Software |
| Autor / Fecha | Arnés (Claude) / 2026-11-20 |

## 1. Objetivo y contexto

Nueva pantalla para ver y editar el perfil propio y cambiar la contraseña.

### Comportamiento actual (inventario legacy)

| # | Comportamiento actual | Fichero | Destino |
| --- | --- | --- | --- |
| L1 | No existe pantalla de perfil; la cabecera muestra datos fijos | `offsidebar_controller.js` | Cambia: nueva pantalla y cabecera con `auth/me` |

### Contrato `/api/v1`

| Método | Ruta | Request | Response | Errores | Fixture |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/auth/me` | — | `UserProfileResponse` (mismo `user` del login) | 401 | `get__auth__me.json` |
| PUT | `/api/v1/auth/me` | `{firstName?,lastName?,phone?}` (solo lo enviado; phone E.164) | `UserProfileResponse` | 400 VALIDATION_ERROR | `put__auth__me.json` |
| PUT | `/api/v1/auth/change-password` | `{currentPassword,newPassword}` | 200 `{message}`; invalida los refresh tokens | 400 VALIDATION_ERROR/PASSWORD_POLICY_VIOLATION, 401 | `put__auth__change-password.json` |

Reglas transversales: `docs/contracts/api-v1-catalog.md` · fuente canónica: `docs/contracts/source/migration-guide.md`.

## 2. Historia de usuario

Como usuario del panel, quiero ver y editar mi perfil y cambiar mi contraseña, para mantener mis datos al día.

## 3. Alcance

**Incluye**

- Estado `app.profile`, acceso desde el menú de usuario, datos de `auth/me` en la cabecera.

**Excluye (no tocar)**

- Preferencias de notificación (EMP-005).
- App móvil del conductor (`/api/v1/driver/*`).

**Archivos autorizados** (lista inicial; el orquestador la confirma antes de `Lista` y registra cambios en la sección 11)

- `app/i18n/en.json`
- `app/i18n/es.json`
- `app/i18n/es_AR.json`
- `master/jade/views/pages/profile/profile.jade/**`
- `master/js/custom/profile/profile_controller.js/**`
- `master/js/modules/config.js`
- `master/js/modules/services/config.js`
- `master/js/modules/services/current_user.js`
- `server/sidebar-menu.json`
- `tests/api/auth-profile.api.test.mjs`
- `tests/e2e/auth-profile.e2e.mjs`
- `tests/integration/auth-profile/**`
- `tests/unit/auth-profile/**`
- `specs/migracion-api-v1/f1-acceso/evidencia/ACC-004/**`

## 4. Requisitos

**Funcionales**

- **RF-1** — Cargar el usuario actual al iniciar sesión y exponerlo como `CurrentUser`
- **RF-2** — Editar nombre, apellido y teléfono propios
- **RF-3** — Cambiar la contraseña con la actual, la nueva y su repetición
- **RF-4** — Mostrar nombre y rol en la cabecera/menú de usuario

**No funcionales**

- **RNF-1** (i18n) — Todo texto nuevo pasa por `angular-translate` con claves en `es`, `en` y `es_AR`.
- **RNF-2** (seguridad) — Los datos del backend se pintan como texto (`ng-bind`); sin `ng-bind-html` con datos del servidor; sin secretos en el cliente.
- **RNF-3** (accesibilidad) — Controles con etiqueta, foco visible y estados comunicados con texto, no solo con color.

## 5. Criterios de aceptación

- **CA-1** (RF-1) — Dado login correcto, Entonces `CurrentUser` sale del `user` del login; Dado recarga de página, Cuando arranca el shell, Entonces `GET /auth/me` y `CurrentUser.role` coincide con el fixture
- **CA-2** (RF-2) — Dado el perfil, Cuando cambio el teléfono y guardo, Entonces `PUT /auth/me` y aviso de éxito
- **CA-3** (RF-3) — Dado contraseña actual incorrecta (400/401), Entonces error en «Contraseña actual»; con éxito, aviso «Contraseña cambiada, vuelve a iniciar sesión», limpieza de sesión y login (el servidor invalidó el refresh)
- **CA-4** (RF-4) — Dado sesión, Cuando abro el menú de usuario, Entonces veo nombre completo y rol traducido

## 6. Diseño y restricciones técnicas

Crear `custom/profile/profile_controller.js`, `pages/profile/profile.jade`, `modules/services/current_user.js`. Modificar `offsidebar`/cabecera, `config.js`, `server/sidebar-menu.json`.

**Pantallas y flujos.** Menú usuario → Mi perfil → editar datos / cambiar contraseña. Todo listado o acción implementa los estados cargando, vacío, error con «Reintentar» y éxito con aviso (`docs/ui/sistema-ui.md`).

| Estado ui-router | Vista | Roles | Cambio |
| --- | --- | --- | --- |
| `app.profile (nuevo)` | `pages/profile/profile.jade` | todos los roles web | Pantalla nueva |

## 7. Casos de prueba esperados

| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | unitaria | Prueba `[ACC-004 CA-1]` en `tests/unit/auth-profile/` |
| T-2 | CA-1 | contrato | Prueba `[ACC-004 CA-1]` en `tests/integration/auth-profile/` |
| T-3 | CA-2 | unitaria | Prueba `[ACC-004 CA-2]` en `tests/unit/auth-profile/` |
| T-4 | CA-2 | contrato | Prueba `[ACC-004 CA-2]` en `tests/integration/auth-profile/` |
| T-5 | CA-2 | e2e | Prueba `[ACC-004 CA-2]` en `tests/e2e/auth-profile.e2e.mjs` |
| T-6 | CA-3 | unitaria | Prueba `[ACC-004 CA-3]` en `tests/unit/auth-profile/` |
| T-7 | CA-3 | e2e | Prueba `[ACC-004 CA-3]` en `tests/e2e/auth-profile.e2e.mjs` |
| T-8 | CA-4 | e2e | Prueba `[ACC-004 CA-4]` en `tests/e2e/auth-profile.e2e.mjs` |

## 8. Excepciones de cobertura

Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas

- Dependencias: ACC-001.
- Riesgos: —
- Pregunta no bloqueante: Tras cambiar la contraseña, ¿re-login o pedir par nuevo? → Decisión propuesta: Re-login (el refresh actual deja de valer)

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |
| CA-1 | | | `evidencia/ACC-004/...` |
| CA-2 | | | `evidencia/ACC-004/...` |
| CA-3 | | | `evidencia/ACC-004/...` |
| CA-4 | | | `evidencia/ACC-004/...` |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Cambio | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-17 | Spec creada desde el inventario legacy y el contrato `/api/v1` | Migración | — |
| 2026-11-17 | v2: contrato real (migration-guide §4); huecos y preguntas resueltas | Documentación del backend | — |
| 2026-11-20 | Formato y claves de la plantilla harness-engineering | Adopción del arnés (HAR-001) | — |
