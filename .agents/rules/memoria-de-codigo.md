---
trigger: model_decision
description: Aplicar al explorar el código para entender dependencias, llamadas o impacto de un cambio.
---

# Navegación del código
- Si el MCP `codebase-memory` está disponible: `search_graph`, `trace_path`, `search_code`, `detect_changes`; luego lee solo las secciones necesarias.
- AngularJS registra todo con `App.controller|factory|service|directive('<Nombre>', [...])`: busca por el nombre registrado (`grep_search "App.factory('PlacesHttp'"`) y por su inyección (`'PlacesHttp'`).
- Las rutas y estados viven en `master/js/modules/config.js`; el menú en `server/sidebar-menu.json`; las vistas en `master/jade/views/pages/<modulo>/`.
- Nunca cites el índice como fuente de un requisito.
