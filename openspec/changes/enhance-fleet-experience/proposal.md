# Proposal

> **Segunda fase.** La primera (paridad con la app AngularJS: capacidad de los tipos, documento del conductor, conservación de datos, listados completos, borrado en lote y CSV) se implementa en el change `complete-fleet-module`. Este change retiene el resto del plan: resumen, fichas, chips y columnas de relación, disponibilidad al asignar, zonas permitidas, historial y seguimiento. Antes de implementarlo hay que resincronizar sus deltas con lo que deje el primero (los requisitos de tipos y conductores ya no se modifican aquí).

## Why

La flota se construyó como una primera versión (change archivado `add-fleet-management`, 2026-10-22): tres CRUD (tipos de vehículo, vehículos y conductores) y la asignación de conductor. Revisada contra la API del gateway y contra la aplicación AngularJS anterior, **le faltan cosas que afectan al funcionamiento de la planificación y a la confianza de quien la administra**:

- **Los tipos de vehículo no pueden definir su capacidad.** `capacity`, `measure` y `restriction` se reenvían sin tocar porque no tenían contrato. Pero la jornada ya muestra el porcentaje de uso de peso y de volumen de cada ruta (`weightUsagePercent`, `volumeUsagePercent`) y el costo de combustible (`fuelCost`, que depende de `gasMileage`): sin capacidad ni consumo, esas cifras salen vacías. La app AngularJS sí los editaba (peso, volumen, alto × ancho × profundo, mínimos y máximos).
- **Editar puede borrar datos.** El formulario de vehículo no reenvía `allowedPackageTypes` ni `allowedZoneIds`, y el de conductor no reenvía `identifierType` ni `identifierValue`. Si el gateway sustituye en lugar de fusionar, guardar desde esta pantalla los borra sin avisar (el de lugares ya tuvo que reenviar `zoneId` por lo mismo).
- **La API da datos que la pantalla no enseña:** `active` y `default` de los vehículos, el dominio maestro `IdentifierType` (`citizen_id`, `itin`, `plate`, `code`) para el documento del conductor, las zonas permitidas de un vehículo y las posiciones de los conductores (`GET /positions`). La app anterior pedía número de identificación al conductor.
- **Los listados de tipos y conductores solo filtran la página cargada**, no hay selección ni borrado en lote (la app anterior lo tenía), ni exportación, ni forma de ver de un vistazo si la flota está lista para planificar (¿hay vehículos sin conductor? ¿tipos sin capacidad? ¿conductores sin vehículo?).

El gateway real está caído, así que el plan separa lo que se puede construir con contratos conocidos de lo que hay que comprobar antes de escribir en producción.

## What Changes

Se organiza en dos lotes, entregables por separado:

**Lote A — sin contratos nuevos (se puede construir y probar ya con fixtures y el gateway simulado)**
- **No perder datos al guardar**: vehículos y conductores reenvían lo que la pantalla no edita (`allowedPackageTypes`, `allowedZoneIds`, `identifierType`, `identifierValue`), con pruebas que fallan si se omiten.
- **Conductores**: documento de identidad (`identifierType` desde el dominio maestro, con etiquetas en español, + `identifierValue`), estado visible y vehículo asignado en el listado.
- **Listados completos**: tipos y conductores pasan a cargar todo en el cliente (como vehículos) para buscar, contar y filtrar sobre todo; chips por categoría, estado y «con / sin conductor»; columnas de relación (depósito, turno, estado, vehículo del conductor, capacidad del tipo).
- **Selección y borrado en lote** en los tres listados (una petición por registro, con informe de cuáles se borraron y cuáles no y por qué) y **exportación a CSV**.
- **Asignar conductor con criterio**: el selector avisa de quién ya conduce otro vehículo y de quién está inactivo.
- **Resumen de la flota** (`/flota/resumen`): cifras, «¿Está lista para planificar?» con una lista de comprobaciones que enlazan a donde se arregla cada cosa, y los elementos que piden atención.
- **Fichas**: la tabla sigue esencial y un ojo abre una modal con el detalle completo del vehículo, conductor o tipo (mismo patrón que Auditoría, `?vehiculo=`, `?conductor=`, `?tipo=`), con acciones rápidas y «Ver historial» hacia `/auditoria` filtrada por esa entidad.

**Lote B — depende de comprobar el gateway real (fase 0 del plan)**
- **Tipos de vehículo completos**: capacidad (peso y volumen), medidas (alto × ancho × profundidad, con el volumen calculado), restricciones de carga (mínimos y máximos coherentes) y unidad del consumo, con vista previa «Así quedará». Las claves y unidades salen de una hipótesis basada en la app AngularJS que **no se escribe en producción hasta verificarla**; los objetos se fusionan, nunca se reemplazan, para no perder claves desconocidas.
- **Restricciones de un vehículo**: zonas permitidas (y tipos de paquete permitidos si el dominio de valores existe).
- **Seguimiento** (`/flota/mapa`): últimas posiciones de los conductores en el mapa, con sondeo periódico, y la posición en la ficha del vehículo. Condicionado a que exista quien publique posiciones (`POST /driver/positions` es del rol conductor, que hoy no tiene pantallas).

**Fuera de alcance, con motivo** (ver `design.md`): `assigned-services` (redundante con jornadas y rutas y sin contrato), los endpoints `/driver/*` (son de la aplicación del conductor, otro módulo), invitaciones de usuarios (necesitan una pantalla de aceptación que no existe) y el número de licencia de conducir de la app anterior (la API no tiene ese campo).

## Capabilities

### New Capabilities
- `fleet-overview`: resumen de la flota, preparación para planificar y elementos que requieren atención.
- `fleet-tracking`: mapa de las últimas posiciones de los conductores y posición en la ficha del vehículo (lote B, condicionado).

### Modified Capabilities
- `fleet-management`: tipos con capacidad, medidas y restricciones; conductores con documento de identidad y vehículo; conservación de los datos no editados; listados completos con chips y columnas de relación; selección y borrado en lote; exportación a CSV; asignación con disponibilidad; restricciones de zona de un vehículo; fichas y enlace al historial.

## Impact

- **Código**: `ng-ruteando/src/app/features/fleet/**` (formularios, listados, resumen, fichas, mapa), `core/api/data/positions.api.ts` y modelos nuevos, `layout/nav-items.ts` (entradas de búsqueda «Resumen de flota» y «Mapa de flota») y sus pruebas. Sin cambios en `server/`.
- **Compartido**: se espera reutilizar `FullListState`, `DataTableComponent` (selección, chips, tarjetas), `shared/data/csv.ts`, el patrón de modal ligada a la URL de Auditoría y `shared/map/`. Cualquier cambio en código compartido conserva el comportamiento actual (con pruebas).
- **Dependencias**: ninguna nueva (sin librería de gráficos ni de PDF; la exportación es CSV).
- **Bundle**: todo diferido; el inicial (492,8 kB de 500) no debe crecer. Estilos por componente (< 2 kB) con `ViewEncapsulation.None`, nunca en `styles.scss`.
- **Pruebas y herramientas**: fixtures reales intactos; los datos hipotéticos (capacidad, posiciones con datos) viven en helpers de prueba marcados como tales. El gateway simulado (fuera del repo) se amplía con capacidad, zonas, posiciones y borrados en uso.
- **Documentación**: `CLAUDE.md`, `references/gateway-api.md` (sección Flota) y el spec `fleet-management` al archivar.
- **Riesgos**: contratos no verificados (capacidad, unidades, escritura de `active`/`default`, estado HTTP de borrados en uso, posiciones con datos) → fase 0 con protocolo de comprobación; las pestañas nuevas pueden desbordar a 320 px → se mide en el banco visual.
- **Sin gateway real**: la fase 0 necesita la sesión de la persona (no se introducen contraseñas desde aquí); lo no verificado queda declarado como pendiente, no afirmado.
