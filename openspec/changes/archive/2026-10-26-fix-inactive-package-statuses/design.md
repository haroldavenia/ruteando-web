# Design

## Context

Ver proposal.md (Why). Estado observado en el código:

- `MasterDomainsService.values(code)` devuelve todos los valores del dominio, activos o no, y `MasterDomainValue` ya trae `active`. Los valores por defecto (`MASTER_DOMAIN_DEFAULTS`) marcan todo como activo y para `PackageStatus` incluyen `returned`.
- `package-list.component.ts` y `route-visits.component.ts` construyen su lista de estados con `values('PackageStatus')` y, si está vacía, con `DEFAULT_PACKAGE_STATUSES`, que sale de las claves de `PACKAGE_STATUS_LABELS` (incluye `returned`).
- `route-visits.component.ts` usa la misma lista para el filtro por estado.
- `packageStatusLabel` resuelve la etiqueta por la tabla `PACKAGE_STATUS_LABELS`; una clave desconocida se muestra tal cual.
- Observado en el gateway real: activos `pending`, `attended`, `unattended`, `cancelled`; inactivos `returned` y `demo_…`.

## Goals / Non-Goals

**Goals:**
- No ofrecer como destino un estado que el gateway rechaza.
- No perder de vista los paquetes que ya tienen un estado inactivo.

**Non-Goals:**
- No se cambia el contrato con el gateway ni se traducen sus mensajes de error (siguen en inglés cuando el gateway los envía).
- No se revisan otros dominios sin comprobarlos en el gateway real.
- No se tocan las etiquetas: `returned` conserva «Devuelto» para mostrar paquetes existentes.

## Decisions

1. **`activeValues(code)` en `MasterDomainsService`**, con el mismo orden que `values()`, en lugar de filtrar `active` en cada pantalla. Alternativa: cambiar `values()` para devolver solo activos; descartada porque otros usos (mostrar la etiqueta de un valor ya guardado) necesitan los inactivos.
2. **Los valores por defecto de `PackageStatus` dejan de incluir `returned`** (`pending`, `attended`, `unattended`, `cancelled`), y `DEFAULT_PACKAGE_STATUSES` pasa a ser esa misma lista y no las claves de las etiquetas. Es lo que ocurre en el gateway real y evita ofrecer `returned` antes de que cargue el catálogo. Alternativa: marcarlo inactivo en los valores por defecto; descartada por ser un valor que en realidad no forma parte del catálogo activo.
3. **El menú de estados excluye también el estado actual** (como hoy) y ahora solo parte de los activos.
4. **Filtro por estado de las visitas = activos ∪ estados presentes en las visitas cargadas.** Así una visita con `returned` se puede encontrar, aunque `returned` no se pueda elegir como destino. Se calcula con un `computed` que depende de las visitas, sin pedir nada nuevo.
5. **Sin cambios de comportamiento para claves desconocidas:** si un paquete trae una clave que no está en el catálogo ni en las etiquetas, se muestra la clave tal cual, como ya ocurre.

## Risks / Trade-offs

- [El catálogo real cambia y un valor activo deja de serlo] → `activeValues` se calcula a partir del catálogo cargado, no de una lista fija; sin catálogo se usan los cuatro valores por defecto.
- [El catálogo no carga (sin red)] → se usan los cuatro valores por defecto; si el gateway rechaza alguno, el error ya se muestra con el mensaje del gateway.
- [Otros dominios con valores inactivos siguen mal] → queda anotado como comprobación pendiente en `gateway-api.md` y no se toca sin evidencia.
- [El filtro de una ruta muestra un estado que no se puede elegir como destino] → es intencionado y está en la spec (escenario «Estado inactivo presente en la ruta»).
