# Legacy Sunset Plan — OAuth stack

> ADR-004. Estado: **cerrado — T4 completado (2026-11-13)**. No queda superficie legacy:
> routing, mobile, operacional, CRUD legacy, **OAuth stack** y los últimos controllers
> heredados fueron retirados o modernizados.
> Superficie canónica única: `/api/v1/*` con `SecurityConfig` endurecido (`anyRequest().denyAll()` fuera de `/api/v1/**`).

## 0. Removido (ejecutado 2026-07-18)

### Controllers legacy eliminados (equivalente `/api/v1`)
`CatalogController`, `DriverController`, `TypeVehicleController`, `SettingController` (v1),
`PlaceController` (v1), `JourneyController` (v1), `RouteController` (v1), `GeocodingController` (v1),
`FileUploadController`, `DeliveryController` (v1), `TestController`, `RestControllerManager` + tests.

### OAuth stack eliminado
| Componente | Paths legacy | Reemplazo |
|------------|--------------|-----------|
| `AuthController` | `/auth/**` | `/api/v1/auth/**` (`RoutingAuthController`) |
| `OAuth2Controller` | `/oauth/**` | Eliminado |
| `UserController` | `/hanoit/api/v1/user/**` | `/api/v1/auth/**` + `/api/v1/users/**` |
| `UserService`, `oauth.User`, `RoleService` | — | `RoutingUserService`, `RoutingUser` |
| `CustomUserDetailsService` | JWT fallback | Eliminado — JWT exige claim `role` |
| `Oauth2Config` | — | Eliminado |
| Paquete `com.hanoit.oauth` | 32 main + 22 tests | `RefreshTokenService` → `routing.security.token` |

### Migrados a `/api/v1` (misma lógica, nueva superficie)
| Antes | Ahora |
|-------|-------|
| `/hanoit/v2/osrm/*`, `/hanoit/v2/delivery/*`, `/hanoit/v3/routing/*` | `/api/v1/routing/*` (JWT requerido) |
| `/hanoit/api/v1/movile/*` | `/api/v1/driver/*`, `/api/v1/positions` |
| `/hanoit/api/v1/assignedservices` | `/api/v1/assigned-services` (retirado en T5) |
| `/hanoit/api/v1/vehicle/position` | `/api/v1/positions` |
| `/configuration` | `/api/v1/admin/geocoding-config` (SUPER_ADMIN) |

Ver `docs/api/ENDPOINT_MIGRATION_MAP.md` para detalle completo.

## 1. Timeline

| Fase | Hito | Estado |
|------|------|--------|
| **T1** | Migrar routing/mobile/admin a `/api/v1` | ✅ Completado |
| **T2** | Auth en `/api/v1/routing/**` (R-04) | ✅ Completado |
| **T3a** | Remover CRUD legacy con equivalente | ✅ Completado |
| **T3b** | OAuth stack removal + SecurityConfig solo `/api/v1/**` | ✅ Completado |
| **T4** | Unificación de paquetes y modernización de los controllers restantes | ✅ Completado (2026-11-13) |
| **T5** | Retiro del modelo legacy completo (código, endpoints, datos) | ✅ Completado (2026-11-19) |

## 2. T4 — Unificación final (2026-11-13)

Los controllers que habían migrado de URL pero conservaban internals heredados
(`Principal` como clave de propiedad, entidades crudas en el contrato, `deprecated = true`)
fueron modernizados, y los paquetes `controller.api.rest.v1|v2` y `routing.v3.*.controller`
desaparecieron: **todos los controllers viven ahora en `com.hanoit.routing.controller`**.

### Clases eliminadas por estar muertas
| Clase | Motivo |
|---|---|
| `RootController` | `send-mail` fuera de `/api/v1`, inalcanzable por `denyAll`, destinatario hardcodeado |
| `GreetingController` | Controlador WebSocket de prueba con valores hardcodeados |
| `VehicleMessage`, `VehicleReturn` | Huérfanas tras retirar `GreetingController` |
| `WebSocketConfig` | Registraba STOMP `/vppost` y `/vpget` sin handlers |

### Endpoints eliminados
| Endpoint | Motivo |
|---|---|
| `GET /api/v1/driver/positions/{driverId}` | Duplicado de `GET /api/v1/positions/{driverId}` |
| `GET /api/v1/assigned-services/summary` | Sin consumidores |
| `DELETE /api/v1/assigned-services` (bulk) | Borrado masivo sin uso ni salvaguardas |
| `GET`, `POST`, `DELETE /api/v1/admin/geocoding-config[/{id}]` | El recurso es un singleton: solo `GET` y `PUT` |

### Cambios de comportamiento
- `POST /api/v1/driver/positions` **persiste** la posición y devuelve el recurso creado;
  antes publicaba en RabbitMQ y devolvía `null`. La cola `queue.vehicle` pasa a ser solo
  canal de difusión y el consumidor interno ya no escribe (se evita el doble guardado).
- `PUT /api/v1/admin/geocoding-config` actúa sobre el singleton, sin `{id}` ignorado en la ruta.
- El aislamiento multitenant de posiciones, asignaciones y reporte de paquetes usa el
  `tenantId` del JWT. **Los documentos creados con las claves OAuth antiguas no son visibles**;
  no se incluye migración de datos (tampoco eran accesibles antes, porque el `Principal`
  dejó de ser el email al adoptar JWT).

## 2b. T5 — Retiro del legacy (2026-11-19)

El sistema no está en producción, así que se arranca en limpio en vez de convivir con el modelo anterior.

- **Endpoints retirados (404):** `/api/v1/assigned-services*`, `GET /api/v1/driver/assignments`, `/api/v1/admin/migrate*`.
- **Código eliminado:** `com.hanoit.service.core`, `com.hanoit.repository.mongo`, las entidades de persistencia de `com.hanoit.business.object` (`Driver`, `Vehicle`, `Journey`, `Route`, `Setting`, `AssignedService`, `GlobalConfiguration`, …), `com.hanoit.routing.migration`, `GlobalExceptionHandler`, los converters `Local*`, `spring-boot-starter-mail` y las plantillas FreeMarker de correo, y los runners de corrección al arrancar (`TenantUnitsCleanupRunner`, `IdentifierTypeNormalizationRunner`, `EnumCatalogCleanupRunner`, `PackageGuideIndexMigrationRunner`).
- **Reescrito sobre el modelo nuevo:** posiciones (`vehicle_positions`, conductor desde el JWT, difusión RabbitMQ en `vehicle.exchange`), reporte de entrega (`packages` + `PackageStatus` + motivo del tenant) y configuración de geocodificación (singleton `geocoding_config`).
- **Errores sin handler:** 404/405/415 responden con el `ErrorResponse` unificado (`UnmappedRequestExceptionHandler`).
- **Datos:** las colecciones legacy se borran con `scripts/mongo/drop-legacy-collections.js` ([`../operations/LEGACY_DB_CLEANUP.md`](../operations/LEGACY_DB_CLEANUP.md)).
- **Dependencias sin uso:** también se retiraron `spring-boot-starter-jersey`, `spring-boot-starter-data-rest` (con `spring.data.rest.detection-strategy`) y `spring-boot-starter-websocket`; RabbitMQ (`spring-boot-starter-amqp`) se mantiene.
- **Se conservan:** JNI (`co.wt.*`, `com.tritonik.*`), `com.hanoit.osrm`, `RoutingAdapterService` y los POJOs `business.object.Package`/`Place`/`Person` que usa el algoritmo.

## 3. Verificación post-retiro

- `mvn verify` verde (incl. `RefreshTokenServiceTest` en `routing.security.token`).
- JWT sin claim `role` → sin autenticación (no fallback DB).
- Requests a `/auth/**`, `/oauth/**`, `/hanoit/**` → 403 (denyAll).
- Rutas retiradas en T4 → 403 si caen fuera de `/api/v1/**`, 404/405 dentro de `/api/v1/**`.

Ver: `docs/api/ENDPOINT_MIGRATION_MAP.md`, `docs/adr/ADR-004-rest-endpoint-conventions.md`.
