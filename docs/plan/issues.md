# Backlog de Issues (generado desde las specs)

Los Issues **no se escriben a mano**: se generan desde la spec, que es la fuente de verdad.

```powershell
node tools/specs.mjs issue MAE-005             # ver título, etiquetas y cuerpo
node tools/specs.mjs issue MAE-005 --write     # deja .tmp/issues/MAE-005.md e imprime el `gh issue create …`
gh issue edit <n> --body-file .tmp/issues/MAE-005.md   # tras refinar la spec
```

Etiquetas a crear una vez en GitHub: `tipo:historia`, `tipo:iniciativa`, `tipo:tarea`, `fase:f0`…`fase:f8`, `area:fnd|acc|mae|paq|jor|seg|emp|pla|cie|har`, `bloqueado`, `backend`, `codigo-heredado`.
Las historias `Descartada` no llevan Issue.

«Refinada 2026-11-23» = la spec cambió con la documentación del backend de ese día (M1–M5, plan asíncrono, OTP 502, B1/D13/E2, D12 aplazado). Ver la sección 11 de cada spec.

| ID | Título | Estado | Depende de | CA | Maqueta | Refinada 2026-11-23 | Etiquetas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ACC-001 | Inicio de sesión, sesión JWT, renovación y cierre | Borrador | FND-002, FND-005 | 18 | sí | **sí** | `tipo:historia` `fase:f1` `area:acc` |
| ACC-002 | Registro de empresa y verificación de correo | Borrador | ACC-001 | 10 | sí | **sí** | `tipo:historia` `fase:f1` `area:acc` |
| ACC-003 | Recuperación y restablecimiento de contraseña | Borrador | ACC-001 | 5 | sí | **sí** | `tipo:historia` `fase:f1` `area:acc` |
| ACC-004 | Mi perfil y cambio de contraseña (nuevo) | Borrador | ACC-001 | 4 | sí |  | `tipo:historia` `fase:f1` `area:acc` |
| ACC-005 | Roles, guardas de navegación, menú e inicio | Borrador | ACC-004, FND-005 | 8 | sí | **sí** | `tipo:historia` `fase:f1` `area:acc` |
| CIE-001 | Retiro del legacy, regresión completa y cierre de trazabilidad | Borrador | MAE-002, MAE-009, JOR-007, SEG-001, EMP-006, PLA-003 | 5 | — |  | `tipo:historia` `fase:f8` `area:cie` |
| EMP-001 | Usuarios del tenant (nuevo) | Borrador | MAE-003 | 10 | sí | **sí** | `tipo:historia` `fase:f6` `area:emp` |
| EMP-002 | Invitaciones de usuarios (nuevo) | Borrador | EMP-001, ACC-002 | 7 | sí | **sí** | `tipo:historia` `fase:f6` `area:emp` |
| EMP-003 | Mi empresa: datos, asientos y datos de facturación (nuevo) | Borrador | ACC-005 | 5 | sí |  | `tipo:historia` `fase:f6` `area:emp` |
| EMP-004 | Suscripción, plan, asientos y facturas (nuevo) | Borrador | EMP-003 | 12 | sí | **sí** | `tipo:historia` `fase:f6` `area:emp` |
| EMP-005 | Preferencias de notificación, verificación de teléfono por OTP y push web (nuevo) | Borrador | ACC-004 | 9 | sí | **sí** | `tipo:historia` `fase:f6` `area:emp` |
| EMP-006 | Auditoría del tenant y mi actividad (nuevo) | Borrador | ACC-005 | 6 | sí | **sí** | `tipo:historia` `fase:f6` `area:emp` |
| FND-001 | Arnés de pruebas del frontend (unit, contrato, E2E, sondas API) | Borrador | — | 10 | — |  | `tipo:historia` `fase:f0` `area:fnd` |
| FND-002 | Capa de API: configuración, proxy same-origin, ApiClient y errores | Borrador | FND-001 | 18 | — | **sí** | `tipo:historia` `fase:f0` `area:fnd` |
| FND-003 | Dominios maestros y unidades de medida de la plataforma | Borrador | FND-002 | 7 | — |  | `tipo:historia` `fase:f0` `area:fnd` |
| FND-004 | Utilidades geográficas, polilíneas y unidades | Borrador | FND-001 | 5 | — |  | `tipo:historia` `fase:f0` `area:fnd` |
| FND-005 | Sistema de interfaz y maquetas de las pantallas nuevas | Borrador | FND-001 | 6 | sí |  | `tipo:historia` `fase:f0` `area:fnd` |
| JOR-001 | Planificar jornada (VRP en servidor) | Borrador | PAQ-001, PAQ-002 | 16 | sí | **sí** | `tipo:historia` `fase:f4` `area:jor` |
| JOR-002 | Listado de jornadas | Borrador | JOR-001 | 9 | sí | **sí** | `tipo:historia` `fase:f4` `area:jor` |
| JOR-003 | Detalle de jornada, rutas, mapa y línea de tiempo | Borrador | JOR-002, FND-004 | 10 | sí | **sí** | `tipo:historia` `fase:f4` `area:jor` |
| JOR-004 | KPI de jornada y navegación turn-by-turn | Borrador | JOR-003 | 5 | sí |  | `tipo:historia` `fase:f4` `area:jor` |
| JOR-005 | Exportaciones PDF/XLSX de jornadas y rutas | Borrador | JOR-003 | 4 | — |  | `tipo:historia` `fase:f4` `area:jor` |
| JOR-006 | Seguimiento de visitas y visitas no atendidas | Borrador | JOR-003, PAQ-002, MAE-009 | 7 | sí | **sí** | `tipo:historia` `fase:f4` `area:jor` |
| JOR-007 | Herramientas de ruteo en mapa (previsualización no persistida) | Borrador | FND-004, MAE-005, JOR-001 | 10 | sí |  | `tipo:historia` `fase:f4` `area:jor` |
| MAE-001 | Tipos de vehículo → resource-types | Borrador | ACC-005, FND-003 | 13 | sí | **sí** | `tipo:historia` `fase:f2` `area:mae` |
| MAE-002 | Vehículos → resources y asignación de conductor | Borrador | MAE-001, MAE-003, MAE-005 | 14 | sí | **sí** | `tipo:historia` `fase:f2` `area:mae` |
| MAE-003 | Conductores → users con rol driver | Borrador | ACC-005, FND-003 | 10 | sí | **sí** | `tipo:historia` `fase:f2` `area:mae` |
| MAE-004 | Geocodificación directa e inversa | Borrador | FND-002, FND-004 | 7 | sí |  | `tipo:historia` `fase:f2` `area:mae` |
| MAE-005 | Lugares y depósitos → places (+ cercanos) | Borrador | MAE-004, MAE-006 | 11 | sí | **sí** | `tipo:historia` `fase:f2` `area:mae` |
| MAE-006 | Zonas (nuevo) | Borrador | ACC-005, FND-004 | 9 | sí |  | `tipo:historia` `fase:f2` `area:mae` |
| MAE-007 | Catálogos → administración de dominios maestros | Borrador | FND-003, ACC-005 | 5 | sí |  | `tipo:historia` `fase:f2` `area:mae` |
| MAE-008 | Servicios asignados (conductor + fecha) | Descartada | MAE-002, MAE-003 | 7 | — |  | `tipo:historia` `fase:f2` `area:mae` |
| MAE-009 | Motivos de estado de paquete por empresa (nuevo) | Borrador | FND-003, ACC-005 | 7 | sí |  | `tipo:historia` `fase:f2` `area:mae` |
| PAQ-001 | Configuraciones de planificación → settings | Borrador | MAE-001, MAE-002, MAE-005, MAE-006 | 13 | sí | **sí** | `tipo:historia` `fase:f3` `area:paq` |
| PAQ-002 | Paquetes (nuevo módulo persistido, sustituye el itinerario en memoria) | Borrador | MAE-004, MAE-006, FND-003, MAE-009 | 18 | sí | **sí** | `tipo:historia` `fase:f3` `area:paq` |
| PAQ-003 | Carga masiva de paquetes por CSV | Borrador | PAQ-002 | 9 | sí |  | `tipo:historia` `fase:f3` `area:paq` |
| PLA-001 | Plataforma: gestión de empresas (super_admin, nuevo) | Borrador | ACC-005 | 5 | sí |  | `tipo:historia` `fase:f7` `area:pla` |
| PLA-002 | Plataforma: auditoría global (super_admin, nuevo) | Borrador | EMP-006, PLA-001 | 4 | sí | **sí** | `tipo:historia` `fase:f7` `area:pla` |
| PLA-003 | Plataforma: configuración de geocodificación (singleton) | Borrador | ACC-005 | 3 | sí |  | `tipo:historia` `fase:f7` `area:pla` |
| PLA-004 | Plataforma: migración de datos heredados | Descartada | PLA-003 | 4 | — |  | `tipo:historia` `fase:f7` `area:pla` |
| SEG-001 | Seguimiento GPS de la flota (nuevo) | Borrador | MAE-002, FND-004 | 5 | sí |  | `tipo:historia` `fase:f5` `area:seg` |
