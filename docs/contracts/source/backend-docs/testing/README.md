# Testing — HanoIT API

## Pirámide de pruebas

| Capa | Ubicación | Cuándo usar |
|------|-----------|-------------|
| **Unit** | `src/test/java/**/**Test.java` (Mockito) | Lógica pura, validadores, mappers, handlers |
| **Integration** | `BaseIntegrationTest`, `BasePhase4E2ETest` | Servicios + Mongo Testcontainers; mocks solo en fronteras externas |
| **E2E flows** | `routing/e2e/Flow*.java` | Flujos Fase 4 completos (auth, billing, invitations, OTP) |
| **Load (opt-in)** | perfil `-Pload` | Smoke de carga; no bloquea CI principal |

## Comandos Maven

```bash
# Suite completa + JaCoCo + análisis estático (gate 90% LINE/CLASS/METHOD)
mvn verify

# Solo tests (más rápido)
mvn test

# OSRM JNI (requiere datasets + RUN_OSRM_JNI_TESTS=true)
mvn test -Prun-osrm-jni

# Tests de carga opcionales
mvn test -Pload

# Latencia de journeys/plan (OSRM_DATA + colombia-car.osrm). 60 s es informativo.
mvn test -Pload -Prun-osrm-jni -Dtest=JourneyPlanLatencyTest
```

## Gate JaCoCo

- **Alcance (`includes`):** `com/hanoit/routing/**`, JWT, converters, exception handlers, `SecurityConfig`.
- **Exclusiones:** solo las documentadas en [`JACOCO_EXCLUSIONS.md`](JACOCO_EXCLUSIONS.md).
- **Umbrales:** LINE, CLASS y METHOD ≥ **90%** en bundle (`mvn verify`).

## Variables de entorno en tests

| Variable | Default | Uso |
|----------|---------|-----|
| `RUN_OSRM_JNI_TESTS` | `false` | Activa tests OSRM JNI (`-Prun-osrm-jni` la fuerza a `true`) |
| `geocoding.load.enabled` | `false` | Activa `GeocodingLoadTest` con `-Pload` |

## Mocks permitidos (fronteras externas)

- **Stripe** — `StripeService`, webhooks simulados en E2E
- **Brevo** — `BrevoNotificationService` mockeado en E2E
- **Twilio** — SMS OTP
- **Geocoding HTTP** — ArcGIS/Geocentrix
- **Redis Bucket4j** — mockeado en profile `test`; `RateLimitConfig` excluido del gate principal

## CI

Workflow [`.github/workflows/quality.yml`](../../.github/workflows/quality.yml):

1. **unit-integration** — `mvn verify` (obligatorio; Jul 2026: 1088 tests, 0 fallos, ~51 skipped)
2. **osrm-jni** — `mvn test -Prun-osrm-jni`. No se salta: si no hay dataset el job falla. Hace falta la carpeta `datasets/osrm` (no se versiona) o el secret `OSRM_DATASET_URL`, que crea quien administra el repo. La URL tiene que ser HTTP externo: el grafo pesa unos 5,8 GB y un asset de GitHub Release no pasa de 2 GB. El tar.gz, al extraerse dentro de `datasets/osrm`, queda así:

```text
data/colombia/colombia-car.osrm*
data/colombia/colombia-bicycle.osrm*
data/colombia/colombia-foot.osrm*
lib/libosrm-jni.so
lib/libosrm.so
```

```bash
mkdir -p /tmp/osrm-ci/lib
cp -a /opt/osrm-v26.4.1/share/osrm/data /tmp/osrm-ci/data
cp -a /opt/osrm-v26.4.1/lib/libosrm-jni.so /opt/osrm-v26.4.1/lib/libosrm.so /tmp/osrm-ci/lib/
tar -C /tmp/osrm-ci -czf osrm-ci.tar.gz data lib
```

El runner instala `libtbbmalloc2` y exporta `OSRM_DATA`, `OSRM_JNI_LIBRARY` y `LD_LIBRARY_PATH`. Este job no usa `-Pload`.

## Documentación relacionada

- [`STATIC_ANALYSIS.md`](STATIC_ANALYSIS.md) — Checkstyle, SpotBugs, PMD
- [`LOAD_TESTS.md`](LOAD_TESTS.md) — perfil load
- [`JACOCO_EXCLUSIONS.md`](JACOCO_EXCLUSIONS.md) — whitelist de exclusiones
- [`../adr/ADR-006-quality-gates-static-analysis.md`](../adr/ADR-006-quality-gates-static-analysis.md) — decisión arquitectónica gates 90%
