# Data Migration Map — Legacy → New Model (histórico)

> **Nota histórica (2026-11-19).** No existe migración de datos: el endpoint `/api/v1/admin/migrate*`
> y el paquete `com.hanoit.routing.migration` se eliminaron y la plataforma arranca en limpio sobre el
> modelo nuevo. Esta tabla queda solo como referencia de cómo se correspondían los conceptos del
> modelo anterior. Las colecciones de la columna izquierda se borran con
> [`../operations/LEGACY_DB_CLEANUP.md`](../operations/LEGACY_DB_CLEANUP.md). Modelo vigente:
> [`DATABASE_ER_DIAGRAM.md`](DATABASE_ER_DIAGRAM.md).

## Collections

| Legacy Collection | New Collection | Notes |
|-------------------|----------------|-------|
| `users` (OAuth) | `users` (RBAC) | Added `tenantId`, `role` enum, `identifierType`, `identifierValue` |
| `roles` | `master_domains` (Role) | Roles seeded as MasterDomain catalog |
| `setting` | `settings` | Renamed `roadRestrictionType` → `restrictionType`, removed `settingResource[]` → `resourceIds[]` |
| `vehicle` | `resources` | Merged with `driver` assignment |
| `driver` | `users` (role=DRIVER) + `resources.driverId` | Driver is now a User with DRIVER role |
| `typeVehicle` | `resource_types` | Added `osrmProfile`, `capacity`, `measure`, `restriction` |
| `place` | `places` | Added GeoJSON `location`, `type`, soft delete |
| `journey` | `journeys` | Routes embedded as `routes[]`, added `stats`, `resourceSummary` |
| `route` | `journeys.routes[]` (embedded) | Embedded in journey document |
| `package` | `packages` | Added GeoJSON, `timeWindow`, `geocodingStatus`, `goodsTags` |
| — | `tenants` | New: multitenancy root entity |
| — | `master_domains` | New: unified domain catalogs |
| — | `zones` | New: geographic zones with GeoJSON polygon |
| — | `route_navigations` | New: separated turn-by-turn navigation data |
| — | `journey_metrics` | New: aggregated journey metrics |

## Field Renames

| Entity | Legacy Field | New Field |
|--------|-------------|-----------|
| Settings | `roadRestrictionType` | `restrictionType` |
| Settings | `settingResource[]` | `resourceIds[]` |
| Package | `PENDIENTE` | `pending` |
| Package | `ENTREGADO` | `attended` |
| Package | `RECHAZADO` | `unattended` |
| Journey | `status` (free text) | `status` (enum: planning, in_progress, completed, failed, cancelled) |

## Concept Merges

| Legacy Concepts | New Concept | Explanation |
|----------------|-------------|-------------|
| Vehicle + Driver + SettingResource | **Resource** | Single entity with vehicle data, driver assignment, and shift config |
| TypeVehicle | **ResourceType** | Added OSRM profile and structured capacity |
| OAuth User (users + roles) | **User** (RBAC) | Unified with role enum in user document |

## Route Topology Mapping

| Legacy `roadRestrictionType` | New `restrictionType` |
|------------------------------|----------------------|
| `fixed_routes` | `fixed_routes` |
| `resource_vs_time` | `resource_vs_time` |
| _(new)_ | `time_windows` (Fase 2+) |
