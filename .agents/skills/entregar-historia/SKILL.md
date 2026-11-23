---
name: entregar-historia
description: Recorre de punta a punta una historia de la migración ya especificada (DoR, rama, implementación en worktree, tres revisiones independientes, DoD, evidencia y PR en borrador). Usar cuando el usuario pide "entrega", "implementa la historia" o da un ID (MAE-001) o un Issue.
---

# Entregar una historia

Entrada: ID de spec (`MAE-001`) o número de Issue.

1. **Contexto**: `gh issue view <n>` si hay Issue; abre la spec. `/iniciar-historia` (DoR + rama). Si la DoR falla, detente y propone correcciones.
2. **Diseño**: si la spec tiene campo Maqueta y el ancla no existe, `/disenar-pantalla <ID>` y pide confirmación humana de la maqueta.
3. **Implementar**: `invoke_subagent` → `implementador`, espacio de trabajo `branch`, prompt = ruta de la spec + rama + ancla de maqueta. Guarda su informe en `evidencia/<ID>/AAAA-MM-DD-implementador.md`.
4. **Revisar en paralelo** (contexto limpio; entrada: ruta de spec, rama, `git diff <base>...HEAD --stat`):
   - `validador` → `/validar-spec`
   - `contendiente` → `/revision-contendiente` (indícale el modelo de la sesión)
   - `calidad-seguridad` → `/revision-calidad-seguridad`
5. **Decidir**: FAIL → hallazgos al implementador (vuelve a 3). Tras corregir un PASS WITH GAPS, relanza al menos validador y contendiente. Máximo 3 ciclos; después `Blocked` + comentario.
6. **DoD**: completa la sección 10 (CA → pruebas → commits → evidencia); `node tools/specs.mjs dod <ID>` en PASS; `node tools/specs.mjs estado <ID> "En revisión"`.
7. **PR**: `/abrir-pr`. Resumen final: CA cumplidos, veredictos, riesgos y pasos humanos (revisión, merge, `estado <ID> Hecha --humano`).
