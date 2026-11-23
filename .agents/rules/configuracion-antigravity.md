---
trigger: glob
globs: .agents/**
---

# Cambios en el propio arnés
- Formatos verificados (2026-11-18, plantilla harness-engineering): reglas con `trigger`; skills con `description`; subagentes con `model: inherit|flash|pro` y `tools` solo con nombres documentados (`view_file`, `grep_search`, `replace_file_content`, `run_command`, `manage_task`). Los *workflows* están deprecados: no crear `.agents/workflows/`.
- Tras editar `.agents/` o `AGENTS.md`, ejecuta `node tools/validate-harness.mjs .` y adjunta la salida.
- Cambiar un rol o un modelo requiere actualizar `docs/agent-workflow/` y pasar por PR.
