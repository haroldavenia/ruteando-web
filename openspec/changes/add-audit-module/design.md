## Context

Lo que hay hoy, observado en el código y en los fixtures reales (`get__audit-logs*.json`, capturados el 2026-10-11):

- **Endpoints** (colección Postman, mismo origen que los fixtures): `GET /audit-logs` (acceso `TENANT_ADMIN`), `GET /audit-logs/me` (cualquier sesión), `GET /audit-logs/admin?tenantId=` (`SUPER_ADMIN`) y `GET /audit-logs/{id}` (`TENANT_ADMIN`). Los tres listados paginan. No hay ningún otro parámetro documentado: ni filtro, ni orden, ni rango de fechas.
- **Forma de la página**: `{ size, number, totalElements, totalPages, content }`. Ojo: aquí la página se llama `number`, no `page` como en `Page<T>` (`places`, `journeys`...). Hoy el repo tipa `Page<T>` con `page`; `FullListState` solo usa `content` y `totalElements`, pero el modelo debe decir la verdad.
- **Forma del evento**: `id, action, entityType, entityId, description, actorEmail|null, actorRole, changes|null, createdAt, ipAddress` (esta última falta en `/me`). Los eventos vienen del más reciente al más antiguo.
- **Suciedad de los datos reales** (que la interfaz debe absorber): `actorRole` como `TENANT_ADMIN`, `tenant_admin` y `anonymous`; `actorEmail` nulo en la mayoría de eventos de acciones autenticadas; `description` mezclando español, inglés y solo la clave (`invitation.created`); `changes.before` y `changes.after` idénticos en `settings.update`, `resource.update` y `place.update`; `""` y `null` para «sin valor» (`driverId`); acciones sin entidad en pantalla (`user`, `invitation`, `tenant`, `notification`).
- **Patrones que ya existen y se reutilizan**: `FullListState` (carga completa hasta 1000), `DataTableComponent` (búsqueda con `/`, chips `facet` con recuento, densidad, tarjetas `#card`, selección, esqueleto, apilado en pantallas estrechas) y su `filtered()` público (lo usa Lugares para su mapa), `RecordLoader` (cargar un registro), `StatusBadgeComponent`, `normalizeText`, `shared/data/csv.ts` (`toCsv`, `downloadCsv` con protección de fórmulas), `formatRelativeTime`/`formatDateTime`, `roleLabel`, `ADMIN_ROLES`/`OPERATIONS_ROLES`, `nav-items.ts` y la búsqueda global que lo consume.
- **Restricciones del proyecto**: sin librerías nuevas, OnPush y signals, SSR seguro, CSP `script-src 'self'`, bundle inicial sin `core/api/data/*`, todo botón de solo icono con `title`, tablas que se apilan, colores solo por tokens, estilos de componente pequeños (2 kB aviso).
- **Gateway real caído**: todo se construye contra el gateway simulado (`qa-visual/mock-gateway.mjs`) y los fixtures; lo que dependa del comportamiento real queda declarado como pendiente.

Motivación y alcance: ver `proposal.md`. Requisitos: `specs/audit-management` y `specs/audit-insights`.

## Goals / Non-Goals

**Goals:**
- Un solo módulo que use los cuatro endpoints y todos los roles que el gateway permite, sin pantallas rotas para ningún rol.
- Que el filtrado, el recuento y el panel sean exactos sobre todo lo traído, con una única fuente de verdad de filtros (la URL).
- Que la lógica nueva (clasificación, resumen, diferencias, filtros, estadísticas, CSV) sea **pura y se pruebe sin `TestBed`**; los componentes solo la pintan.
- Cero cambios de comportamiento en `DataTableComponent` (solo se hacen enlazables su búsqueda y su chip), `statusTone`, `ListState` y el resto de pantallas.

**Non-Goals:**
- No se inventan filtros ni orden del lado del servidor: el gateway no los documenta (ver Riesgos).
- No hay librería de gráficos ni editor de fechas externo: SVG propio y `<input type="date">` nativo.
- No se cambia el rol que decide qué endpoint puede llamar quién: lo manda el gateway; la interfaz solo ofrece lo que el rol puede pedir.

## Decisions

### D1. Carga completa y filtrado en el cliente, con tope de 1000
**Decisión**: `AuditStore` (servicio de la pantalla, no `providedIn: 'root'`) usa un `FullListState<AuditLog>` por ámbito y nunca pide filtros al servidor.
**Por qué**: el gateway no documenta filtros (solo `tenantId` en `/admin`); los recuentos de los chips y del panel solo son ciertos con todos los eventos; la persona ya aceptó este modelo para paquetes, jornadas, vehículos y lugares. Los eventos vienen del más reciente al más antiguo, así que el tope de 1000 conserva lo más reciente, que es lo que importa en auditoría.
**Alternativas**: paginar del servidor y filtrar «esta página» (recuentos falsos, mal para auditar); probar parámetros `action=`/`from=` a ciegas (si el gateway los ignora devuelve datos sin filtrar sin avisar: peor que no tenerlos).
**Orden**: tras cargar se ordena por `createdAt` descendente en el cliente (barato con ≤1000, y no depende de que el gateway lo haga siempre), igual que `fetchLatestJourneys`.

### D2. Estado de los filtros en la URL, como única fuente de verdad
**Decisión**: una función pura `parseAuditQuery(params)` → `AuditFilters` y su inversa `toQueryParams(filters)`. El componente de la pantalla lee `ActivatedRoute.queryParamMap` como signal (`toSignal`) y deriva todo de ahí con `computed`; cada control navega con `router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: <búsqueda de texto> })`. Parámetros: `ambito` (`empresa|mia|todas`), `empresa` (tenantId), `q`, `entidad`, `accion` (`creacion|modificacion|eliminacion|estado|asignacion|otras`), `persona` (correo o `_sin`), `rango` (`24h|7d|30d|todo`) o `desde`/`hasta` (`AAAA-MM-DD`), `cambios=1`, `id` (entityId).
**Por qué**: enlaces compartibles, atrás/adelante gratis, y habilita «Ver historial» desde otras pantallas más adelante sin tocar este módulo. Una sola fuente evita el patrón de dos estados sincronizados a mano.
**Detalles**: valores inválidos se ignoran en `parseAuditQuery` (nunca lanzan); la búsqueda de texto usa `replaceUrl: true` para no llenar el historial de una entrada por tecla y se retrasa ~250 ms; el rango por defecto es `todo`.
**Alternativa**: estado en signals locales y URL solo «al compartir» (más simple, pero se pierde con recargar y no sirve para enlazar desde fuera).

### D3. Cómo se combinan `DataTableComponent` y los filtros propios
**Decisión**: la tabla sigue siendo `DataTableComponent` (búsqueda `/`, chips `facet` por tipo de entidad, densidad, tarjetas, selección, paginación, apilado). Los filtros que la tabla no tiene (rango, tipo de acción, persona, solo con cambios, id de entidad) se aplican **antes**, con `applyAuditFilters(rows, filters, now)` (pura), y el resultado se entrega a la tabla mediante un `ListState` derivado (`AuditViewState extends ListState`, con `clientSide = true`): no pide nada por su cuenta, solo copia al construirse y con un `effect` las `rows`, el `status` y el `error` ya filtrados del almacén, y su `reload()` delega en el almacén. Si hay eventos pero los filtros no dejan ninguno, conserva el estado `ready` para que la tabla muestre «No hay resultados» y no «Todavía no hay eventos».
**Para que la búsqueda y el chip de la tabla también cuenten en el panel**: la pantalla toma `viewChild(DataTableComponent).filtered()` (el mismo mecanismo que Lugares para su mapa) como el conjunto «visible» y de ahí salen el panel, la exportación y el recuento anunciado.
**Único cambio al componente compartido** (aditivo, sin cambiar su comportamiento): la búsqueda (`filter`) y el chip elegido (`facetKey`) de `DataTableComponent` pasan de señales internas a `model()` con los mismos valores por defecto, así que se pueden enlazar con `[(filter)]` y `[(facetKey)]` y llevar a la dirección de la página; sin enlazar funcionan como siempre y sus 391 pruebas siguen pasando. **Por qué**: se hereda todo el trabajo de responsive, densidad y accesibilidad ya medido, y la búsqueda y el chip entran en la dirección sin duplicar la tabla.
**Problema conocido y su solución**: el botón «Limpiar búsqueda» de «No hay resultados» limpia solo la búsqueda y el chip internos, no los filtros nuevos. La pantalla pone su propio «Limpiar filtros» en la barra de filtros (visible cuando hay alguno activo) y el mensaje vacío de la tabla sigue siendo correcto. No se modifica la tabla para esto.
**Alternativa descartada**: añadir a `DataTable` un `externalFilters` (más invasivo); el «Limpiar filtros» propio resultó suficiente.

### D4. Lógica pura separada de los componentes
Ficheros de `features/audit/`, cada uno con su `*.spec.ts` y sin dependencias de Angular salvo donde se dice:

| Fichero | Contenido |
|---|---|
| `audit-labels.ts` | `auditActionLabel`, `auditEntityLabel`, `auditKind(action)` (`creacion/modificacion/eliminacion/estado/asignacion/otras`), `auditKindLabel`, `auditKindTone` (→ `StatusTone`), `auditKindIcon`, `auditSummary(log)`, `auditActor(log)`, `normalizeRole(role)`. Devuelven la clave si no conocen el valor. |
| `audit-filters.ts` | `AuditFilters`, `EMPTY_FILTERS`, `parseAuditQuery`, `toQueryParams`, `applyAuditFilters`, `hasActiveFilters`, `rangeBounds(range, now)`. Días en hora local. |
| `audit-diff.ts` | `diffChanges(changes)` → filas `{ field, before, after, changed }` ordenadas con los cambiados primero; `displayValue(v)` (`""`/`null` → «(vacío)», objetos → JSON compacto); `hasValueChanges(changes)`. |
| `audit-stats.ts` | `summarize(rows)` (cifras), `activityByDay(rows, range, now)` (con días vacíos y agrupación semanal si >60 días), `kindShares(rows)`. |
| `audit-links.ts` | `entityLink(log)` → ruta o `null` (por tipo de entidad y sin enlaces para acciones de eliminación). |
| `audit-export.ts` | `auditToCsv(rows)` (la IP solo si algún evento la trae) y `auditCsvFileName`. |
| `audit-format.ts` | Fechas largas, UTC, días y números en español. |
| `audit-scopes.ts` | `scopesFor(role)`, `resolveScope`. |
| `audit-clipboard.ts` | `copyToClipboard` con aviso y, si falla, el texto en el aviso. |
| `audit-memory.ts` | `AuditMemory`: el evento abierto y la vista del listado, solo en memoria. |

Tabla de clasificación de `auditKind` (decidida por el último verbo reconocido de la clave, de derecha a izquierda): `create|created` → Creación · `update|updated` → Modificación · `delete|deleted|revoked` → Eliminación · `status.change` → Estado · `assign|unassign` → Asignación · el resto → Otras. Tonos: Creación `success`, Modificación `info`, Eliminación `danger`, Estado `warning`, Asignación `info`, Otras `neutral`. `auditKindTone` vive en `audit-labels.ts`, no en `status-tone.ts`: así no se toca un fichero compartido con su suite.

Mapa de enlaces de `entityLink`: `package → /paquetes/:id`, `place → /lugares/:id`, `settings → /configuraciones/:id`, `journey → /jornadas/:id`, `resource → /flota/vehiculos/:id`, `zone → /zonas/:id`; `resource_type → /flota/tipos/:id` solo si el fixture o el gateway simulado confirma ese nombre (se deja como tarea de verificación). `user`, `invitation`, `tenant` y `notification` no enlazan. Una acción de eliminación nunca enlaza. Los permisos de destino los siguen dando las guardas de cada ruta (un agente no llega a `/lugares`): el enlace se oculta si el rol no puede abrir el destino (se reutiliza la lista de roles del menú).

### D5. El detalle es una modal que sigue a la dirección (`?evento=`)
**Decisión**: no hay ruta de detalle. El ojo de cada fila (y la tarjeta) pone `evento=<id>` en la dirección; `AuditListComponent` observa `query().event` y, cuando el listado deja de cargar, abre `AuditDetailDialogComponent` con el evento que ya tiene (o solo su `id`, y la modal lo pide con `AuditLogsApi.get(id)` mediante `RecordLoader`). Cerrarla con el botón o Escape quita el parámetro: con `Location.back()` si la dirección se empujó al abrirla (así el historial queda como estaba) o reemplazándola si se llegó con un enlace; «atrás» del navegador cambia la dirección y el efecto cierra la modal. **Trampa resuelta**: Material cierra la modal por su cuenta ante un cambio de ubicación (`closeOnNavigation`) antes de que el router actualice la dirección, y el cierre pedía entonces otro «atrás»; se desactiva y solo la dirección manda. «Ver eventos de esta entidad» y saltar a otro evento de la línea de tiempo cierran la modal con un resultado que el listado traduce en parámetros (`id=` o `evento=`, este último reemplazando la entrada).
**Por qué**: se ve el contexto (filtros, resumen y tabla) mientras se lee el detalle, funciona en móvil, el enlace sigue siendo compartible y la modal se carga bajo demanda (`import()` al abrir el primer evento: el chunk del listado queda en 45 kB y el de la modal aparte). **Qué se descartó**: una ruta `/auditoria/:id` (cambia de pantalla y pierde el contexto) y `AuditMemory`/`history.state` (ya no hacen falta: la modal recibe el evento del listado). El cuarto endpoint sigue en uso: es el que pide la modal cuando el evento no está entre los traídos.

### D6. Ámbitos y qué endpoint llama cada uno
`AuditLogsApi` (`core/api/data/audit-logs.api.ts`, `providedIn: 'root'`): `list(params)` → `/audit-logs`, `listMine(params)` → `/audit-logs/me`, `listAll(params, tenantId?)` → `/audit-logs/admin` (con `tenantId` solo si se escribió), `get(id)` → `/audit-logs/{id}`. Cada método normaliza `number` a `page` para devolver `Page<AuditLog>`. Un ámbito se define como `{ id, label, fetch }` y `scopesFor(role)` devuelve los disponibles; el primero es el por defecto.
**`super_admin` no ve «Mi empresa»**: `/audit-logs` exige `TENANT_ADMIN` según la colección y no se sabe si `super_admin` también pasa; `/admin` con `tenantId` ya cubre limitar a una empresa. **Asunción** a verificar con el gateway real.
**`tenantId` en `/admin`**: se manda solo si la persona lo escribe (la colección lo trae siempre; si el gateway real lo exige, el 400 se muestra con el mensaje genérico y el campo marcado como obligatorio en una iteración posterior).

### D7. Panel de actividad con gráficos propios, filtrable y accesible
`ActivityPanelComponent` (cabecera plegable y cuatro cifras) compone dos gráficos que son componentes propios: `ActivityBarsComponent` (eventos por día o por semana) y `ActivitySharesComponent` (reparto por tipo de acción). Cada uno recibe los eventos visibles y avisa de lo elegido (`dayPicked`, `kindPicked`); la pantalla escribe el filtro. El gráfico de barras es una rejilla CSS de columnas (sin medir en JS, sin `window`, seguro en SSR) donde cada columna es un `<button>` cuya altura sale de `activityByDay`; con 14 barras o menos lleva el número encima. Color por tokens (`--mat-sys-primary` para las barras, los `--app-*` de las etiquetas de estado para los tipos), nunca hex; el día de hoy, que no ha terminado, va rayado y no solo de otro color. Cada gráfico trae su resumen en texto y una tabla con los mismos datos y un botón «Ver solo» por fila (así cada día es elegible con 44 px aunque la barra sea estrecha). El panel se pliega con la preferencia `ruteando-audit-panel` (`readPref`/`writePref`, a prueba de SSR y de almacenamiento bloqueado).
**Por qué no una librería** (Chart.js, ngx-charts): +100–300 kB al bundle diferido, estilos propios contra la CSP y peor accesibilidad que una tabla propia; aquí hay dos gráficos simples.
**Por qué columnas CSS y no SVG interactivo**: foco, `title` y clic de un `<button>` real funcionan con teclado y lector sin ARIA a mano, y se apilan bien a 320 px. **Por qué tres componentes**: cada hoja de estilos queda bajo el presupuesto de 2 kB (ver D12).

### D8. Exportación
`auditToCsv(rows, { withIp })` usa `toCsv` de `shared/data/csv.ts`. Columnas: Instante (UTC ISO), Acción, Tipo de acción, Entidad, Identificador, Persona, Rol, Resumen, IP (solo si algún evento la trae), Cambios (`campo: antes → después; …` solo de los campos que cambiaron). Se exportan las filas de `filtered()` (todas, no la página) o las seleccionadas. Nombre del archivo `auditoria-AAAA-MM-DD.csv`. Reutiliza `downloadCsv`, así que no hace nada en SSR.

### D9. Rutas, menú y permisos
- `app.routes.ts`: `auditoria` con `roleGuard(OPERATIONS_ROLES)` en `canActivate` y `canActivateChild`, `loadChildren` hacia `AUDIT_ROUTES` (`''` → listado, `':id'` → detalle).
- `nav-items.ts`: `{ label: 'Auditoría', icon: 'history', link: '/auditoria', roles: OPERATIONS_ROLES }` al final (después de Configuraciones). `short: 'Auditoría'` cabe en el riel. Inicio y la búsqueda global lo toman de ahí sin cambios. La prueba de `nav-items` se ajusta.
- El destino «Mi actividad» para `agent` es coherente: `OPERATIONS_ROLES` ya excluye al conductor, como Paquetes y Jornadas.

### D10. Seguridad y privacidad
- Todo texto del gateway (descripción, correo, valores de `changes`) se interpola con `{{ }}` de Angular o `textContent`; nunca `[innerHTML]` ni `bypassSecurityTrust*`. Hay una prueba con `<img src=x onerror=…>` en una descripción.
- `changes` puede traer datos de negocio (nombres, direcciones). Se muestran solo a quienes el gateway ya se los entrega; no se guardan en `localStorage` ni en la URL (la URL lleva filtros, nunca valores de eventos) y el `state` de navegación solo vive en memoria del historial.
- La IP solo se muestra donde el ámbito la entrega.
- El módulo no escribe nada: no hay formularios, ni `POST`/`PUT`/`DELETE`.
- Ningún secreto nuevo; el proxy `/gateway` ya añade `X-Api-Key`.

### D11. Pruebas
- Lógica pura: tabla de casos con las 20 acciones reales de los fixtures, roles `TENANT_ADMIN`/`tenant_admin`/`anonymous`, `changes` nulo/idéntico/con cambios, rangos con cambio de hora local, `parseAuditQuery` con basura.
- Servicio: `AuditLogsApi` con `setupApi`/`respondWith` y los cuatro fixtures reales (incluida la normalización `number`→`page` y que `/me` no trae IP), con `expectSameContract` del modelo.
- Componentes: listado (columnas, chips, filtros que cambian la URL, «Limpiar filtros», vacío, error 403 con ofrecimiento de «Mi actividad», truncado a 1000), detalle (desde `state`, directo con 404/403, diff, enlace/sin enlace), panel (cifras, barras, elegir día, alternativa en tabla), exportación y guarda de rol.
- Banco visual: el gateway simulado (`qa-visual/mock-gateway.mjs`) gana los cuatro endpoints con ~120 eventos ficticios (varios días, roles, acciones, algunos sin correo, uno con HTML en la descripción) y la suite `scroll` pasa a incluir `/auditoria` y un detalle, 13 anchos, claro y oscuro, texto al 200 %.

### D12. Estilos en la hoja de cada componente, no en la global
**Decisión**: cada componente del módulo lleva su `*.component.scss` con `encapsulation: ViewEncapsulation.None` (las clases `audit-*` son suyas y los tokens del tema los hereda), y no se añade nada a `styles.scss`. **Por qué**: una primera versión con un parcial global (`_audit.scss`, ~9,8 kB) subió la hoja inicial de 32,8 a 42,5 kB y el bundle inicial a 502,5 kB, por encima del presupuesto de 500 kB; con las hojas por componente el inicial queda en 492,8 kB (+0,1 kB, el menú) y los estilos solo se cargan al abrir Auditoría. **Consecuencia**: ninguna hoja pasa de 2 kB (el aviso del presupuesto de estilos de componente), lo que obligó a repartir el panel en `ActivityBars` y `ActivityShares`, la tarjeta de evento en `AuditEventCard`, y la modal en `AuditDetailHead`, `AuditFacts`, `AuditChanges`, `AuditRelated` y `AuditTech` (D14).
**Alternativas**: subir el presupuesto (se prefirió no tocar la configuración de compilación sin pedirlo), o encapsulación emulada (los selectores crecen con los atributos `_ngcontent` y el presupuesto se pasaría antes).

### D14. La modal por piezas
`AuditDetailDialogComponent` (cabecera, frase, acciones, estados de carga y error) compone `AuditDetailHeadComponent` (glifo grande, tipo, título, hace cuánto y cerrar), `AuditFactsComponent` (tarjetas de quién con avatar de iniciales, cuándo, sobre qué e IP), `AuditChangesComponent` (antes → después con flecha y tonos de error y éxito, apilado bajo 560 px), `AuditRelatedComponent` (línea de tiempo de la misma entidad, cinco como máximo, tomada de lo que el listado ya tiene mediante la función `related` que recibe la modal) y `AuditTechComponent`. El tono (`--tone-bg`/`--tone-fg`) se fija una vez en el elemento raíz de la modal (`data-tone`) y lo heredan la cabecera y la frase. `actorInitials` (puro) arma las iniciales del avatar.

### D13. Que se lea bien sin ser técnico, y que lo técnico esté a un clic
Dos formas de leer lo mismo, elegidas con «Mostrar datos técnicos» (preferencia `ruteando-audit-tech`, solo de presentación, sin filtrar nada). **Por defecto**: la tabla y las tarjetas llevan solo lo esencial (acción, quién y cuándo), acciones y tipos de entidad en español, «Sin identificar»/«Anónimo» en lugar de un hueco y una frase de introducción que explica qué se ve; en la modal, la frase solo si dice algo que la etiqueta no dice y con los identificadores largos abreviados a `#cola` (`humanizeIds`). **Con datos técnicos**: la tabla añade la columna «Clave» y las tarjetas la clave; la modal abre el bloque «Datos técnicos» (claves, identificadores copiables, instante UTC, descripción original y JSON). En «Mi actividad» no hay filtro de persona ni cifra de personas, porque todo es de la misma persona. La exportación a CSV siempre lleva claves e identificadores completos (es para cruzar con otros sistemas).

## Risks / Trade-offs

- **Los filtros del servidor no existen o no están documentados** → todo se hace en el cliente con tope de 1000; el aviso «Se muestran los 1 000 más recientes de N» es explícito y el panel y los recuentos hablan solo de lo traído. Al activarse el gateway real se prueba si acepta `page`/`size` más grandes o filtros; si los acepta, es un change aparte.
- **`/audit-logs` para `super_admin`** → no verificado; no se ofrece «Mi empresa» al `super_admin` (D6). Si resulta que sí pasa, se añade el ámbito sin tocar lo demás.
- **`tenantId` obligatorio u opcional en `/admin`** → no verificado; se manda solo si se escribió y el error del gateway llega como mensaje en español con «Reintentar».
- **Descripciones del gateway mezcladas en inglés** (`Journey eliminado: name=…`) → se muestran tal cual salvo que sean solo la clave; no se «traducen» fragmentos para no inventar texto. El resumen propio cubre las acciones sin descripción y el detalle muestra la descripción original aparte.
- **Ids hexadecimales largos** → se abrevian a los 8 últimos caracteres en la tabla (con el completo en `title` y en el detalle); no se resuelven a nombres: no hay recurso para eso y N peticiones por fila serían caras. Se deja el enlace a la entidad cuando existe.
- **Agentes y el cuarto endpoint** → 403 al recargar un detalle (D5); mensaje claro y vuelta al listado.
- **Peso** → el módulo va en un chunk diferido (44,8 kB sin comprimir, 12,2 kB comprimido) y sin dependencias; los estilos van con cada componente (D12) para no engordar el bundle inicial.
- **Zona horaria** → los días se cuentan en la hora local del navegador; dos personas en husos distintos ven el mismo evento en días distintos. El detalle muestra también la hora en UTC.
- **Evento inexistente tras borrar la entidad** → el enlace a la entidad se oculta en eliminaciones, pero una entidad borrada por otra vía llevaría a la pantalla de «no encontrado» de su propio módulo (ya manejada con `RecordLoader`).

## Open Questions

- ¿El agente debería ver «Auditoría» en el menú o es solo para administradores? Se planificó para `OPERATIONS_ROLES` (el agente solo ve su actividad); restringirlo a `ADMIN_ROLES` cambia una constante y un escenario de `home-dashboard`, no el resto.
- ¿Dónde se añadirán los botones «Ver historial» en cada entidad? Fuera de este change; el módulo ya acepta `?id=` y `?entidad=`.
- ¿Conviene un aviso cuando el último evento tenga más de N días (empresa sin actividad)? No cambia specs ni tareas; se decide con datos reales.
