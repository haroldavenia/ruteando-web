# Limpieza de datos legacy en MongoDB — runbook

El backend ya no lee ni escribe el modelo legacy de Fase 1: se retiraron la migración
(`/api/v1/admin/migrate*`), los servicios y repositorios `com.hanoit.service.core` /
`com.hanoit.repository.mongo` y los runners de corrección de datos al arranque. Las colecciones
legacy que queden en una base son datos muertos. Este runbook las borra con
[`scripts/mongo/drop-legacy-collections.js`](../../scripts/mongo/drop-legacy-collections.js).

Se ejecuta **a mano, una vez por entorno** (local, dev, prod). El script es idempotente: si se
corre de nuevo no encuentra nada que hacer.

## 1. Qué hace

| Paso | Detalle |
|---|---|
| Borra colecciones legacy | `package`, `place`, `setting`, `journey`, `route`, `driver`, `vehicle`, `typeVehicle`, `vehiclePosition`, `assignedService`, `catalog`, `travelMode`, `globalConfiguration`, `userControl`, `roles` y las de OAuth (`oauth_*`), solo si existen. |
| `tenants` | Quita `config.defaultWeightUnit` y `config.defaultVolumeUnit` (las unidades son de plataforma, `GET /api/v1/units`). Antes lo hacía `TenantUnitsCleanupRunner`. |
| `master_domains` | Borra las copias guardadas de catálogos que hoy se sirven desde enums (`Role`, `PackageStatus`, …). Antes lo hacía `EnumCatalogCleanupRunner`. |
| `master_domains.audit_actions` | Quita la acción retirada `user.identifier_type.normalize`. |
| `packages` | Borra los índices `tenant_guide` y `tenant_guide_unique_sparse`. El índice vigente `tenant_guide_unique_partial` lo crea `IndexInitializer` al arrancar. |
| `users.identifierType` | Pasa los valores fuera del catálogo `IdentifierType` a su clave: mayúsculas o espacios (`PLATE ` → `plate`), alias (`CC`, `CE`, `cedula`, `cédula`, `dni` → `citizen_id`; `licencia`, `licence`, `driver_license` → `license`; `placa` → `plate`; `nit`, `tin` → `itin`) y el resto a `code`. `identifierValue` no cambia. Antes lo hacía `IdentifierTypeNormalizationRunner`; el script no deja audit log, el reporte lista cada valor corregido. |

Nunca borra una colección que no esté en `LEGACY_COLLECTIONS`. Las colecciones que no son ni
activas ni legacy se listan en `unknownCollections` para revisarlas a mano.

## 2. Procedimiento

```bash
export MONGO_URI="mongodb://<host>:27017/hanoit"

# 1. Backup (obligatorio antes de APPLY)
mongodump --uri "$MONGO_URI" --out "backup-hanoit-$(date +%Y%m%d-%H%M%S)"

# 2. Dry-run: solo cuenta, no cambia nada
mongosh "$MONGO_URI" scripts/mongo/drop-legacy-collections.js

# 3. Revisar el reporte (collections, fixes, unknownCollections) y aplicar
APPLY=true mongosh "$MONGO_URI" scripts/mongo/drop-legacy-collections.js

# 4. Reiniciar la API para que IndexInitializer recree los índices
```

Ejemplo de reporte en dry-run:

```json
{
  "database": "hanoit",
  "mode": "DRY-RUN",
  "collections": [ { "name": "driver", "documents": 12, "dropped": false } ],
  "fixes": {
    "tenantUnits": 3,
    "storedEnumCatalogs": 0,
    "retiredAuditActions": 1,
    "legacyPackageIndexes": [ "tenant_guide_unique_sparse" ],
    "identifierTypes": [ { "from": "CC", "to": "citizen_id", "users": 4 } ]
  },
  "unknownCollections": []
}
```

En modo `APPLY` los contadores de `fixes` son los documentos modificados o borrados.

## 3. Restaurar

```bash
mongorestore --uri "$MONGO_URI" --nsInclude 'hanoit.*' backup-hanoit-<fecha>/
```

## 4. Mantenimiento del script

`DropLegacyCollectionsScriptTest` falla si `ACTIVE_COLLECTIONS` deja de coincidir con las clases
`@Document`, si `LEGACY_COLLECTIONS` incluye una colección activa, si `ENUM_CATALOG_CODES` no coincide
con `EnumCatalogRegistry`, si una acción retirada vuelve a declararse en `AuditActions` o si
`IDENTIFIER_TYPE_KEYS` / `IDENTIFIER_TYPE_ALIASES` dejan de coincidir con el enum `IdentifierType`. Al crear una
colección nueva hay que añadirla a `ACTIVE_COLLECTIONS`.
