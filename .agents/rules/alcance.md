---
trigger: model_decision
description: Aplicar cuando haya duda de si una pantalla, endpoint o funcionalidad está dentro del alcance de la migración.
---

# Alcance
**Dentro:** todo lo que hace hoy `master/js` (`specs/migracion-api-v1/trazabilidad/legacy-inventory.json`) y la superficie `/api/v1` útil para el panel web (`endpoint-coverage.json`), incluidas las pantallas nuevas: usuarios, invitaciones, empresa, facturación, notificaciones, auditoría, zonas con polígono, motivos de estado, paquetes, métricas, navegación, seguimiento de flota y plataforma. La gestión web de conductores (cuentas y asignación a vehículos) está dentro.
**Fuera:** app móvil del conductor (`/api/v1/driver/*`), webhook de Stripe, `GET /auth/verify-email` (HTML del backend).
Algo nuevo fuera de las specs → `/nueva-spec`, no implementación directa.
