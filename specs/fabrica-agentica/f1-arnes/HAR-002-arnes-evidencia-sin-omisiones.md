# HAR-002: Hacer que el arnés no omita verificaciones fuera de lo planificado

| Campo | Valor |
| --- | --- |
| Estado | Borrador |
| Iniciativa / Fase | `fabrica-agentica` / `f1-arnes` |
| Depende de | — |
| Issue | #<n> (pendiente) |
| Rama | `chore/<n>-arnes-evidencia-sin-omisiones` |
| Pull Request | #<n> (pendiente) |
| Repo / componente | ruteando-web (línea AngularJS) |
| ADR relacionados | 0003, 0005 |
| Autor / Fecha | Claude (Cowork) a partir del informe del validador de FND-001 / 2026-11-25 |

## 1. Objetivo y contexto
La validación de FND-001 (`specs/migracion-api-v1/f0-fundaciones/evidencia/FND-001/2026-11-25-validador.md`) mostró omisiones que el arnés no detecta: las sondas API nunca se ejecutan en CI; la revisión se hizo en la misma sesión que implementó; el comando de cobertura de `AGENTS.md` no coincidía con el de CI; `ensure-build` no permite forzar el build para evidencia; los agentes de Antigravity no pueden ejecutar Karma, E2E ni `npx` dentro de su sandbox.

## 2. Historia de usuario
Como responsable de ingeniería, quiero que toda omisión de una verificación sea explícita y planificada, para que un «PASS» signifique siempre que la prueba se ejecutó.

## 3. Alcance
**Incluye**: `.github/workflows/**`, `AGENTS.md`, `.agents/skills/validar-spec/**`, `.agents/skills/revision-contendiente/**`, `.agents/skills/revision-calidad-seguridad/**`, `specs/_templates/informe-rol.md`, `tools/specs.mjs`, `tools/test/specs.test.mjs`, `tests/e2e/ensure-build.mjs`, `tests/tools/**`, `docs/agent-workflow/**`.
**Excluye**: código de la app (`master/js`, `master/jade`, `server/`).

**Archivos autorizados**
- Los de «Incluye».

## 4. Requisitos
**Funcionales**
- RF-1: Job de CI programado y manual que ejecuta `npm run test:api` contra el entorno de pruebas con credenciales del tenant `sdd-test` en *secrets*; con `API_REQUIRED=1` una sonda omitida cuenta como fallo.
- RF-2: La plantilla de informe de rol declara «Contexto: subagente limpio | misma sesión»; `specs.mjs dod` falla si un informe de validador, contendiente o calidad-seguridad no es de contexto limpio.
- RF-3: `AGENTS.md` y las skills usan `npm run coverage:diff -- --base <rama-base>`, el mismo filtro que CI.
- RF-4: `E2E_FORCE_BUILD=1` obliga a `ensure-build` a compilar aunque `app/` esté al día, para evidencia de CA de build.
- RF-5: `docs/agent-workflow/` documenta los permisos de terminal y red que necesita Antigravity para Karma, Playwright y `npx`.

**No funcionales**
- RNF-1: Las credenciales del tenant de pruebas solo en *secrets*; nunca en logs, evidencia ni código.

## 5. Criterios de aceptación
- **CA-1** (RF-1) — Dado el job de sondas con `API_REQUIRED=1` y sin `BACKEND_URL`, Cuando se ejecuta, Entonces falla indicando las sondas omitidas.
- **CA-2** (RF-1) — Dado el job de sondas con *secrets* válidos, Cuando se ejecuta, Entonces las sondas corren y su JUnit no tiene omitidas.
- **CA-3** (RF-2) — Dado un informe de validador con «Contexto: misma sesión», Cuando ejecuto `node tools/specs.mjs dod <ID>`, Entonces falla y lo nombra.
- **CA-4** (RF-3) — Dado `AGENTS.md`, Entonces el comando de cobertura documentado es `npm run coverage:diff` y coincide con el de `ci.yml`.
- **CA-5** (RF-4) — Dado `app/` al día y `E2E_FORCE_BUILD=1`, Cuando ejecuto `npm run test:e2e`, Entonces compila con Gulp.
- **CA-6** (RF-5) — Dado `docs/agent-workflow/`, Entonces existe la guía de permisos del sandbox de Antigravity con los comandos que la requieren.

## 6. Diseño y restricciones técnicas
Cambios en herramientas y documentación del arnés; sin interfaz.

## 7. Casos de prueba esperados
| Caso | Cubre | Tipo | Descripción |
| --- | --- | --- | --- |
| T-1 | CA-1 | herramienta | Prueba `[HAR-002 CA-1]` en `tests/tools/` |
| T-2 | CA-2 | sonda API | Prueba `[HAR-002 CA-2]` en el job programado |
| T-3 | CA-3 | herramienta | Prueba `[HAR-002 CA-3]` en `tools/test/specs.test.mjs` |
| T-4 | CA-4 | herramienta | Prueba `[HAR-002 CA-4]` en `tests/tools/` |
| T-5 | CA-5 | herramienta | Prueba `[HAR-002 CA-5]` en `tests/tools/ensure-build.test.mjs` |
| T-6 | CA-6 | herramienta | Prueba `[HAR-002 CA-6]` en `tests/tools/` |

## 8. Excepciones de cobertura
Ninguna. (Si hay, cada una con archivo:línea, motivo y aprobador humano.)

## 9. Dependencias, riesgos y preguntas abiertas
- Dependencias: credenciales del tenant `sdd-test` (el `.env` local responde `401 INVALID_CREDENTIALS`).
- Riesgos: el job de sondas depende de la disponibilidad del entorno de pruebas del backend.
- Pregunta no bloqueante: ¿frecuencia del job de sondas? → Decisión propuesta: diario y manual.

## 10. Trazabilidad (se completa al cerrar)

| CA | Prueba(s) | Commit(s) | Evidencia |
| --- | --- | --- | --- |

## 11. Registro de decisiones y cambios de alcance

| Fecha | Decisión | Motivo | Aprobó |
| --- | --- | --- | --- |
| 2026-11-25 | Se crea a partir de la decisión (e) sobre el informe del validador de FND-001 | Mejoras del arnés fuera del alcance de FND-001 | Harold Avenia |
