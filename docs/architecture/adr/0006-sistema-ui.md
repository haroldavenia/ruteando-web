# ADR-0006: Sistema UI `rw-*` y maquetas navegables

- Estado: Propuesto (FND-005)
- Fecha: 2026-11-20

## Contexto
La migración cambia casi todas las pantallas (páginas de servidor, errores tipados, catálogos) y crea ~20 nuevas (usuarios, invitaciones, empresa, facturación, notificaciones, auditoría, zonas, paquetes, métricas, navegación, flota, plataforma). Sin una referencia común cada historia inventaría su propio patrón.

## Decisión
- Sin cambiar de framework CSS: tokens y clases `rw-*` sobre el tema Angle/Bootstrap 3 (`master/less/custom/ruteando-ui.less`).
- Directivas AngularJS reutilizables con plantilla en línea (probables con Karma sin `templateUrl`): `rw-page-head`, `rw-list-state`, `rw-data-table`, `rw-status-badge`, `rw-confirm`/`RwConfirm`, `rw-form-actions`.
- Referencia de diseño: `docs/ui/sistema-ui.md` + `docs/ui/maquetas/index.html` (navegable, una pantalla por spec con ancla `#<id>`); toda spec con interfaz enlaza su maqueta y `/disenar-pantalla` la mantiene. `node tools/specs.mjs lint` verifica el ancla y `lint-ui` las secciones del sistema.
- Accesibilidad mínima: estados con texto (no solo color), foco visible, controles con etiqueta, `aria-sort`, `role=status` en estados.

## Consecuencias
- Las pantallas legacy se migran al patrón cuando su historia las toca; no hay rediseño masivo.
- Cambiar un componente exige actualizar la maqueta y el sistema UI en el mismo PR.
