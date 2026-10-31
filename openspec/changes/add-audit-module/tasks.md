# Tasks

Todas las rutas son relativas a `ng-ruteando/src/app/` salvo que se diga otra cosa. Cada fichero nuevo lleva su `*.spec.ts` al lado; la comprobación de cada tarea se hace con `npm --prefix ng-ruteando run test:ci` (o la prueba nombrada) salvo que diga otra cosa. Los datos de prueba salen de los fixtures reales `get__audit-logs*.json`.

## 1. Preparación
- [x] 1.1 Crear la rama `feat/add-audit-module` desde `main` actualizada y comprobar `git config user.name` (debe ser `HectorCorredor9`); verificar con `git status` limpio y la rama activa
- [x] 1.2 Leer una vez más `get__audit-logs*.json` y anotar en el spec de modelos cualquier campo que el diseño no recoja; verificar que `models.spec.ts` del proyecto sigue pasando sin cambios

## 2. Datos y API
- [x] 2.1 Modelo `core/api/models/audit-log.ts` (`AuditLog`, `AuditChanges`, `AuditLogPage`) reexportado en `models/index.ts`; verificar con `expectSameContract` contra los cuatro fixtures (incluido que `/me` no trae `ipAddress` y que `changes` puede ser `null`)
- [x] 2.2 `core/api/data/audit-logs.api.ts` (`list`, `listMine`, `listAll(params, tenantId?)`, `get`) que normaliza `number` → `page` para devolver `Page<AuditLog>`; verificar con `audit-logs.api.spec.ts` (URL de cada método, `tenantId` solo si se pasa, parámetros `page`/`size`, id codificado en la URL)
- [x] 2.3 Comprobar que el bundle inicial no importa `core/api/data/audit-logs.api.ts` (compilar y revisar que solo aparece en el chunk diferido de auditoría)
- [x] 2.4 Añadir los cuatro endpoints al gateway simulado `qa-visual/mock-gateway.mjs` con ~120 eventos ficticios (varios días y horas, roles `TENANT_ADMIN`/`tenant_admin`/`anonymous`, autor sin correo, `changes` nulo, idéntico y con cambios, y una descripción con `<img src=x onerror=alert(1)>`); verificar con `curl` a los cuatro caminos y que paginan a 100

## 3. Lógica pura
- [x] 3.1 `features/audit/audit-labels.ts`: etiquetas de acción y entidad, `auditKind`, tono, glifo, `auditSummary`, `auditActor`, `normalizeRole`, clave tal cual si es desconocida; verificar con un caso por cada una de las 20 acciones reales de los fixtures y por cada escenario de «Clasificación de las acciones»
- [x] 3.2 `features/audit/audit-diff.ts` (`diffChanges`, `displayValue`, `hasValueChanges`); verificar con casos: `null`, antes = después, un campo cambiado, `""` y `null` como «(vacío)», objetos y listas como JSON, campos solo en uno de los lados
- [x] 3.3 `features/audit/audit-filters.ts` (`AuditFilters`, `parseAuditQuery`, `toQueryParams`, `applyAuditFilters`, `rangeBounds`, `hasActiveFilters`); verificar con casos de rango rápido y personalizado (inicio > fin, días inclusivos en hora local, cambio de hora), «Sin identificar», solo con cambios, id de entidad, parámetros inválidos ignorados, ida y vuelta `toQueryParams(parseAuditQuery(x))`
- [x] 3.4 `features/audit/audit-stats.ts` (`summarize`, `activityByDay` con días vacíos y agrupación semanal, `kindShares`); verificar con los fixtures (26 eventos, 18 acciones distintas) y con listas vacías
- [x] 3.5 `features/audit/audit-links.ts` (`entityLink`) y su filtro por rol de destino; verificar que `journey.delete` no enlaza, que `user`/`invitation`/`tenant`/`notification` no enlazan y que `package`, `place`, `settings`, `journey`, `resource` y `zone` sí, con el id codificado
- [x] 3.6 `features/audit/audit-export.ts` (`auditToCsv`); verificar columnas, IP solo si algún evento la trae, `Cambios` solo con los campos que cambian y protección de fórmulas (`=`, `+`, `-`, `@`)

## 4. Almacén, ámbitos y estado de la tabla
- [x] 4.1 `features/audit/audit-scopes.ts` (`scopesFor(role)`, ámbito por defecto, validación de un ámbito pedido); verificar los escenarios de «Ámbitos de consulta según el rol» para `tenant_admin`, `super_admin`, `agent` y el ámbito no permitido
- [x] 4.2 `features/audit/audit.store.ts`: `FullListState<AuditLog>` por ámbito, orden descendente por `createdAt`, `truncated`, hora de la última actualización, cambio de ámbito que cancela la carga anterior; verificar con peticiones simuladas (26 eventos, 1 500 informados → 1 000 y aviso, cambio de ámbito a media carga)
- [x] 4.3 `features/audit/audit-view-state.ts` (`ListState` derivado con `clientSide = true`) que refleja las filas filtradas y mantiene `ready` cuando los filtros no dejan nada; verificar que `DataTableComponent` muestra «No hay resultados» y no «Todavía no hay eventos»

## 5. Listado
- [x] 5.1 `features/audit/audit-list.component.ts`: cabecera con título (según rol), recuento, «Actualizar» con hora, «Exportar CSV», tabla solo con lo esencial (acción con tono y glifo, quién con rol, cuándo) y un ojo siempre visible por fila, vista de tarjetas (`AuditEventCardComponent`, botón que abre la modal); verificar escenarios de «Listado de eventos» (columnas, tarjeta, sin descripción ni identificadores, clave desconocida, sin correo, rol con otra capitalización, vacío)
- [x] 5.2 Chips por tipo de entidad con recuento (`facet`) y búsqueda sobre resumen, acción, entidad, id y persona; verificar escenarios de «Búsqueda y chips por entidad»
- [x] 5.3 Barra de filtros `features/audit/audit-filters-bar.component.ts` (rango rápido y personalizado con `<input type="date">`, tipo de acción, persona, «solo con cambios», «Limpiar filtros», etiqueta quitable «Entidad: …»), plegable en pantallas estrechas; verificar escenarios de «Filtros combinables» y que todos los controles tienen nombre accesible
- [x] 5.4 Estado en la URL: la pantalla lee `queryParamMap` y navega con `queryParamsHandling: 'merge'` (la búsqueda con `replaceUrl` y retraso de ~250 ms); verificar escenarios de «Filtros en la dirección de la página» (compartir, valor inválido, historial de entidad, atrás/adelante)
- [x] 5.5 Selector de ámbito (grupo de opciones con una elegida) y campo de empresa para `super_admin`; verificar escenarios de «Ámbitos de consulta según el rol» en el componente
- [x] 5.6 Exportación: «Exportar CSV» de `filtered()` de la tabla y «Exportar» de la selección (`#selectionActions`), desactivado sin filas, con `downloadCsv`; verificar escenarios de «Exportación a CSV de la auditoría»
- [x] 5.7 Estados de error: 403 con «Reintentar» y «Ver mi actividad», 5xx con «Reintentar» sin perder filtros, y `aria-live` educado con el recuento; verificar escenarios de «Estados de carga y de error» y «Cambios en el recuento»

## 5b. Añadido durante la implementación
- [x] 5.8 Lectura para todos: interruptor «Mostrar datos técnicos» (recordado), identificadores largos abreviados en las frases, frase no repetida si dice lo mismo que la etiqueta, frase de introducción y sin filtro ni cifra de persona en «Mi actividad»; verificado con pruebas del listado, los filtros y el panel
- [x] 5.9 `DataTableComponent`: búsqueda y chip enlazables (`model()`); verificado con sus 391 pruebas sin cambios y con la búsqueda y el chip en la dirección

## 6. Panel de actividad
- [x] 6.1 `features/audit/activity-panel.component.ts` con las cuatro cifras sobre `filtered()`; verificar escenarios de «Cifras de actividad» (con eventos, personas sin correo, seguimiento de filtros, sin eventos)
- [x] 6.2 Gráfico de actividad por día (columnas `<button>` de ≥44 px, hoy parcial, agrupado por semana a partir de 60 días, `title` con fecha y cantidad) que emite el día elegido; verificar escenarios de «Actividad por día»
- [x] 6.3 Reparto por tipo de acción (barra apilada, leyenda con glifo, recuento y porcentaje) que emite el tipo elegido; verificar escenarios de «Reparto por tipo de acción»
- [x] 6.4 Alternativa accesible (resumen de texto y tabla con los mismos datos) y plegado del panel con preferencia `ruteando-audit-panel` (sin romper si `localStorage` falla); verificar escenarios de «Alternativa accesible del panel» y «Panel plegable»
- [x] 6.5 Estilos por tokens y presupuesto: hoja por componente (sin encapsulación) y panel repartido en `ActivityBars`, `ActivityShares`, `AuditEventCard` y `AuditTech`; `ng build` sin avisos (bundle inicial 492,8 kB, antes 492,7) y sin añadir nada a `styles.scss`

## 7. Detalle (modal)
- [x] 7.1 `audit-detail-dialog.component.ts`: modal (`MAT_DIALOG_DATA` con `id`, el evento si lo hay y `related`) que muestra el evento o lo pide con `AuditLogsApi.get` mediante `RecordLoader`, con carga, 404/403 en español y cabecera neutra; verificar escenarios de «Detalle de un evento en una modal» (a mano, enlace, evento inexistente o sin permiso, sin IP, cerrar, copiar, foco y nombre)
- [x] 7.2 Cabecera con tono y glifo por tipo de acción (`AuditDetailHeadComponent`, tono en el elemento raíz) y frase destacada; verificar los cinco tonos y la cabecera neutra
- [x] 7.3 Tarjetas de quién (avatar con `actorInitials`), cuándo, sobre qué e IP (`AuditFactsComponent`); verificar iniciales, icono sin correo y rol
- [x] 7.4 «Qué cambió» con flecha y tonos (`AuditChangesComponent`, apilado bajo 560 px), valores vacíos sin tachar y campos sin cambios en gris; verificar escenarios de «Diferencia antes y después»
- [x] 7.5 «Más de esta entidad» (`AuditRelatedComponent`, cinco como máximo desde lo traído) con salto a otro evento sin añadir historial; verificar escenarios de «Más eventos de la misma entidad»
- [x] 7.6 Acciones: enlace a la entidad (o «Esta entidad fue eliminada» / sin enlace), «Ver eventos de esta entidad», copiar enlace e identificador, datos técnicos plegados (`AuditTechComponent`, `copyToClipboard`); verificar escenarios de «Enlace a la entidad afectada»
- [x] 7.7 Prueba de seguridad: una descripción con `<img src=x onerror=…>` y valores con `<script>` se muestran como texto en el listado y en la modal; comprobado que la prueba falla si se sustituye `{{ }}` por `[innerHTML]`
- [x] 7.8 El listado sigue a `?evento=` (`syncDetail`): abre la modal al terminar de cargar, la carga bajo demanda (`import()`), «atrás» la cierra sin retroceder dos pasos (`closeOnNavigation: false`) y cerrar con el botón quita el parámetro; verificar con pruebas del listado

## 8. Integración
- [x] 8.1 `app.routes.ts`: ruta diferida `auditoria` con `roleGuard(OPERATIONS_ROLES)` en `canActivate` y `canActivateChild`, y `features/audit/audit.routes.ts` con una sola pantalla; verificar escenarios de «Rutas y permisos de auditoría» (rol permitido, `driver` a `/sin-permiso`, anónimo a `/acceso` con destino)
- [x] 8.2 `layout/nav-items.ts`: entrada «Auditoría» (icono `history`, `OPERATIONS_ROLES`, al final); verificar con `nav-items.spec.ts`, el riel, el shell y la búsqueda global (Inicio ya no tiene mosaicos de áreas: las toma de ahí)
- [x] 8.3 Revisión de que ningún botón de solo icono del módulo carece de `title` con `iconButtonsWithoutTitle` (`src/testing/`) y el barrido `titulos` del banco visual

## 9. Calidad
- [x] 9.1 `npm --prefix ng-ruteando run test:ci` en verde, con el número de pruebas nuevas anotado (antes 1673; ahora 1948, 3 omitidas como siempre), y `npm run test:server` sin cambios
- [x] 9.2 `npm --prefix ng-ruteando run build` sin avisos de presupuesto y con el módulo en un chunk diferido; anotar su tamaño
- [x] 9.3 Banco visual con el gateway simulado: suite `scroll` en `/auditoria` y en un detalle, 13 anchos de 320 a 1366 px en claro y oscuro, texto al 200 % a 320 y 390 px; revisar capturas del listado, panel plegado y desplegado, filtros abiertos en móvil, detalle con diferencias y detalle sin cambios
- [x] 9.4 Comprobación manual en Chrome real contra el gateway simulado: teclado (Tab por filtros, panel y tabla; `/` enfoca la búsqueda), compartir una dirección con filtros, atrás y adelante, exportar y abrir el CSV, y los cuatro roles (`tenant_admin`, `super_admin`, `agent`, `driver`)
- [x] 9.5 `npx --yes @fission-ai/openspec@1.14.3 validate --specs --strict` y `validate add-audit-module --strict` en verde

## 10. Cierre
- [x] 10.1 Documentar: `CLAUDE.md` (área `features/audit/`, URL como fuente de verdad, ámbitos por rol, qué no hace) y `.claude/skills/angular-ruteando/references/gateway-api.md` (audit-logs deja de estar «fuera de alcance»: forma de la página con `number`, suciedad de datos y ámbitos); verificar que no quedan frases que digan que la auditoría está fuera de alcance
- [ ] 10.2 Sin verificar y se declara (se repite cuando el gateway real esté activo): los cuatro endpoints contra el gateway real (hoy caído), si `/admin` exige `tenantId`, si `super_admin` puede llamar `/audit-logs`, si el gateway acepta `size` > 100 o filtros por parámetro, si el orden es siempre descendente, el nombre real del tipo de entidad de los tipos de vehículo, Safari, Firefox, un lector de pantalla real y un teléfono físico
- [ ] 10.3 Sin commit ni PR hasta que la persona lo pida (commits por intención: código, change de OpenSpec, documentación; sin atribución a Claude)
