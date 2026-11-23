---
name: iniciar-historia
description: Verifica la Definition of Ready de una spec de la migración y crea su rama corta desde la rama base vinculada al Issue. Usar antes de implementar cualquier historia.
---

# Iniciar historia

1. `node tools/specs.mjs lint <ID>` en PASS, `Estado: Lista` y dependencias cerradas (`node tools/specs.mjs next`). Cualquier fallo → detente y lista qué falta.
2. `git status --porcelain` vacío para los archivos autorizados; si no, detente.
3. Actualiza la rama base (ADR-0001): `git switch <base> && git pull --ff-only` (sin remoto: dilo y usa la local).
4. `git switch -c feat/<issue>-<slug>` (o `feat/<ID>-<slug>` sin Issue). Anota la rama en la spec.
5. `node tools/specs.mjs estado <ID> "En progreso"`; mueve el Issue a `In Progress` y comenta la rama.
