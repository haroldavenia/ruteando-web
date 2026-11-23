# Tests de carga (opt-in)

Los load tests **no bloquean** el CI principal. Se activan con el perfil Maven `-Pload`.

## Ejecución

```bash
# Perfil load (habilita geocoding.load.enabled)
mvn test -Pload

# Geocoding CSV (requiere servicio real; @Disabled por defecto en código)
mvn test -Pload -Dtest=GeocodingLoadTest -Dgeocoding.load.enabled=true

# Latencia de POST /api/v1/journeys/plan (100, 500 y 2000 paquetes).
# Requiere OSRM_DATA con colombia-car.osrm. El umbral de 60 s es informativo:
# superarlo no falla el test. El resultado queda en target/journey-plan-latency.json.
mvn test -Pload -Prun-osrm-jni -Dtest=JourneyPlanLatencyTest
```

## Smoke tests incluidos

| Test | Propiedad | Objetivo |
|------|-----------|----------|
| `AuthRateLimitLoadSmokeTest` | `-Pload` | 100 POST login → assert 429 tras umbral |
| `RoutingSingleLoadSmokeTest` | `-Pload` + OSRM datasets | Latencia p95 ruta single (si JNI disponible) |
| `GeocodingLoadTest` | `geocoding.load.enabled=true` | Lote CSV Colombia (integración real) |
| `JourneyPlanLatencyTest` | `-Pload` + `-Prun-osrm-jni` | Un plan síncrono con 100, 500 y 2000 paquetes. 60 s es informativo |

## CI

- Job **unit-integration** en `quality.yml` no ejecuta `-Pload`.
- Job **osrm-jni** ejecuta `mvn test -Prun-osrm-jni` y falla si no hay dataset. No incluye `-Pload`.

## Notas

- Rate limiting en tests E2E normalmente bypassa `RateLimitFilter`; `AuthRateLimitLoadSmokeTest` usa el filtro real con `RateLimitService` mockeado (ver `Flow11RateLimitingTest`).
- No enviar tráfico real a Brevo/Stripe/Twilio en load tests.
