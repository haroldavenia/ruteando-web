---
name: abrir-pr
description: Abre el Pull Request en borrador de una historia con la plantilla del repo, enlazando Issue, spec, maqueta, evidencia y pruebas. Pregunta antes de inventar cualquier dato obligatorio.
---

# Abrir PR

1. Verifica: rama correcta, `git status` limpio, los 4 informes en `evidencia/<ID>/`, `node tools/specs.mjs dod <ID>` en PASS.
2. Si falta Issue, spec o informe, **pregunta**; no inventes.
3. Pide confirmación al usuario antes de `git push -u origin <rama>`.
4. `gh pr create --draft --base <base> --title "<tipo>(<scope>): <descripción> (#<issue>)" --body-file <archivo>` con `.github/pull_request_template.md` completado con datos reales.
5. Comenta el PR en el Issue y mueve el Project a `Review`.
6. No marques "Ready for review" ni pidas merge: lo decide un humano.
