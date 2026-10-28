# Consumo del HanoIT Gateway (arquitectura de `ng-ruteando`)

Backend: HanoIT Gateway, `https://<host>/api/v1/...`, multi-tenant, JWT de acceso con refresco rotado, roles `super_admin`, `tenant_admin`, `agent` y `driver`. La aplicación AngularJS anterior usaba HanoitApi (otro backend).

## Flujo de una petición

```
feature -> core/api/data/<x>.api.ts -> HttpClient -> interceptores -> /gateway/** (mismo origen)
         -> server/gateway-proxy.js (o proxy.conf.js con ng serve) -> <GATEWAY_URL>/api/v1/**
```

- **La clave `X-Api-Key` es un secreto y solo existe en el servidor** (`GATEWAY_API_KEY`, en `.env` o en el entorno). El navegador pide `/gateway/...`; el proxy reescribe a `/api/v1`, sustituye cualquier `X-Api-Key` del cliente, reenvía `Authorization` y no lee el cuerpo (multipart en streaming). Sin `GATEWAY_URL`/`GATEWAY_API_KEY` el proxy responde 503. Nunca copies la clave ni credenciales de la colección Postman al repositorio.
- `environment.apiUrl` es `/gateway` en desarrollo y producción; se provee con el token `API_BASE_URL` (`core/api/api-config.ts`).

## Capas

| Carpeta | Contenido |
|---|---|
| `core/api/` | `API_BASE_URL`, `Page<T>`/`pageParams` (página desde 0), `ApiError`, mensajes de error, interceptores (`auth` -> `refresh` -> `error`), `CrudApi` |
| `core/api/models/` | Interfaces del gateway, escritas a mano y comprobadas contra los fixtures (`models.spec.ts`) |
| `core/api/data/` | Servicios `*.api.ts` por entidad y `MasterDomainsService` (enumeraciones con caché y valores por defecto) |
| `core/auth/` | `TokenStorageService`, `AuthService`, `CurrentUser`, guards, `TenantContext`, `SessionRefreshService` |
| `core/geo/` | `LatLng`, conversiones GeoJSON/mapa y `decodePolyline5` |

## Reglas

- **Errores:** los interceptores convierten los fallos en `ApiError` con mensaje genérico en español por estado (400, 401, 403, 404, 5xx, sin conexión). El cuerpo del servidor queda en `details` y no se muestra. Personalizar: por petición (`withErrorMessage({404: '...'})`), por código del backend o por estado (`provideApiErrorMessages({...})`), con prioridad petición > registro > genérico. No uses `alert`; avisa con `MatSnackBar` cargado de forma diferida.
- **Sesión:** access token en memoria; refresh token y caducidad en `localStorage` (`hanoitToken`, `hanoitTokenExpiresDate`). 401 -> una sola renovación compartida y un único reintento; renovación anticipada si quedan < 30 s; renovación programada en `AuthService`; si falla, `SessionRefreshService.expireSession()` limpia y lleva a `/acceso?returnUrl=`. La sesión se restaura en un inicializador de aplicación (anónimo si falla; no actúa en SSR).
- **Coordenadas:** el gateway usa GeoJSON `[lon, lat]`; en el dominio usa siempre `LatLng {lat, lng}` y las funciones de `core/geo`. OpenLayers pide `[lng, lat]` (`toOlCoordinate`).
- **Geometría de rutas:** `routes[].geoJson` NO es GeoJSON: es una polilínea codificada de precisión 5 en orden lat,lng. `JourneysApi` entrega ya `DomainRoute.geometry: LatLng[]`.
- **Paginación:** `Page<T>` solo en places, resource-types, resources, settings, packages, users y journeys. `zones`, `assigned-services`, `master-domains`, `users/drivers` y las navegaciones devuelven arreglos. `zones` exige `tenantId`: se añade desde `TenantContext` (sin usuario falla con un error genérico de sesión no válida).
- **Rutas protegidas:** `authGuard`, `roleGuard([...])` y `guestGuard` (`/acceso`). `/sin-permiso` para rol no permitido.
- **Respuestas 202/204:** son éxito, con cuerpo vacío o `[]`.
- **Carga:** `core/api/data/*.api.ts` no deben importarse desde el arranque; el bundle inicial tiene ~9 kB de margen sobre el aviso de 500 kB.

## Comportamiento verificado contra el gateway real (2026-10-19)

- **`Origin` rompe el login:** con la cabecera `Origin` el gateway responde 403 (filtro CORS); sin ella, 200. Los dos proxies la eliminan (`gateway-proxy.js` y `proxy.conf.js`).
- **Formato de error:** `{ "error": "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT", "message": "<texto en inglés>", "timestamp": "...", "path": "..." }`. `ApiError.code` toma `error`. Códigos vistos: `BAD_REQUEST` (400), `NOT_FOUND` (404), `CONFLICT` (409). El 401 y el 403 sin cuerpo útil llegan sin código.
- **Refresco:** `POST /auth/refresh` no cambió el token de refresco en la prueba (no hubo rotación observable); el código sigue tratando la respuesta como sustitución completa.
- **`guideNumber` único por tenant:** crear dos paquetes con `guideNumber` nulo da 409 `CONFLICT`. Hay que enviar uno distinto en cada paquete.
- **`POST /journeys/plan` falla con ids reales (defecto del backend):** responde 400 `For input string: "<id del paquete>"` porque intenta convertir el id hexadecimal del paquete en número; reconfirmado el 2026-10-26 (ver «Verificado contra el gateway real (2026-10-26)»). Los ejemplos de la colección solo usan ids con dígitos (`000...001`) y por eso funcionan.
- **Un solo refresco** ante varios 401 simultáneos: comprobado en vivo (3 peticiones, 1 renovación).
- **Roles:** un usuario `driver` recibe 403 en `GET /users/drivers`; un `tenant_admin` puede crear conductores con `POST /users` (rol `driver`).
- El registro (`POST /auth/register`) crea tenant y usuario con `emailVerified: false`, y el login funciona sin verificar el correo.

## Verificado contra el gateway real (2026-10-26)

Comprobación manual por el proxy local con un tenant desechable (`POST /auth/register`; no hay endpoint conocido para borrarlo, así que queda un tenant de prueba en el gateway). Solo conclusiones: sin identificadores, correos ni tokens.

**Confirmado**
- **Disponibilidad:** el 530 con código 1033 de Cloudflare de la víspera era el túnel caído; ahora `GET /journeys` sin sesión da 401.
- **Sesión:** `register` responde 201 con `user`, `tenant` (`plan`) y `message`, sin tokens; `login` da 200 con `accessToken`, `refreshToken`, `expiresIn` (~3600) y `user`; `auth/me` devuelve el mismo `user`. `refresh` devuelve un `accessToken` nuevo y **el mismo `refreshToken`** (sin rotación). El rol de un registro es `tenant_admin` y `emailVerified` es `false` sin que impida usar la sesión.
- **Formas:** las respuestas de `places`, `resource-types`, `resources`, `settings` y `packages` coinciden con los modelos de `core/api/models` y con los fixtures (campos y nulos incluidos); los ids son hexadecimales de 24 caracteres. Los fixtures no necesitaron cambios.
- **Cambio de estado de un paquete:** `PATCH /packages/{id}/status/{status}` responde 200 con el paquete actualizado y un `GET` posterior lo confirma, en unos 300 ms. Las claves válidas son las **activas** de `PackageStatus`.
- **Errores:** `GET /journeys/<id inexistente>` y `GET /packages/<id inexistente>` dan 404 `NOT_FOUND`; un id mal formado (`/journeys/abc`) da **400** `BAD_REQUEST` («hexString has 24 characters»), no 404, y la pantalla lo muestra como error genérico, no como «El registro ya no existe».
- **Paginación y orden:** `GET /packages` devuelve **lo más reciente primero** por defecto, y el parámetro `sort` se **ignora por completo** (todas las variantes, incluso con un campo inexistente, dan 200 y el mismo orden). Para `journeys` no se pudo comprobar (ver abajo), pero es el mismo backend: se asume lo mismo y la home ordena por `createdAt` en el cliente.

**Defectos del gateway (no de este repositorio)**
- **`POST /journeys/plan` sigue fallando con paquetes reales:** 400 `For input string: "<id del paquete>"`, también con un solo paquete. Falla al interpretar **el id del paquete** (el `settingsId` hexadecimal sí lo acepta: con ids de solo dígitos el error es 404 «Settings not found»). Los ids los asigna el servidor y **ignora el `id` enviado en el cuerpo** de `POST /packages`, así que no hay forma de crear una jornada con rutas a través del gateway.
- **`PackageStatus` trae valores inactivos** (`returned` y una clave de pruebas `demo_…`): el gateway los rechaza con 400 «Unknown PackageStatus key» (comprobado con `returned`). Corregido en el change `fix-inactive-package-statuses`: `MasterDomainsService.activeValues()` y el menú de estados de `/paquetes` y de las visitas ofrecen solo los activos; un paquete que ya tenga un estado inactivo se sigue mostrando con su etiqueta, y el filtro de visitas incluye los inactivos presentes en la ruta.

**No verificable (y por qué)**
- **Premisa de las visitas** (una visita es una parada con `packageId`): sin jornadas con rutas no hay paradas que mirar. El único ejemplo con paradas (la colección Postman) trae `packageId: null`, `packageInfo: null` y `placeId: null` en las paradas de servicio. Queda como «no verificable»; el seguimiento de visitas no puede comprobarse con datos reales hasta que el gateway arregle la planificación o aporte una jornada real.
- **Orden de `GET /journeys`, tiempo de una planificación y unidades de distancia y duración:** no hay jornadas en el tenant desechable y el plan no funciona.
- **Jornadas del tenant real:** no se tocó ningún dato real; con un usuario real se podría revisar si ya existen jornadas con rutas.

**Pendiente**
- Comprobar en el gateway real si otros dominios que se ofrecen con `values()` en formularios (`ServiceType`, `PlaceType`, `RouteTopology`, `OsrmProfile`) también traen valores inactivos; si es así, usar `activeValues()` (conservando el valor actual al editar un registro que ya lo tenga).

## Verificado contra el gateway real (2026-10-28)

Comprobación por el proxy local con una cuenta de prueba creada en el tenant desechable `ruteando-prueba-auth` (sin borrado conocido) y el usuario de pruebas de la colección. Solo conclusiones: sin identificadores, correos ni tokens.

**Errores (formato `{ error, message, timestamp, path }`; `details` por campo en `VALIDATION_ERROR`)**
- Login incorrecto: 401 `INVALID_CREDENTIALS`. Campos vacíos: 400 `VALIDATION_ERROR`.
- Contraseña fuera de la política: 400 `PASSWORD_POLICY_VIOLATION`, con el texto «Password must be at least 16 characters and contain uppercase, lowercase, digit and special character (@$!%*?&).». **La política real es de 16 caracteres o más, no de 8**; comprobado en el registro (3, 8 y 14 caracteres rechazados, 20 con las cuatro clases aceptado). No se probó si rechaza otros símbolos (`#`, `_`).
- Orden de validación: en el registro se valida el correo antes que la contraseña (con un correo inválido solo se ve «Invalid email»); en restablecer, el token antes que la contraseña (con un token falso siempre `INVALID_TOKEN`). Por eso un 400 de restablecer puede ser el token **o** la contraseña, y hay que distinguirlos por el código.
- Token inválido en verificar o restablecer: 400 `INVALID_TOKEN`. Token vacío: 400 `VALIDATION_ERROR`. Correo duplicado: 409 `EMAIL_ALREADY_EXISTS`. `refresh` con un token inválido: 401 con cuerpo de texto («Unauthorized access»), no JSON.
- `forgot-password` y `resend-verification` responden 200 con un mensaje neutro tanto para un correo existente como para uno inexistente.

**Sesión**
- El token de acceso es un JWT de 3600 s (`exp`, `iat`, `jti`, `role`, `sub`, `tenantId`); el de refresco es opaco, así que su vida real no se puede leer del cliente (pregunta abierta para el equipo del gateway).
- `refresh` **no rota** el token de refresco (devuelve el mismo y el anterior sigue valiendo). `logout` lo revoca (refresh posterior = 401), pero el token de acceso sigue siendo válido hasta que caduque.
- Una cuenta con `emailVerified: false` puede iniciar sesión y usar `/auth/me`, `/journeys` y `/users/drivers`: el gateway no restringe nada por no haber verificado el correo.

**Otros**
- `GET /auth/verify-email?token=` devuelve una página HTML del propio gateway (400 «Enlace no válido» con un token falso), no redirige a la aplicación.
- Cloudflare bloquea la firma del cliente HTTP de Python (error 1010); `curl` y los navegadores pasan. Un 530 es el túnel caído y un 502 el servicio que aún arranca.

**Pendiente**
- Los correos de verificación y de recuperación **no llegaron** a una bandeja real tras el registro y tras dos solicitudes: el envío de correo del gateway de este entorno parece no operar. Sin ellos no se ha podido comprobar a qué URL apunta el enlace ni probar la verificación y el restablecimiento con un token real.
- ¿Qué vida tiene el token de refresco? ¿Rechaza símbolos fuera de `@$!%*?&`? ¿`POST /users` aplica la misma política de contraseña?

## Inicio (`home/`, `features/journeys/latest-journeys.ts`)

- **Accesos:** las áreas del rol salen de `layout/nav-items.ts` (`areaLinksFor`), las mismas del menú lateral.
- **Últimas jornadas** (solo `OPERATIONS_ROLES` y solo en el navegador; el render del servidor no pide nada): `fetchLatestJourneys` pide `page=0&size=5` y ordena en el cliente con `latestJourneys` por `createdAt` descendente (estable; sin fecha, al final). El gateway **ignora `sort`** (comprobado en `/packages` el 2026-10-26), así que no se envía. El orden por defecto de `/journeys` no se pudo comprobar (no hay jornadas creables); por eso la función **detecta el orden en tiempo de ejecución**: si la primera página viene de más antigua a más nueva y hay más jornadas, pide la última página (y la anterior si queda corta) y se queda con las cinco más nuevas. Con el orden esperado (más nueva primero, como `/packages`) basta una petición.
- Estados de la sección: carga (indicador accesible), vacío (enlace a planificar), error con «Reintentar»; los accesos no esperan a la lista.

## Pantallas de acceso (`features/access/`)

| Ruta | Pantalla | Guarda |
|---|---|---|
| `/acceso` | Iniciar sesión | `guestGuard` |
| `/acceso/registro` | Crear cuenta (+ panel "Revisa tu correo" y reenvío) | `guestGuard` |
| `/acceso/recuperar` | Pedir enlace de recuperación | `guestGuard` |
| `/acceso/verificar-email?token=` | Verificar correo (inicia sesión) | ninguna |
| `/acceso/restablecer?token=` | Elegir contraseña nueva | ninguna |

- **Layouts:** `AppComponent` solo tiene un `router-outlet`. `/acceso/**` usa `AccessLayoutComponent` (sin barra ni menú); el área privada (`''`) usa `ShellComponent`, cargado de forma diferida y protegido con `authGuard` (`canActivate` y `canActivateChild`). El shell lleva el menú de usuario con "Cerrar sesión" confirmado (`ConfirmDialogComponent`, reutilizable).
- **Destino tras el login:** `safeReturnUrl(returnUrl)` (`core/auth/return-url.ts`) solo admite rutas internas; rechaza `//host`, `/\host`, esquemas, espacios y caracteres de control y rutas de `/acceso`. Nunca navegues a un `returnUrl` sin pasarlo por esta función.
- **Tokens de un solo uso** (verificar y restablecer): se leen al crear la pantalla, se retiran de la URL con `replaceUrl`, y la llamada de verificación solo se hace en el navegador (el SSR no debe consumirlo).
- **Cierre de sesión:** `POST /auth/logout` lleva `{ refreshToken }`; sin token de refresco solo limpia el estado local.
- **Mensajes por operación** en `core/auth/auth-messages.ts`, por **código** del gateway antes que por estado (`INVALID_TOKEN` y 401/404/410 y un 400 sin código = enlace no válido; `PASSWORD_POLICY_VIOLATION` = la regla de la contraseña; `VALIDATION_ERROR` = «Revisa los datos…»; login 401; registro 409/400). Códigos reales en «Verificado contra el gateway real (2026-10-28)».
- **Formularios:** reactivos y tipados; piezas en `shared/form/` (`PasswordFieldComponent`, `FocusFirstInvalidDirective`, `FormResultComponent`, `notify`) y `features/access/shared/` (`matchesSibling`, `revalidateOnPasswordChange`). Los campos se localizan en las pruebas por `autocomplete`, porque `matInput` gestiona el atributo `name`. Contraseña en registro y restablecer: obligatoria, coincidencia y la política del gateway (`core/auth/password-policy.ts`: 16 caracteres o más, mayúscula, minúscula, dígito y un símbolo de `@$!%*?&`), con una lista de requisitos que se marca punto por punto (`requirements` de `PasswordFieldComponent`: aparece al enfocar el campo, queda visible mientras falte alguno una vez tocado y llega a los lectores de pantalla por `aria-describedby`; el error del campo es breve y lo que falta lo dice la lista); el formulario de conductores conserva su mínimo de 8 porque `POST /users` no se ha comprobado.
- **Correos:** las plantillas del gateway deben apuntar a `/acceso/verificar-email?token=...` y `/acceso/restablecer?token=...`.
- **Fuera de alcance:** acceso social, aceptar invitaciones, cambiar contraseña y editar perfil.

## Flota (`features/fleet/`)

| Ruta | Pantalla | API |
|---|---|---|
| `/flota/tipos` (+ `nuevo`, `:id`) | Tipos de vehículo | `ResourceTypesApi` |
| `/flota/vehiculos` (+ `nuevo`, `:id`) | Vehículos y asignación de conductor | `ResourcesApi`, `ResourceTypesApi`, `PlacesApi`, `UsersApi.drivers()` |
| `/flota/conductores` (+ `nuevo`, `:id`) | Conductores | `UsersApi` |

- **Permisos:** `roleGuard(ADMIN_ROLES)` (`core/auth/admin-roles.ts`, aparte de las rutas para no engordar el bundle inicial). El menú del shell filtra por rol, pero la seguridad real son la guarda y el gateway.
- **Patrón de datos (`shared/data/`):** `ListState<T>` (paginación del servidor, cancelación, retroceso si queda vacía una página), `DataTableComponent` (estados carga/vacío/error, filtro solo de la página cargada), `DeleteFlow` + `DeleteConfirmation`, `SubmitState`, `RecordLoader<T>`, `ClientPaging<T>` y `unsavedChangesGuard`. Texto por estado HTTP en cada pantalla (`messageFor`), no en el registro global de mensajes.
- **Conductores:** `GET /users/drivers` devuelve una lista plana sin paginar; se pagina en el navegador (`ClientPaging`). El alta usa `POST /users` con `role: 'driver'`; la edición no envía contraseña. No se editan `identifierType` ni `identifierValue` (valores válidos sin documentar).
- **Vehículos:** `shiftStartUtc` es ISO UTC; el formulario edita hora local y las duraciones en minutos (`shared/time/shift-time.ts`). En el alta solo se envían `licensePlate` y `quantity` si se apartan del valor por defecto. Los selectores de tipo y lugar cargan como máximo 200 registros y avisan si hay más.
- **Tipos:** `capacity`, `measure` y `restriction` no tienen contrato; se reenvían tal cual al editar. Etiquetas de perfil de ruteo en español en `fleet-labels.ts`.
- **Sin verificar contra el gateway real** (tarea 7.3, no autorizada): estados HTTP de borrar un tipo con vehículos o un conductor asignado (se mapean 400 y 409) y de matrícula o correo duplicados (409).
- **Preguntas para el equipo del gateway:** ¿admiten `sort` o búsqueda en `GET /resource-types`, `/resources` y `/users`? ¿Cuál es la respuesta al borrar un registro en uso?

## Lugares y mapa (`features/places/`, `shared/map/`)

| Ruta | Pantalla | API |
|---|---|---|
| `/lugares` (+ `nuevo`, `:id`) | Lugares (depósitos, almacenes, tiendas, oficinas) | `PlacesApi`, `MasterDomainsService` (`PlaceType`) |

- **Permisos:** `roleGuard(ADMIN_ROLES)`, como la flota. Rol real del gateway sin documentar.
- **Mapa (`shared/map/`):** `MapViewComponent` (OpenLayers 10, cargado con `import()` dinámico solo en el navegador desde `openlayers.ts`; en SSR deja un hueco), `LocationFieldsComponent` (latitud y longitud + mapa sincronizados, con `createLocationGroup()`) y el token `MAP_CONFIG` (`environment.map`: `tilesUrl`, `attribution`, `center`, `zoom`). Las pruebas sustituyen las teselas por una imagen incrustada (`src/testing/map.ts`) y pueden inyectar `OPENLAYERS_LOADER` para simular un fallo.
- **Teselas:** OpenStreetMap, sin clave; su política de uso solo admite tráfico ligero y exige atribución visible. Para producción real cambiar `tilesUrl` y `attribution` en `environment*.ts`; las claves de proveedor no se guardan en el cliente.
- **Accesibilidad:** el mapa no se opera con teclado; los campos de latitud y longitud (antes del mapa en el orden de tabulación) son la vía principal y están siempre presentes.
- **Gateway:** ubicación como punto GeoJSON `[longitud, latitud]`. En el alta solo se envían los campos con valor; en la edición se reenvía `zoneId` para que la actualización no lo borre (el comportamiento de `PUT /places/{id}` con campos omitidos no está documentado).
- **Sin geocodificación:** la dirección es texto libre y no calcula la ubicación (`/geocoding` sin contrato).
- **Sin verificar contra el gateway real** (tarea 6.3): estados de borrar un lugar usado como depósito (se mapean 400 y 409).
- **CSS:** `ol/ol.css` está en `styles` de `angular.json` (+5,4 kB al CSS inicial); si el inicial se queda corto, pasarlo a carga diferida.

## Paquetes (`features/packages/`)

| Ruta | Pantalla | API |
|---|---|---|
| `/paquetes` (+ `nuevo`, `:id`) | Paquetes (el `itinerary` del legacy): listado, alta, edición, borrado, estado y CSV | `PackagesApi`, `MasterDomainsService` (`ServiceType`, `PackageStatus`) |

- **Permisos:** `roleGuard(OPERATIONS_ROLES)` (`tenant_admin`, `super_admin`, `agent`; en `core/auth/admin-roles.ts`). El `driver` no entra. Rol real del gateway sin documentar.
- **Guía:** única por tenant; una guía vacía no se envía (con `null` repetido el gateway responde 409). 409 al guardar: «Ya existe un paquete con ese número de guía».
- **Editar sin perder datos:** `buildUpdateBody` reenvía el registro cargado sin los campos de solo lectura (`id`, `tenantId`, fechas, `status`, `standardizedAddress`, `geocodingScore`, `geocodingStatus`) y con lo editado encima, porque no consta cómo trata `PUT /packages/{id}` los campos omitidos. `measure`, `timeWindow`, `receiver`, `sender`, `category`, `goodsTags`, `customerId`, `zoneId` y `durationStay` no se editan.
- **Estado:** `PATCH /packages/{id}/status/{status}` desde un menú por fila; solo cancelar pide confirmación. El dominio `PackageStatus` del gateway real incluye un valor de prueba (`demo_…`) que aparece en el menú.
- **CSV (`shared/data/csv.ts`, `package-export.ts`):** `;`, `\r\n`, BOM UTF-8 y apóstrofo ante `=`, `+`, `-`, `@`; se piden las páginas de 200 en 200 con progreso. Columnas del legacy: `ID_GUIA;LONGITUD;LATITUD;CIUDAD;PAIS;DIRECCION;DIRECCION ESTANDARIZADA;PRECISION;ESTADO DE GEOCODIFICACION;ESTADO`. La importación de CSV no está: irá con las jornadas.
- **Sin geocodificación:** la dirección es texto y la ubicación se coloca en el mapa o con coordenadas; `geocodingStatus` no se envía.
- **Sin verificar contra el gateway real** (tarea 6.4): que el PUT con el cuerpo completo se acepte, el 409 por guía duplicada y el borrado de un paquete incluido en una jornada (se mapean 400 y 409).

## Configuraciones (`features/settings/`)

| Ruta | Pantalla | API |
|---|---|---|
| `/configuraciones` (+ `nuevo`, `:id`) | Configuraciones de planificación (el `settings` del legacy) | `SettingsApi`, `PlacesApi`, `ResourcesApi`, `MasterDomainsService` (`RouteTopology`, `RestrictionType`, `TypeLengthOfStay`) |

- **Permisos:** `roleGuard(ADMIN_ROLES)`. Rol real del gateway sin documentar.
- **Secciones por tipo de restricción:** `fixed_routes` muestra `fixedRoutes` (entero ≥ 1); `resource_vs_time` y `time_windows` muestran el turno (`shiftStartUtc`, `shiftDurationSec`, `breakDurationSec`; hora local en el formulario, UTC y segundos hacia el gateway con `shared/time/shift-time.ts`). Los controles de la sección que no aplica se deshabilitan: no se validan ni se envían.
- **Estancia:** `typeLengthOfStay` opcional; `fixed` exige `lengthOfStay` > 0 y `define_itinerary` no envía valor. La unidad de `lengthOfStay` no está documentada.
- **Alta:** solo se envía lo que aplica y lo que se aparta del valor por defecto (el ejemplo real es `{description, routeTopology, restrictionType, fixedRoutes, resourceIds, placeStartId}`); sin lugar de llegada el gateway usa el de salida.
- **Edición:** `buildSettingsUpdateBody` reenvía el registro cargado sin `id`, `tenantId`, fechas, `createdBy` ni los resúmenes `placeStart`, `placeEnd` y `resources` (se conservan `globalShiftActive`, `globalBreakActive` y `active`); las secciones inactivas viajan como `null` y la llegada vacía como el lugar de salida.
- **Vehículos y lugares:** selectores de hasta 200 registros con aviso si hay más y enlace de creación cuando no hay ninguno.
- **Sin verificar contra el gateway real** (tarea 5.4): qué exige cada tipo de restricción, el efecto de enviar `null`, la unidad de `lengthOfStay` y el borrado de una configuración usada por una jornada (se mapean 400 y 409).

## Jornadas (`features/journeys/`)

| Ruta | Pantalla | API |
|---|---|---|
| `/jornadas` | Listado y borrado | `JourneysApi.list`, `remove` |
| `/jornadas/nueva` | Planificar: nombre, configuración y paquetes | `JourneysApi.plan`, `SettingsApi`, `PackagesApi` |
| `/jornadas/:id` | Detalle: resumen, rutas, paradas y paquetes no planificables | `JourneysApi.get` (ya como `PlannedJourney`) |

- **Permisos:** `roleGuard(OPERATIONS_ROLES)` (administradores y agentes). Rol real del gateway sin documentar.
- **Selector de paquetes (`PackagePickerComponent`):** tabla paginada cuya selección (`selectedIds`) vive fuera de la página; «Seleccionar todos los pendientes» pide todas las páginas (`fetchAllPackages`, de 200 en 200) y suma los de estado `pending`.
- **Errores de planificación (`plan-errors.ts`):** 400 y 422 muestran «No se pudo planificar la jornada» con el mensaje del cuerpo del gateway; 404, configuración o paquete inexistente; 502 y 504, tiempo agotado. El formulario conserva todo para reintentar.
- **Defecto conocido del backend:** `POST /journeys/plan` responde 400 `For input string: "<id>"` con ids de paquete hexadecimales reales (solo funcionan ids numéricos como los de la colección). Sin arreglo, la planificación real no es utilizable desde la aplicación.
- **Tiempo de espera:** el proxy corta a los 30 s (`GATEWAY_TIMEOUT_MS`, documentado en `.env.example`) y responde 504; una optimización larga puede necesitar subirlo.
- **Detalle:** `routes` es `null` en los listados y solo viene en el detalle y en la planificación. Distancia en metros y duración en segundos (asumido por el ejemplo real; sin documentación oficial). Formatos en `shared/format.ts`. Las rutas se leen como `DomainRoute` (con `geometry` y paradas con `LatLng`); el mapa de rutas ya las pinta (ver «Mapa de rutas»).
- **Estados:** `JourneyStatus` con `planned` y `completed` además de los documentados; etiquetas en `journey-labels.ts`.
- **Sin verificar contra el gateway real** (tarea 6.4): si `journeys/plan` ya acepta ids hexadecimales, el tiempo real de una planificación, las unidades de distancia y duración y el borrado de una jornada.

## Mapa de rutas (`features/journeys/routes-map.component.ts`, `shared/map/route-*.ts`)

- **Dónde:** `RoutesMapComponent` va en el detalle de la jornada (`/jornadas/:id`), entre el resumen y la tabla de rutas. Vive en `features/journeys/` porque usa las etiquetas de tipos de parada; la paleta (`route-colors.ts`), la geometría (`route-geometry.ts`) y el cargador de OpenLayers (`openlayers.ts`, con `OPENLAYERS_LOADER` sustituible en pruebas) siguen en `shared/map`.
- **Datos:** lee `DomainRoute` (`geometry` ya decodificada y paradas con `LatLng`). Sin geometría, une las paradas con una línea discontinua; las posiciones no válidas se omiten.
- **Dibujo:** una línea por ruta con borde blanco debajo, paradas con `ruta·orden` (`2·3`) y depósitos con «D». Paleta de ocho colores aptos para daltonismo (Okabe-Ito y Tol) que se repiten por `routeIndex % 8`; el color no es la única señal (leyenda con nombre y vehículo, número de ruta en las paradas).
- **Selección:** `selectedRoute` y `selectedStop` son `model()` compartidos con las tablas («Ver en el mapa» por ruta y por parada). Elegir una ruta la resalta, atenúa las demás y encuadra en ella; la ficha de la parada es una región `aria-live` y al cerrarla el foco vuelve a quien la abrió.
- **Accesibilidad:** el mapa no se opera con teclado; la leyenda (botones `aria-pressed`), las tablas y la ficha cubren toda su información.
- **Estado de OpenLayers:** el centro y el zoom se aplican en el siguiente fotograma; los efectos que dibujan o encuadran se saltan lo que `init` ya hizo (`drawn`, `fitted`, `centered`) porque su primera ejecución llega después del arranque asíncrono. Si cambia el tamaño de la ventana tras cargar no se reencuadra.
- **Sin verificar contra el gateway real** (tarea 5.3): geometría y paradas de una jornada real y su comportamiento con una jornada grande; mientras `journeys/plan` falle con ids hexadecimales puede no haber jornadas reales con rutas.

## Detalle de ruta y visitas (`features/journeys/route-detail.component.ts`, `route-visits.*`)

- **Dónde:** `/jornadas/:id/rutas/:routeIndex` (mismos roles que `/jornadas`; se llega con «Ver ruta» desde la tabla de rutas). Carga la jornada completa con `JourneysApi.get()` (no hay endpoint de una sola ruta) y elige la ruta por `routeIndex`; un índice que no es entero o que no existe muestra «El registro ya no existe». El mapa recibe una lista de una sola ruta.
- **Visita = parada con `packageId`.** El gateway no tiene un recurso de visitas: el estado de la visita es el `PackageStatus` del paquete y se cambia con `PATCH /packages/{id}/status/{status}` (`PackagesApi.setStatus`). Las paradas sin paquete (depósitos) salen sin estado ni acción.
- **Lectura:** `RouteVisitsStore` (provisto por `RouteVisitsComponent`) pide cada paquete con `PackagesApi.get`, de a 6 (`VISITS_CONCURRENCY`) y una vez por id; un fallo individual deja la visita en «No disponible». Hay una petición por paquete porque no existe endpoint por lotes: con rutas de cientos de paradas puede tardar. «Actualizar» vuelve a leerlos y conserva los filtros.
- **Cambio de estado:** pesimista (la fila cambia cuando el gateway responde); la acción de esa visita se desactiva mientras dura; cancelar pide confirmación. Comparte `changePackageStatus` (`features/packages/package-status-change.ts`) con `/paquetes`.
- **Filtros y avance:** por estado (incluido «No disponible») y por texto (nombre, guía y direcciones, sin mayúsculas ni acentos), en `route-visit-filters.ts`. Con un filtro activo solo se listan visitas. El avance («X de N visitas atendidas») cuenta `attended` sobre todas las visitas de la ruta, no sobre las filtradas, y se da como texto además de la barra.
- **Sin verificar contra el gateway real** (tarea 4.3): en el único fixture de planificación (`post__journeys__plan.json`) las paradas `service` traen `packageId: null`; si el gateway real tampoco lo informa, no habrá visitas que seguir hasta que lo haga. `packageInfo` sigue sin contrato y no se usa.

## Importar paquetes desde CSV (`features/packages/import/`)

- **Ruta:** `/paquetes/importar` (administradores y agentes), desde «Importar CSV» del listado, antes de `/paquetes/:id` en las rutas. Guarda de salida con textos propios (`leaveDialog`) mientras hay una importación en curso.
- **Por qué en el navegador:** `POST /packages/upload` devuelve 400 sin contrato y no hay geocodificación; es el plan B anotado. Cada fila se crea con `PackagesApi.create`. Cuando se documente la subida, solo cambia el ejecutor (`package-importer.ts`).
- **Tres capas:** `parseCsv` (`shared/data/csv.ts`: BOM, CRLF/LF/CR, comillas con `""`, separador `;`, `,` o tabulación detectado por la cabecera, línea de cada registro, límite de filas), `validateRows` (`package-rows.ts`: alias de cabecera sin tildes, valores por defecto, errores con línea y campo) y `runImport` (`package-importer.ts`: pool de 4, 409 con guía = «ya existía», 429 y 503 con espera 1-2-4 s, concurrencia a la mitad y tres intentos, cancelación que deja terminar las peticiones en vuelo).
- **Columnas:** obligatorias `DIRECCION`, `LONGITUD`, `LATITUD`; opcionales `ID_GUIA`, `NOMBRE`, `SERVICIO` (Entrega, Recogida, Mixto), `CIUDAD`, `PAIS`, `CODIGO_POSTAL`, `PESO`, `VOLUMEN`, `PIEZAS`, `OBSERVACION`. Por defecto: nombre = guía o dirección, entrega, peso y volumen 0, piezas 1. La cabecera que exporta la propia aplicación se reconoce (se ignoran `DIRECCION ESTANDARIZADA`, `PRECISION`, `ESTADO DE GEOCODIFICACION` y `ESTADO`).
- **Límites:** 2 MB, 2000 filas de datos y 500 caracteres por texto. Se acepta punto o coma decimal; `1.234,56` se rechaza por ambiguo.
- **Seguridad:** todo es texto; se pinta con interpolación escapada (nunca `innerHTML`) y el informe de errores usa `toCsv` (protección contra fórmulas). Los ejemplos numéricos de la plantilla se escriben como números (un texto que empieza por `-` se protegería como fórmula).
- **Sin geocodificación el archivo necesita coordenadas**: es la mayor diferencia con el legacy.
- **Importación no transaccional:** si falla a mitad quedan creadas las anteriores. Reimportar un archivo sin `ID_GUIA` duplicaría paquetes.
- **Sin verificar contra el gateway real** (tarea 5.4): si acepta peso y volumen 0, cómo responde a ráfagas de altas (429) y el 409 por guía repetida.
- **Preguntas para el equipo del gateway:** contrato de `POST /packages/upload` y de la geocodificación; límites de ritmo.

## Zonas y editor de polígonos (`features/zones/`, `shared/map/polygon-*.ts`, `vertex-table.component.ts`)

- **Rutas:** `/zonas` (lista), `/zonas/nueva` y `/zonas/:id`; solo `ADMIN_ROLES`, con `unsavedChangesGuard` en el formulario. Menú: «Zonas» tras «Lugares».
- **Endpoints:** `ZonesApi` (`core/api/data/zones.api.ts`) exige `tenantId` (lo añade `TenantContext`; sin usuario es un 401 de sesión). `GET /zones` devuelve un array sin paginar, por eso la lista usa `ClientPaging`. El `PUT` quita `id`, `tenantId`, `createdAt` y `updatedAt` y conserva `active` (`buildZoneUpdateBody`).
- **Fuente de verdad:** la lista de vértices (`LatLng[]`, sin repetir el primero al final). El mapa y la tabla la editan a la vez (`model()` en `PolygonEditorComponent` y `VertexTableComponent`); `ringFromVertices` cierra el anillo en sentido antihorario y `verticesFromRing` lo deshace. Los pares del gateway son `[lon, lat]`.
- **Geometría pura** (`polygon-geometry.ts`): `validatePolygon` devuelve `too-few` (<3), `no-area`, `self-intersection{a,b}` (lados que se cruzan) o `unchecked` (>2000 vértices, no se comprueban cruces); `areaKm2` es aproximada. Un lazo (bow-tie) informa del cruce, no de «sin área».
- **Editor:** OpenLayers `Draw` (clics, doble clic o «Terminar polígono»; Escape cancela con un listener en `document`, porque tras un clic en el mapa el foco no está dentro del editor) y `Modify` (arrastrar vértices). La tabla de vértices es la alternativa completa con teclado; el resumen (`aria-live`) anuncia validez, vértices y área. Sin OpenLayers (SSR o fallo de carga) solo queda la tabla.
- **Color:** hex de la paleta de rutas (`ROUTE_COLOR_NAMES`/`colorName`) o ninguno; el listado muestra la muestra y el nombre.
- **Código:** sin espacios y hasta 20 caracteres es una regla de prudencia del cliente, no un contrato. 409 al repetirlo: «Ya existe una zona con ese código». Borrar una zona en uso (400/409) muestra `ZONE_IN_USE`.
- **Comprobado con un gateway falso** (tarea 5.3): dibujar, arrastrar, tabla por teclado, cruce, 409 y borrado a 360 y 1200 px.
- **Sin verificar contra el gateway real** (tarea 5.4): qué valida de un polígono (cruces, orientación, solapes), el formato aceptado de `color`, el 409 por código y qué pasa con los `zoneId` de lugares, paquetes y configuraciones al borrar una zona en uso.
- **Preguntas para el equipo del gateway:** validación de geometría en servidor, formato de `color`, comportamiento del borrado de una zona en uso.

## Lo que NO existe todavía

- Subida de CSV (`POST /packages/upload`): devuelve 400 sin contrato documentado. `PackagesApi` no la ofrece; el plan B (parsear el CSV en el navegador y crear paquetes con `create()`) ya está hecho: ver «Importar paquetes desde CSV».
- Geocodificación (`/geocoding`, `/reverse-geocoding`): sin cuerpo capturado. `routing/nearest` y `routing/messenger` devuelven 500 (defecto del backend); `routing/optimizations/collection` devuelve 200 con estado de negocio 207.
- Facturación (Stripe), notificaciones/OTP, invitaciones, tenants, auditoría y tiempo real (STOMP): fuera de alcance.

## Mapeo legacy -> gateway (histórico)

Registro de cómo se tradujo cada módulo de la aplicación AngularJS, que ya no está en el árbol: su código sigue en el historial de git (último commit que lo contiene: `19b1cb4`, ruta `master/js/custom/*`).

| Legacy (`master/js/custom/*`) | Gateway | Servicio |
|---|---|---|
| `access` | `auth/login`, `register`, `refresh`, `logout`, `verify-email`, `forgot-password`, `reset-password` | `AuthService` |
| `vehicle_types` | `resource-types` | `ResourceTypesApi` |
| `vehicles` | `resources` (+ conductor con `/resources/{id}/driver/{driverId}`) | `ResourcesApi` |
| `drivers` | `users` con rol `driver` (`/users/drivers`) | `UsersApi` |
| `places` | `places` (+ `nearby`) | `PlacesApi` |
| (nuevo) | `zones` (+ `containing`) | `ZonesApi` |
| `catalogs` | `master-domains` | `MasterDomainsApi`, `MasterDomainsService` |
| `settings` | `settings` | `SettingsApi` |
| `itinerary` + CSV | `packages` | `PackagesApi` |
| `journeys` + `osrmHttp` | `journeys/plan`, `journeys`, `journeys/{id}` | `JourneysApi` (la optimización es de servidor; no se porta `osrmHttp`) |
| `assigned_services` | `assigned-services` | `AssignedServicesApi` |

## Pruebas

- Fixtures reales y saneados en `ng-ruteando/src/testing/fixtures/gateway/` (115). Se regeneran con `node scripts/extract-gateway-fixtures.mjs <ruta-colección>`; la colección vive fuera del repo y el script aborta si queda algún secreto.
- `src/testing/api-testing.ts` y `crud-api-spec.ts` dan `setupApi`, `respondWith` y `describeCrudApi` para las pruebas de contrato.
- Servidor: `npm run test:server` (gateway falso local, sin red ni MongoDB).
