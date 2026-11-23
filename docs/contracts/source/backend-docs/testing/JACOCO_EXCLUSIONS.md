# JaCoCo — exclusiones aprobadas (whitelist)

> **Gate:** `mvn verify` exige **≥ 90%** en LINE, CLASS y METHOD (bundle).
> Solo las rutas listadas aquí pueden aparecer en `<excludes>` de [`pom.xml`](../../pom.xml).

| Patrón | Motivo | Aprobado |
|--------|--------|----------|
| `co/wt/**` | Algoritmos terceros (JNI) | 2026-07-21 |
| `com/tritonik/**` | Algoritmos terceros (JNI) | 2026-07-21 |
| `**/service/geocoding/arcgis/**` | Cliente HTTP ArcGIS externo | 2026-07-21 |
| `**/service/geocoding/geocentrix/**` | Cliente HTTP Geocentrix externo | 2026-07-21 |
| `**/service/geocoding/strategy/v2/spi/provider/**` | SPI providers geocoding HTTP | 2026-07-21 |
| `**/GeocodingConfig*` | Wiring geocoding externo | 2026-07-21 |
| `**/business/object/ArcGisAddress*` | DTO respuesta ArcGIS | 2026-07-21 |
| `**/business/object/GeocentrixAddress*` | DTO respuesta Geocentrix | 2026-07-21 |
| `**/service/geocoding/GeocodingServiceImpl*` | Orquestador geocoding (HTTP externo) | 2026-07-21 |
| `**/service/geocoding/strategy/AbstractStrategy*` | Base estrategias geocoding | 2026-07-21 |
| `**/service/geocoding/strategy/SynchronousStrategy*` | Estrategia sync geocoding | 2026-07-21 |
| `com/hanoit/routing/controller/RoutingGeocodingController*` | Endpoints geocoding (HTTP externo) | 2026-07-21 |
| `com/hanoit/routing/v3/**` | Motor OSRM JNI + controllers v3; gate en CI `run-osrm-jni` | 2026-07-21 |
| `com/hanoit/osrm/**` | Wrapper OSRM JNI; gate en CI `run-osrm-jni` | 2026-07-21 |
| `com/hanoit/routing/controller/OsrmController*` | Controller OSRM JNI; gate en CI `run-osrm-jni` | 2026-11-13 |
| `com/hanoit/routing/controller/DeliveryControllerJNI*` | Controller delivery JNI; gate en CI `run-osrm-jni` | 2026-11-13 |
| `com/hanoit/routing/controller/SingleController*` | Controller OSRM v5 route; gate en CI `run-osrm-jni` | 2026-11-13 |
| `com/hanoit/routing/controller/NearestRoutingController*` | Controller OSRM v5 nearest; gate en CI `run-osrm-jni` | 2026-11-13 |
| `com/hanoit/routing/controller/MessengerRoutingController*` | Controller OSRM v5 messenger; gate en CI `run-osrm-jni` | 2026-11-13 |
| `com/hanoit/routing/service/billing/StripeService*` | Thin wrapper SDK Stripe; tests en StripeServiceTest + BillingServiceImpl | 2026-07-21 |
| `com/hanoit/routing/service/impl/JourneyPlanningServiceImpl*` | Algoritmo JNI (DoAlgorithmJNI); tests parciales en unit | 2026-07-21 |
| `com/hanoit/routing/config/RateLimitConfig*` | Redis/Bucket4j (infra externa; profile `!test`) | 2026-07-21 |
| `com/hanoit/routing/config/TwilioConfig*` | Wiring Twilio SMS externo | 2026-07-21 |
| `com/hanoit/routing/service/notification/TwilioSmsServiceImpl*` | Cliente Twilio SMS externo | 2026-07-21 |
| `com/hanoit/routing/security/token/RefreshToken*` | Entidad token persistido (DTO-like) | 2026-07-21 |
| `com/hanoit/routing/security/ratelimit/CachedBodyHttpServletRequest*` | Wrapper servlet rate-limit (infra) | 2026-07-21 |

**Gate principal (`mvn verify`):** `includes` limitado a Fase 4 + seguridad (`com/hanoit/routing/**`, JWT, converters, exception handlers). `com/hanoit/service/**` (proveedores de geocoding y servicio OSRM) queda fuera del gate.

Tras la unificación de la API (noviembre 2026) ya no existe `com/hanoit/controller/api/rest/**`: todos los controllers viven en `com/hanoit/routing/controller/**` y entran al gate, salvo los cinco del motor de ruteo listados arriba, que dependen del JNI y se cubren en el job de CI `run-osrm-jni`.

Proceso para añadir una exclusión: PR + fila en esta tabla + motivo de dependencia externa verificable.
