---
trigger: model_decision
description: Aplicar al crear ramas, commits, Issues o Pull Requests, o al cambiar el estado de una historia en GitHub Projects.
---

# GitHub Flow (detalle en docs/engineering/github-flow.md)
- Rama base de la línea AngularJS: la que fija ADR-0001. Rama de trabajo: `<tipo>/<issue>-<slug>` (o `<tipo>/<ID>-<slug>` antes del Issue), desde la base actualizada. Una rama por historia.
- Commits: Conventional Commits con pie `Refs: #<issue>` o `Spec: <ID>`.
- PR en borrador hasta tener los informes de los 3 roles revisores; título `<tipo>(<scope>): <descripción> (#<issue>)`; cuerpo con la plantilla y `Closes #<issue>`.
- Estados del tablero: Backlog → Ready → In Progress → Review → Done; `Blocked` siempre con comentario del motivo.
- Nunca aprobar, fusionar, cerrar Issues ajenos ni editar rulesets. En Windows/OneDrive: `git config core.fileMode false`.
