# Proposal

## Why

El legacy AngularJS habla con HanoitApi (`hanoit:9000/hanoit/api/v1`, OAuth2 *password grant* con un `Authorization: Basic` y un `client_secret` escritos en el frontend). El backend que se va a integrar es otro: el **HanoIT Gateway** (`/api/v1`, 133 endpoints en la colección Postman recibida), multi-tenant, con login por email y contraseña, JWT de acceso con refresco rotado, roles (`super_admin`, `tenant_admin`, `driver`) y una cabecera `X-Api-Key` obligatoria en todas las peticiones. Además cambia el modelo de negocio: los paquetes son entidades persistidas y la jornada se planifica en servidor (`POST /journeys/plan` con `settingsId` y `packageIds`), en vez de enviar el itinerario completo desde el navegador a OSRM como hacía `osrmHttp`.

Sin una capa de cliente común, cada feature de las fases siguientes (catálogos, ajustes, jornadas, rutas) repetiría el manejo de token, refresco, errores, paginación y coordenadas, y el `X-Api-Key` terminaría visible en el bundle del navegador. Conviene fijar esa base antes de construir pantallas.

## What Changes

- Añadir al servidor Express un **proxy del gateway** bajo `/gateway/**` que reescribe a `/api/v1/**`, inyecta `X-Api-Key` desde una variable de entorno, descarta cualquier `X-Api-Key` que mande el cliente, reenvía `Authorization` y admite subidas multipart sin almacenarlas en memoria. El navegador nunca ve la clave y no hay CORS.
- Añadir el mismo proxy al servidor de desarrollo de `ng-ruteando`, leyendo la clave de la misma variable de entorno.
- Crear la capa `core/api` en `ng-ruteando`: URL base `/gateway` desde el entorno, interceptores funcionales (token `Bearer`, refresco en 401 con una sola petición de refresco compartida y reintento único, normalización de errores sin `alert`), tipos `Page<T>` y `ApiError`, y modelos TypeScript de las respuestas capturadas.
- Crear `core/auth`: servicio de sesión sobre `TokenStorageService` (login, refresco, logout, perfil `GET /auth/me`), usuario actual como signal con rol y `tenantId`, y guards funcionales por autenticación y por rol.
- Crear `core/geo`: tipo `LatLng`, conversión entre `[lon, lat]` de GeoJSON, `[lat, lng]` de polilíneas y coordenadas de OpenLayers, y decodificador de polilíneas de precisión 5 (la cadena `geoJson` de las rutas **no** es GeoJSON, es una polilínea codificada).
- Definir cómo se obtienen los dominios maestros (`/master-domains`: `RouteTopology`, `OsrmProfile`, estados de paquete, etc.) para sustituir las constantes del legacy (`ROAD_RESTRICTION_TYPE`, `TYPE_LENGTH_OF_STAY`, estados de visita).
- Fijar el mapeo de entidades legacy → gateway que seguirán las fases de negocio, y qué endpoints entran o no en el alcance.
- Generar pruebas de contrato con fixtures extraídos de los ejemplos reales de la colección, saneados, y guardar la clave solo en variables de entorno (`.env.example` con nombres, `.env` ignorado por git).
- **BREAKING** respecto del plan anterior: la fase `core-http-auth` del roadmap se divide en este change (infraestructura) y una fase posterior solo de pantallas de acceso. `osrmHttp` y el payload de optimización del legacy no se portan; la planificación pasa a `POST /journeys/plan`.
- Fuera de alcance: pantallas (login, catálogos, jornadas, rutas, mapas), facturación (Stripe figura como no implementado), notificaciones y OTP, invitaciones, administración de tenants, registros de auditoría, canales STOMP y tiempo real, vistas de conductor, y los 8 endpoints marcados como "decisión de migración pendiente".

## Capabilities

### New Capabilities
- `gateway-proxy`: el servidor del repositorio y el servidor de desarrollo reenvían las peticiones del frontend al gateway, aportando la clave de API sin exponerla al navegador.
- `api-client-core`: el frontend consume el gateway mediante una capa común con URL base de entorno, autenticación por token, refresco de sesión, errores normalizados y paginación tipada.
- `auth-session`: el frontend gestiona el ciclo de vida de la sesión (login, refresco, cierre, perfil) y restringe el acceso a rutas por autenticación, rol y tenant.
- `geo-data-conventions`: el frontend interpreta y convierte de forma única las coordenadas y geometrías que devuelve el gateway.

### Modified Capabilities
- `auth-token-storage`: se amplía para exponer la caducidad del acceso y permitir el refresco anticipado (requisito añadido; depende de `consolidate-ng-ruteando` ya archivado).
- `frontend-environments`: la URL base de la API pasa a ser la ruta del proxy `/gateway` y se añaden las variables de entorno del servidor (`GATEWAY_URL`, `GATEWAY_API_KEY`) sin valores reales en el repositorio.

## Impact

- Código nuevo: `ng-ruteando/src/app/core/{api,auth,geo}/`, `ng-ruteando/proxy.conf.js` (sustituye al `.json` de `consolidate-ng-ruteando`), `server/gateway-proxy.js`, `scripts/extract-gateway-fixtures.mjs`, fixtures de prueba.
- Modificado: `server/server.js` (el proxy se registra antes de los analizadores de cuerpo, del estático y del comodín del SPA), `package.json` raíz, `.gitignore` (`.env`), `.env.example`, `CLAUDE.md`.
- Dependencias: una librería de proxy HTTP para Express en la raíz y, si se genera el cliente desde OpenAPI, un generador de tipos de desarrollo. Ninguna nueva en producción del frontend.
- Requiere: `upgrade-angular-21-ng-ruteando` y `consolidate-ng-ruteando` terminados y archivados.
- Riesgos: contrato incompleto (ver `design.md`: subida de CSV con 400, geocodificación sin cuerpo capturado, `nearest` y `messenger` con 500, sin ejemplos de error), y que la clave de gateway de la colección esté expuesta en un fichero fuera del repositorio.
- Sin impacto en `master/` ni en la lógica de auth Satellizer de `server/`.
