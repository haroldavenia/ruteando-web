---
name: disenar-pantalla
description: Diseña o actualiza la maqueta HTML de una pantalla de la migración en docs/ui/maquetas/index.html siguiendo el sistema UI, y la enlaza desde su spec. Usar antes de implementar una historia con interfaz o cuando cambia su contrato.
---

# Diseñar pantalla

1. Lee la spec (RF, CA, sección 6), el contrato (campos reales y errores) y `docs/ui/sistema-ui.md`.
2. En `docs/ui/maquetas/index.html` añade o actualiza la `<section class="screen" id="<id en minúsculas>" data-roles="…">` (copia la estructura de una existente: barra `.meta` con spec, roles, estados ui-router y endpoints; enlace en el menú lateral `.side` del grupo que toque): patrón (listado, formulario, detalle, asistente, mapa), columnas o campos con los nombres del contrato, acciones por fila/lote, filtros, estados vacío/carga/error y los mensajes de cada error del contrato.
3. Usa solo componentes del sistema UI; si falta uno, proponlo en `docs/ui/sistema-ui.md` en el mismo cambio.
4. Enlaza `docs/ui/maquetas/index.html#<id>` en el campo Maqueta de la spec y ejecuta `node tools/specs.mjs lint <ID>`.
5. Abre la maqueta en el navegador de Antigravity, toma captura y pide al humano que la confirme antes de implementar.
