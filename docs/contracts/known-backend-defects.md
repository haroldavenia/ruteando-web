# Defectos conocidos del backend

Estado al 2026-11-19 según `source/BACKEND_PENDIENTES_RESPUESTA.md`. Un defecto «corregido» se da por cerrado en el frontend solo cuando su sonda API pasa contra el backend real (G4).

| # | Defecto | Specs | Estado backend | Tratamiento en el frontend |
|---|---|---|---|---|
| D1 | `journeys/plan` fallaba con ids hexadecimales | JOR-001 | **Corregido (B2)** en `mode=packages`; `mode=messenger` sin prueba de éxito en backend | Sonda en vivo obligatoria para ambos modos |
| D2 | `PackageStatus` con valores inactivos | PAQ-002, JOR-006 | **Corregido (B6)**: catálogos de enum desde código | `activeValues()` se mantiene por robustez |
| D3 | Dos paquetes sin guía chocaban (409) | PAQ-002, PAQ-003 | **Corregido (D16)**: índice parcial | No enviar guía vacía igualmente |
| D4 | `/packages/upload` daba 400 | PAQ-003 | **Corregido (B7)** | Capturar fixture |
| D5 | `routing/nearest` y `routing/messenger` daban 500 | JOR-007 | **Corregido (B5)**: 400 con mensaje, 502 `ROUTING_ENGINE_UNAVAILABLE` | messenger solo probado con OSRM simulado |
| D6 | `optimizations/collection` 200 con estado 207 | JOR-007 | Sin cambios | Leer el estado de negocio del cuerpo |
| D7 | `zones` con `boundary` daba 500 | MAE-006 | **Corregido (B4)**: GeoJSON Polygon | Editor de polígonos dentro de MAE-006 |
| D8 | `sort` se ignoraba | listados | **Corregido (B8)**: lista blanca, 400 si no permitido | Orden en servidor |
| D9 | Refresh sin rotación y 401 en texto | ACC-001 | **Corregido (C1, C3)**: rota siempre, 401 JSON `INVALID_TOKEN`/`TOKEN_EXPIRED`, una sesión por usuario | Single-flight + sincronización entre pestañas obligatorios |
| D10 | Paradas sin `packageId` | JOR-003, JOR-006 | **Corregido (B3)**: `packageInfo {id, trackingCode, address, status}`, `stopType` `delivery`/`pickup` | Jornadas antiguas conservan `service` |
| D11 | `GET /auth/verify-email` devuelve HTML | ACC-002 | Documentado (D1) | Redirección de `/verify-email` en `server.js` |
| D12 | Correos no llegan | ACC-002, ACC-003, EMP-002 | **Abierto (operación B1)**: Brevo | Pruebas con mock; dispensa live |
| D13 | `TOKEN_EXPIRED` vs `INVALID_TOKEN` | ACC-002, ACC-003 | Documentado (C2): ambos, con significado distinto | Mensajes distintos |
| D14 | `journeys/plan` con 2000 paquetes tarda 137 s | JOR-001 | Documentado (D11); modo asíncrono pendiente | Timeout de 180 s en el proxy para esa ruta |
