# Memoria del proyecto y del código

| Información | Dónde | Quién la actualiza | Cómo se corrige |
| --- | --- | --- | --- |
| Requisitos e historias | `specs/` + Issues | Orquestador propone, humano aprueba | PR que edita la spec y registra el cambio (sección 11) |
| Contrato del backend | `docs/contracts/` | `/sincronizar-contrato` | PR; lo anterior pasa a `source/historico/` |
| Diseño de pantallas | `docs/ui/` | `/disenar-pantalla` | PR con captura y confirmación humana |
| Decisiones de arquitectura | `docs/architecture/adr/` | Cualquiera propone; humano acepta | ADR nuevo que reemplaza al anterior |
| Convenciones y flujo | `AGENTS.md`, `.agents/`, `docs/engineering/` | Dueño del arnés | PR |
| Estado de la migración | `node tools/specs.mjs status` + GitHub Projects | Automático + orquestador | En la spec (estado) y en GitHub |
| Lecciones | `docs/agent-workflow/lecciones.md` | Orquestador al cerrar una historia | PR; se eliminan al volverse regla o ADR |
| Índice de código | `codebase-memory-mcp` (fuera del repo) | Watcher del MCP | `index_repository` |

Regla: el índice es derivado y desechable; nunca se versiona ni sustituye specs, contrato o ADR. Credenciales de la cuenta de pruebas: solo en `.env` (ignorado), nunca en memoria, specs ni evidencia.
