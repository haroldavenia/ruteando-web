# Iniciativa: Migración de ruteando-web a `/api/v1`

- Issue de iniciativa: #<n> (pendiente)
- Responsable: CTO / Ingeniería de Software
- Objetivo medible: las 47 llamadas legacy y las 52 pantallas del AngularJS (`master/`) migradas a `/api/v1` y todas las capacidades nuevas del panel web implementadas; `node tools/specs.mjs trace` con 0 pendientes y `legacy-scan` en 0.
- Fuera de alcance: app móvil del conductor (`/api/v1/driver/*`), webhook de Stripe, `GET /auth/verify-email` (HTML).
- Contrato: `docs/contracts/` (fuente canónica `docs/contracts/source/migration-guide.md`). Maquetas: `docs/ui/maquetas/index.html`.

## Fases

| Fase | Objetivo | Historias | Criterio de salida | Estado |
| --- | --- | --- | --- | --- |
| f0-fundaciones | Fundaciones: pruebas, capa API, catálogos, geo y sistema UI | `FND-001`, `FND-002`, `FND-003`, `FND-004`, `FND-005` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f0-fundaciones` sin pendientes | Implementada (propuesta), pendiente de revisión humana |
| f1-acceso | Acceso, sesión, perfil y roles | `ACC-001`, `ACC-002`, `ACC-003`, `ACC-004`, `ACC-005` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f1-acceso` sin pendientes | Backlog |
| f2-maestros | Flota, lugares, zonas, geocodificación y catálogos | `MAE-001`, `MAE-002`, `MAE-003`, `MAE-004`, `MAE-005`, `MAE-006`, `MAE-007`, `MAE-008`, `MAE-009` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f2-maestros` sin pendientes | Backlog |
| f3-paquetes | Configuraciones de planificación y paquetes | `PAQ-001`, `PAQ-002`, `PAQ-003` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f3-paquetes` sin pendientes | Backlog |
| f4-jornadas | Planificación, jornadas, rutas, visitas y herramientas de ruteo | `JOR-001`, `JOR-002`, `JOR-003`, `JOR-004`, `JOR-005`, `JOR-006`, `JOR-007` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f4-jornadas` sin pendientes | Backlog |
| f5-seguimiento | Seguimiento de flota | `SEG-001` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f5-seguimiento` sin pendientes | Backlog |
| f6-empresa | Administración de la empresa: usuarios, invitaciones, empresa, facturación, notificaciones, auditoría | `EMP-001`, `EMP-002`, `EMP-003`, `EMP-004`, `EMP-005`, `EMP-006` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f6-empresa` sin pendientes | Backlog |
| f7-plataforma | Plataforma (super_admin) | `PLA-001`, `PLA-002`, `PLA-003`, `PLA-004` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f7-plataforma` sin pendientes | Backlog |
| f8-cierre | Retiro del legacy y cierre | `CIE-001` | Historias `Hecha` o `Descartada`, regresión verde, `specs.mjs trace --fase f8-cierre` sin pendientes | Backlog |

## Historias

| ID | Título | Estado | Depende de | Ola |
| --- | --- | --- | --- | --- |
| [FND-001](f0-fundaciones/FND-001-arnes-de-pruebas.md) | Arnés de pruebas del frontend (unit, contrato, E2E, sondas API) | Borrador | — | 1 |
| [FND-002](f0-fundaciones/FND-002-api-core.md) | Capa de API: configuración, proxy same-origin, ApiClient y errores | Borrador | FND-001 | 2 |
| [FND-003](f0-fundaciones/FND-003-master-domains-svc.md) | Dominios maestros y unidades de medida de la plataforma | Borrador | FND-002 | 3 |
| [FND-004](f0-fundaciones/FND-004-geo-core.md) | Utilidades geográficas, polilíneas y unidades | Borrador | FND-001 | 2 |
| [FND-005](f0-fundaciones/FND-005-sistema-ui.md) | Sistema de interfaz y maquetas de las pantallas nuevas | Borrador | FND-001 | 2 |
| [ACC-001](f1-acceso/ACC-001-auth-session.md) | Inicio de sesión, sesión JWT, renovación y cierre | Borrador | FND-002, FND-005 | 3 |
| [ACC-002](f1-acceso/ACC-002-auth-register.md) | Registro de empresa y verificación de correo | Borrador | ACC-001 | 4 |
| [ACC-003](f1-acceso/ACC-003-auth-recovery.md) | Recuperación y restablecimiento de contraseña | Borrador | ACC-001 | 4 |
| [ACC-004](f1-acceso/ACC-004-auth-profile.md) | Mi perfil y cambio de contraseña (nuevo) | Borrador | ACC-001 | 4 |
| [ACC-005](f1-acceso/ACC-005-rbac-nav.md) | Roles, guardas de navegación, menú e inicio | Borrador | ACC-004, FND-005 | 5 |
| [MAE-001](f2-maestros/MAE-001-fleet-types.md) | Tipos de vehículo → resource-types | Borrador | ACC-005, FND-003 | 6 |
| [MAE-002](f2-maestros/MAE-002-fleet-vehicles.md) | Vehículos → resources y asignación de conductor | Borrador | MAE-001, MAE-003, MAE-005 | 8 |
| [MAE-003](f2-maestros/MAE-003-fleet-drivers.md) | Conductores → users con rol driver | Borrador | ACC-005, FND-003 | 6 |
| [MAE-004](f2-maestros/MAE-004-geocoding.md) | Geocodificación directa e inversa | Borrador | FND-002, FND-004 | 3 |
| [MAE-005](f2-maestros/MAE-005-places.md) | Lugares y depósitos → places (+ cercanos) | Borrador | MAE-004, MAE-006 | 7 |
| [MAE-006](f2-maestros/MAE-006-zones.md) | Zonas (nuevo) | Borrador | ACC-005, FND-004 | 6 |
| [MAE-007](f2-maestros/MAE-007-master-domains-admin.md) | Catálogos → administración de dominios maestros | Borrador | FND-003, ACC-005 | 6 |
| [MAE-008](f2-maestros/MAE-008-assigned-services.md) | Servicios asignados (conductor + fecha) | Descartada | MAE-002, MAE-003 | 9 |
| [MAE-009](f2-maestros/MAE-009-status-reasons.md) | Motivos de estado de paquete por empresa (nuevo) | Borrador | FND-003, ACC-005 | 6 |
| [PAQ-001](f3-paquetes/PAQ-001-settings.md) | Configuraciones de planificación → settings | Borrador | MAE-001, MAE-002, MAE-005, MAE-006 | 9 |
| [PAQ-002](f3-paquetes/PAQ-002-packages.md) | Paquetes (nuevo módulo persistido, sustituye el itinerario en memoria) | Borrador | MAE-004, MAE-006, FND-003, MAE-009 | 7 |
| [PAQ-003](f3-paquetes/PAQ-003-packages-upload.md) | Carga masiva de paquetes por CSV | Borrador | PAQ-002 | 8 |
| [JOR-001](f4-jornadas/JOR-001-journey-plan.md) | Planificar jornada (VRP en servidor) | Borrador | PAQ-001, PAQ-002 | 10 |
| [JOR-002](f4-jornadas/JOR-002-journey-list.md) | Listado de jornadas | Borrador | JOR-001 | 11 |
| [JOR-003](f4-jornadas/JOR-003-journey-detail.md) | Detalle de jornada, rutas, mapa y línea de tiempo | Borrador | JOR-002, FND-004 | 12 |
| [JOR-004](f4-jornadas/JOR-004-journey-metrics-nav.md) | KPI de jornada y navegación turn-by-turn | Borrador | JOR-003 | 13 |
| [JOR-005](f4-jornadas/JOR-005-journey-exports.md) | Exportaciones PDF/XLSX de jornadas y rutas | Borrador | JOR-003 | 13 |
| [JOR-006](f4-jornadas/JOR-006-visits-tracking.md) | Seguimiento de visitas y visitas no atendidas | Borrador | JOR-003, PAQ-002, MAE-009 | 13 |
| [JOR-007](f4-jornadas/JOR-007-routing-preview.md) | Herramientas de ruteo en mapa (previsualización no persistida) | Borrador | FND-004, MAE-005, JOR-001 | 11 |
| [SEG-001](f5-seguimiento/SEG-001-fleet-tracking.md) | Seguimiento GPS de la flota (nuevo) | Borrador | MAE-002, FND-004 | 9 |
| [EMP-001](f6-empresa/EMP-001-users-admin.md) | Usuarios del tenant (nuevo) | Borrador | MAE-003 | 7 |
| [EMP-002](f6-empresa/EMP-002-invitations.md) | Invitaciones de usuarios (nuevo) | Borrador | EMP-001, ACC-002 | 8 |
| [EMP-003](f6-empresa/EMP-003-tenant-me.md) | Mi empresa: datos, asientos y datos de facturación (nuevo) | Borrador | ACC-005 | 6 |
| [EMP-004](f6-empresa/EMP-004-billing.md) | Suscripción, plan, asientos y facturas (nuevo) | Borrador | EMP-003 | 7 |
| [EMP-005](f6-empresa/EMP-005-notifications.md) | Preferencias de notificación, verificación de teléfono por OTP y push web (nuevo) | Borrador | ACC-004 | 5 |
| [EMP-006](f6-empresa/EMP-006-audit.md) | Auditoría del tenant y mi actividad (nuevo) | Borrador | ACC-005 | 6 |
| [PLA-001](f7-plataforma/PLA-001-tenants-admin.md) | Plataforma: gestión de empresas (super_admin, nuevo) | Borrador | ACC-005 | 6 |
| [PLA-002](f7-plataforma/PLA-002-audit-global.md) | Plataforma: auditoría global (super_admin, nuevo) | Borrador | EMP-006, PLA-001 | 7 |
| [PLA-003](f7-plataforma/PLA-003-geocoding-config.md) | Plataforma: configuración de geocodificación (singleton) | Borrador | ACC-005 | 6 |
| [PLA-004](f7-plataforma/PLA-004-data-migration.md) | Plataforma: migración de datos heredados | Descartada | PLA-003 | 7 |
| [CIE-001](f8-cierre/CIE-001-legacy-sunset.md) | Retiro del legacy, regresión completa y cierre de trazabilidad | Borrador | MAE-002, MAE-009, JOR-007, SEG-001, EMP-006, PLA-003 | 12 |

Ola = profundidad en el grafo de dependencias: historias de la misma ola sin dependencia entre sí pueden ir en paralelo si sus «Archivos autorizados» no se solapan.

## Estado del backend (2026-11-20)

- Corregido o documentado: B2–B8, C1–C5, D1–D16 (`docs/contracts/source/BACKEND_PENDIENTES_RESPUESTA.md`).
- Abierto (operación): E1 URL (https://hanoit:8000 con certificado autofirmado), E2 parcial (tenant `prueba-backend` con tenant_admin), B1 Brevo, D12 Firebase web, D13 Stripe test.
- Descartadas por el backend: MAE-008 (asignaciones) y PLA-004 (migración de datos).
