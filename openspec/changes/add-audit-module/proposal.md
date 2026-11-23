## Why

El gateway registra cada acción relevante de una empresa (altas, cambios, borrados, asignaciones de conductor, cambios de estado de paquetes, invitaciones...) y la expone en cuatro endpoints de solo lectura: `GET /audit-logs` (empresa), `/audit-logs/me` (actividad propia), `/audit-logs/admin` (todas las empresas, solo `super_admin`) y `/audit-logs/{id}`. La aplicación no usa ninguno: quien administra la empresa no puede responder a «¿quién cambió esto y cuándo?» sin pedirlo al equipo del gateway.

Los datos reales (fixtures `get__audit-logs*.json`) ya traen lo necesario para un módulo útil de verdad: acción, tipo e id de entidad, descripción, autor (correo y rol), IP, instante y un `changes` con el antes y el después. Pero crudos son difíciles de leer: descripciones a veces en inglés y a veces solo la clave de la acción (`invitation.created`), roles con mayúsculas distintas (`TENANT_ADMIN` y `tenant_admin`), autor sin correo, `changes` donde el antes y el después son iguales, ids hexadecimales por todas partes. El valor está en traducirlos, filtrarlos, resumirlos y enlazarlos a lo que cambió.

Se pidió que el módulo sea potente, no un listado más. Se planifica ahora y se implementa después.

## What Changes

- **Área «Auditoría»** (`/auditoria`, entrada nueva del menú), para administradores y agentes. Un solo listado con tres ámbitos según el rol: **Mi empresa** (`/audit-logs`, administradores), **Mi actividad** (`/audit-logs/me`, todos los que ven el área) y **Todas las empresas** (`/audit-logs/admin`, solo `super_admin`, con campo opcional de empresa).
- **Listado completo en el cliente** (`FullListState`, páginas de 100 hasta 1000): el gateway documenta un filtro solo en `/admin` (`tenantId`), así que la búsqueda, los filtros y los recuentos se hacen sobre todos los eventos traídos, con aviso cuando hay más de los traídos.
- **Filtros potentes y compartibles**: búsqueda libre, chips por tipo de entidad con recuento, rango de fechas (24 h, 7 días, 30 días, todo, personalizado), tipo de acción (creación, cambio, borrado, estado, asignación, otras), autor y «solo con cambios de valores». Todo el estado de los filtros vive en la URL (`/auditoria?entidad=package&desde=...`), de modo que una vista se comparte con un enlace.
- **Panel de actividad**: cifras (eventos, personas activas, entidad más tocada, último evento), gráfico de actividad por día —las barras filtran el listado— y reparto por tipo de acción. Todo calculado sobre lo que dejan los filtros, con alternativa en tabla para lectores de pantalla.
- **Lectura humana de cada evento**: acciones, entidades y roles en español (la clave si es desconocida), un resumen propio cuando la descripción del gateway es solo la clave, autor «sin identificar» cuando no hay correo, hora local con «hace 3 h» y la fecha exacta al enfocar.
- **Listado esencial y detalle en una modal**: la tabla y las tarjetas muestran solo qué se hizo, quién y cuándo, con un ojo en cada fila que abre la modal (`?evento=<id>`, enlazable; usa `GET /audit-logs/{id}` si el evento no está entre los traídos). La modal tiene cabecera con el color y el glifo del tipo de acción, la frase, tarjetas de quién (con avatar de iniciales), cuándo y sobre qué, la diferencia **antes → después** con flecha, una línea de tiempo con otros eventos de la misma entidad, enlace a la entidad afectada, «ver todos los eventos de esta entidad», copiado del enlace y del identificador, y los datos técnicos plegados.
- **Lectura para todos**: por defecto frases y nombres en español con los identificadores largos abreviados; «Mostrar datos técnicos» añade claves, identificadores e IP y abre el bloque técnico del detalle (claves, identificadores copiables, UTC, JSON).
- **Exportación a CSV** de lo filtrado (reutiliza `shared/data/csv.ts`, con protección de fórmulas).
- **Vista de tarjetas y de tabla** del listado, con densidad, atajo `/`, selección y pie de página, como el resto de listados.

## Capabilities

### New Capabilities
- `audit-management`: área `/auditoria`, ámbitos y permisos por rol, carga completa en el cliente, listado, búsqueda, filtros y estado en la URL, detalle con diferencia antes/después y enlaces a la entidad, etiquetas en español y exportación a CSV.
- `audit-insights`: panel de actividad sobre los eventos filtrados (cifras, actividad por día que filtra, reparto por tipo de acción) con alternativa accesible.

### Modified Capabilities
- `home-dashboard`: «Accesos según el rol» incorpora Auditoría a los accesos de administradores y agentes (el requisito de coherencia con el menú ya lo obliga).

## Impact

- **Código nuevo** en `ng-ruteando/src/app/features/audit/` (rutas, listado, detalle, panel, etiquetas, filtros, estadísticas, exportación) y `core/api/data/audit-logs.api.ts` + `core/api/models/audit-log.ts`, con sus `*.spec.ts` y los fixtures reales que ya existen en `src/testing/fixtures/gateway/`.
- **Cambios en código existente, mínimos y aditivos**: `app.routes.ts` (ruta diferida `auditoria`), `layout/nav-items.ts` (entrada con `OPERATIONS_ROLES`), y su prueba. `DataTableComponent` solo hace enlazables su búsqueda y su chip (dos `model()` con los mismos valores por defecto) y `statusTone` no cambia.
- **Sin dependencias nuevas**: los gráficos son barras CSS propias con tokens del tema; no se añade librería. Los estilos van en la hoja de cada componente (se cargan solo con Auditoría) y el bundle inicial no crece. Sin cambios en `server/` ni en el proxy.
- **Documentación**: `CLAUDE.md` (área nueva) y `.claude/skills/angular-ruteando/references/gateway-api.md` (auditoría deja de estar «fuera de alcance»).
- **Verificación contra el gateway real: pendiente** mientras siga caído (ver `project-verificar-con-gateway-real`); se prueba con el gateway simulado y los fixtures.

## Out of scope

- Línea de tiempo agrupada por día como tercera vista, escritura o borrado de eventos (el gateway solo los lee) y tiempo real (STOMP está fuera de alcance del proyecto).
- Filtros y orden en el servidor: solo se usan si el gateway real los acepta, lo que hoy no está documentado; se verifica al activarse el gateway y, si existen, es un cambio aparte.
- Retención de eventos más allá de los 1000 más recientes por ámbito.
- Botones «Ver historial» dentro de las pantallas de cada entidad (el módulo sí acepta el filtro `entidad`/`id` por URL para que se puedan añadir después sin tocarlo).
- Alertas, informes programados y notificaciones por correo.
