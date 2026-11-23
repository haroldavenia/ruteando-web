# Testing guide

> **Documento histórico (inventario Fase 1+2, abril 2026).**  
> **Fuente canónica Jul 2026:** [`README.md`](README.md) — `mvn verify`, JaCoCo 90%, análisis estático. Ver ADR-006.

![Total tests](https://img.shields.io/badge/total%20tests-1088-blue)
![Skipped](https://img.shields.io/badge/skipped-51-lightgrey)
![JaCoCo bundle](https://img.shields.io/badge/JaCoCo%20LINE%2FCLASS%2FMETHOD-%E2%89%A590%25-green)
![Gate](https://img.shields.io/badge/gate-mvn%20verify-brightgreen)

This document describes how the **hanoit-api** test suite is organized, what each major bucket covers, and how to run tests locally with or without external infrastructure (MongoDB, RabbitMQ, OSRM JNI).

**Last verified:** 2026-07-21 (`mvn verify` — 1088 tests, 0 failures).

---

## Table of contents

1. [Quick statistics](#quick-statistics)
2. [Phase 1 tests (`com.hanoit.routing.*`)](#phase-1-tests-comhanoitrouting)
3. [Legacy and algorithm tests](#legacy-and-algorithm-tests)
4. [Pre-existing integration failures](#pre-existing-integration-failures)
5. [Maven commands](#maven-commands)
6. [Coverage (JaCoCo)](#coverage-jacoco)
7. [Test stack and conventions](#test-stack-and-conventions)
8. [Troubleshooting](#troubleshooting)
9. [Changelog](#changelog)

---

## Quick statistics

| Metric | Count |
|--------|------:|
| **Total tests (Jul 2026)** | 1088 |
| **Skipped** | ~51 |
| **Failures / errors** | 0 (`mvn verify`) |
| **Gate** | JaCoCo 90% LINE/CLASS/METHOD + Checkstyle + SpotBugs + PMD |

*Las filas siguientes describen el inventario abril 2026 (referencia histórica).*

| **Total tests (abr 2026)** | 1012 |
| **Phase 1+2** (`com.hanoit.routing.*`) | ~386 (0 failures, 0 errors) |
| **Legacy + algorithm** | ~626 |
| **Pre-existing integration errors** | 41 (OSRM JNI native / MongoDB / RabbitMQ) |
| **Skipped** | 8 |

Phase 1 focuses on the new routing platform package: services, adapter layer, DTOs, security context, and configuration helpers. Legacy tests cover existing controllers, OAuth, geocoding, and the `co.wt.delivery.algorithm` module.

---

## Phase 1 tests (`com.hanoit.routing.*`)

**Total: ~386 tests** (all passing). Phase 1 base: 343 + Phase 2 additions (~43 new tests for enrichment, filters, summary DTOs, upload, etc.).

### Adapter layer (45 tests)

| Class | Tests | Notes |
|-------|------:|-------|
| `RoutingAdapterServiceTest` | 37 | BuildConfg: 12, BuildCargos: 5, DualMode: 10, ResolveRoutingProfile: 10 |
| `AlgorithmResultConverterTest` | 8 | Legacy algorithm output → new model |

### Services (175 tests)

| Class | Tests |
|-------|------:|
| `SettingsServiceImplTest` | 28 |
| `PackageServiceImplTest` | 21 |
| `PlaceServiceImplTest` | 18 |
| `RoutingUserServiceImplTest` | 18 |
| `ResourceServiceImplTest` | 16 |
| `ResourceTypeServiceImplTest` | 11 |
| `JourneyServiceImplTest` | 11 |
| `TenantServiceImplTest` | 9 |
| `MasterDomainServiceImplTest` | 8 |
| `ZoneServiceImplTest` | 7 |
| `DriverRouteServiceTest` | 6 |
| `JourneyPlanningServiceImplTest` | 4 |
| `MasterDomainSeederTest` (config) | 9 |
| `IndexInitializerTest` (config) | 4 |
| `TenantContextTest` (security) | 5 |

### Enums, DTOs, utilities, and mappers (107 tests)

| Class | Tests |
|-------|------:|
| `EnumSerializationTest` | 43 |
| `GeocodingStatusTest` | 8 |
| `TimeUtilsTest` | 14 |
| `CoordinateUtilsTest` | 9 |

**Response mapper and related tests** (nine areas below; **33** tests total):

| Area | Tests |
|------|------:|
| `PlaceResponse` | 3 |
| `ResourceTypeResponse` | 3 |
| `PackageResponse` | 4 |
| `JourneyResponse` | 3 |
| `UserResponse` | 3 |
| `ResourceResponse` | 4 |
| `SettingsResponse` | 4 |
| GeoJSON `Point` mapping | 6 |
| `PageResponse` | 3 |

### Migration (retired 2026-11-19)

`DataMigrationServiceTest` and `IntegrityValidationServiceTest` were deleted with `com.hanoit.routing.migration`: the platform starts clean. The cleanup script is covered by `com.hanoit.ops.DropLegacyCollectionsScriptTest`.

---

## Legacy and algorithm tests

These suites predate the Phase 1 routing package and remain valid regression coverage.

### Legacy controller and related tests

- **Controllers:** `GeocodingControllerTest`, `FileUploadControllerTest`, `TestControllerTest`, `VehicleControllerTest`, `TypeVehicleControllerTest`, `PlaceControllerTest`, `SettingControllerTest`, `ConfigurationControllerTest`, `CatalogControllerTest`
- **Services / cross-cutting:** `GeocodingServiceImplTest`, `PreConditionTest` (`GlobalExceptionHandlerTest` was replaced by `UnmappedRequestExceptionHandlerTest` on 2026-11-19)
- **OAuth:** `OAuth2ControllerTest` (12 tests)

### Algorithm module

Package **`co.wt.delivery.algorithm`** (JNI-facing and algorithm tests). See [Maven commands](#maven-commands) to run this slice in isolation.

---

## Pre-existing integration failures

**41 errors** on the verified run are **not** caused by Phase 1 routing code. They require native OSRM JNI, a running MongoDB, or RabbitMQ, depending on the test.

| Test class | Errors | Reason |
|------------|-------:|--------|
| `SingleRoutingProfileTest` | 10 | OSRM JNI native not available |
| `SingleRoutingParametersTest` | 10 | OSRM JNI native not available |
| `OsrmJni2IntegrationTest` | 9 | OSRM JNI native not available |
| `OsrmRouteSpecificationTest` | 9 | OSRM JNI native not available |
| `SecurityConfigTest` | 1 | Full `ApplicationContext` with native-backed beans |
| `UserServiceTest` | 1 | MongoDB required |
| `SendMessageRabbit` | 1 | RabbitMQ required |

To get a **green** run without that infrastructure, exclude these tests (see [Maven commands](#maven-commands)) or provide the corresponding services and native libraries.

---

## Maven commands

### Run all tests

```bash
mvn test
```

### Run only Phase 1 unit tests (no infra required)

Targets adapter, service implementations, DTOs, model, utilities, config, and security under `com.hanoit.routing`:

```bash
mvn test -Dtest="com.hanoit.routing.adapter.**,com.hanoit.routing.service.impl.**,com.hanoit.routing.dto.**,com.hanoit.routing.model.**,com.hanoit.routing.util.**,com.hanoit.routing.config.**,com.hanoit.routing.security.**" -DfailIfNoTests=false
```

### Full regression excluding infra-dependent tests

Excludes OSRM JNI routing specs, OSRM integration tests, `SecurityConfigTest`, Mongo-backed `UserServiceTest`, and RabbitMQ `SendMessageRabbit`:

```bash
mvn test -Dtest='!com.hanoit.routing.v3.single.SingleRoutingProfileTest,!com.hanoit.routing.v3.single.SingleRoutingParametersTest,!com.hanoit.osrm.OsrmJni2IntegrationTest,!com.hanoit.osrm.OsrmRouteSpecificationTest,!com.hanoit.SecurityConfigTest,!com.hanoit.oauth.service.UserServiceTest*,!com.hanoit.service.core.rabbitmq.SendMessageRabbit' -DfailIfNoTests=false
```

### Algorithm tests only

```bash
mvn test -Dtest="co.wt.delivery.algorithm.**" -DfailIfNoTests=false
```

---

## Coverage (JaCoCo)

| Item | Location / rule |
|------|-----------------|
| **HTML report** | `target/site/jacoco/index.html` (after `mvn verify`) |
| **Thresholds (vigente)** | LINE, CLASS, METHOD ≥ **90%** on scoped bundle — see [`README.md`](README.md) and [`JACOCO_EXCLUSIONS.md`](JACOCO_EXCLUSIONS.md) |
| **Histórico (obsoleto)** | 85% classes / 80% methods (Fase 2, superseded by ADR-006) |

Generate reports:

```bash
mvn verify
# or faster: mvn test jacoco:report
```

Then open `target/site/jacoco/index.html` in a browser.

---

## Test stack and conventions

| Technology | Usage |
|------------|--------|
| **JUnit 5** | Test lifecycle, parameterized tests where used |
| **Mockito** | `@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks` for service-level unit tests |
| **Spring Data MongoDB + Testcontainers** | Integration tests where the suite is wired for MongoDB |
| **AssertJ** | Fluent assertions (`assertThat(...)`) |

### Practices

- **Service tests:** Mock collaborators; assert behavior and edge cases (validation, multitenancy, soft-delete filters) without starting the full application when possible.
- **Integration tests:** Prefer Testcontainers for MongoDB when the test is meant to run in CI without a fixed host.
- **Native / OSRM:** Keep JNI-dependent tests in dedicated classes so they can be excluded from “fast” local runs (see commands above).

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Failures in `SingleRouting*`, `Osrm*` | OSRM JNI native library or datasets not on `java.library.path` |
| `UserServiceTest` failure | MongoDB not reachable or test profile mismatch |
| `SendMessageRabbit` failure | RabbitMQ broker not available |
| `SecurityConfigTest` failure | Full context requires beans that pull in native or external deps |

Use the [excluding Maven profile](#full-regression-excluding-infra-dependent-tests) for a quick signal on Java-only and Phase 1 logic.

---

## Changelog

| Date | Change |
|------|--------|
| **2026-07-21** | Banner: fuente canónica [`README.md`](README.md) + ADR-006. Badges y gate actualizados (`mvn verify`, 1088 tests, JaCoCo 90%). Umbrales 85%/80% marcados obsoletos. |
| **2026-04-14** | Replaced the short Spanish-only note with this guide: full-suite stats (969 total, 343 Phase 1), Phase 1 breakdown (adapter 45, services 175, enums/DTOs/utilities/mappers 107, migration 16), legacy controller list, documented 41 pre-existing infra-dependent failures, Maven recipes (all / Phase 1 / exclude infra / algorithm-only), JaCoCo location and thresholds (85% / 80%), stack (JUnit 5, Mockito, Testcontainers, AssertJ), troubleshooting, and badges. *(Raw inventory had “163 / 81 / 30” in some lines; tables use per-class sums that total 343.)* |
| *(prior)* | Earlier `docs/testing/TESTING.md` listed a subset of legacy unit tests, a long explicit `-Dtest=` list, JaCoCo line coverage notes, and integration-test caveats (~48 `@SpringBootTest` dependent on external services). |
