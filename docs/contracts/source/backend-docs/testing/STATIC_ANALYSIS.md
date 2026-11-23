# Análisis estático (Maven)

El build ejecuta tres herramientas en la fase `verify` de Maven:

| Herramienta | Plugin | Config |
|-------------|--------|--------|
| Checkstyle | `maven-checkstyle-plugin` | [`config/checkstyle/checkstyle.xml`](../../config/checkstyle/checkstyle.xml) |
| SpotBugs | `spotbugs-maven-plugin` 4.9.8+ | [`config/spotbugs/exclude-filter.xml`](../../config/spotbugs/exclude-filter.xml) — requiere SpotBugs **4.9.8** para bytecode Java 25 |
| PMD | `maven-pmd-plugin` 3.27+ | ruleset curado [`config/pmd/ruleset.xml`](../../config/pmd/ruleset.xml); acotado a `com/hanoit/routing/**` y utilidades Fase 4 |

## Gate estricto (activo)

Los tres plugins corren con `failOnViolation=true` / `failOnError=true` en `verify`: **cualquier** violación nueva rompe el build. El alcance del gate es la superficie Fase 4 + seguridad transversal, idéntico al de JaCoCo (ver [`JACOCO_EXCLUSIONS.md`](JACOCO_EXCLUSIONS.md)):

- **Incluido:** `com/hanoit/routing/**` (excepto `v3`), `Jwt*`, `SecurityConfig`, `com/hanoit/exception/**`, `com/hanoit/converter/**`.
- **Excluido (JNI / OSRM / geocoding):** `co.wt`, `com.tritonik`, `routing/v3`, `com.hanoit.osrm`, `com.hanoit.service.*`, `business.object`, `GeocodingConfig`.
- Tras la unificación de la API (nov 2026) no existe `controller/api/rest/**`. Los controllers del motor de ruteo se movieron a `com.hanoit.routing.controller` y entran al análisis; solo conservan una supresión puntual de `IllegalCatch` (`OsrmController`, `DeliveryControllerJNI`) por la frontera JNI, igual que `JourneyPlanningServiceImpl`.

## Curación del ruleset PMD

El ruleset ([`config/pmd/ruleset.xml`](../../config/pmd/ruleset.xml)) usa `bestpractices` + `errorprone` con estas reglas ajustadas porque chocan con patrones idiomáticos ya presentes (no son supresiones por archivo, son política de reglas):

- **`GuardLogStatement` (deshabilitada):** el código usa logging parametrizado SLF4J (`log.info("x={}", v)`); los `{}` hacen las guardas `isXxxEnabled()` redundantes por diseño.
- **`AvoidFieldNameMatchingMethodName` (deshabilitada):** accessors fluidos estilo record (`RateLimitRule.capacity()`).
- **`ReturnEmptyCollectionRatherThanNull` (deshabilitada):** varios mappers/parsers retornan `null` a propósito para preservar la distinción "ausente vs vacío" del contrato JSON/persistencia (probado en `JourneyResponseTest`, `SettingsServiceImplTest`).
- **`AvoidLiteralsInIfCondition` (deshabilitada):** marca chequeos de frontera idiomáticos y dispatch de string de un solo uso.
- **`ImplicitFunctionalInterface` (deshabilitada):** SPIs de servicio de un método (no lambdas).
- **`AvoidDuplicateLiterals` (`skipAnnotations=true`):** los literales repetidos en anotaciones OpenAPI (`@ApiResponse`, `@Schema`) son metadatos de documentación.
- **`LooseCoupling` (`allowedTypes=org.bson.Document`):** tipo canónico del driver MongoDB, sin interfaz sustituible.
- **`AvoidCatchingNPE` (deshabilitada):** única ocurrencia que protege el getter primitivo legacy `co.wt.Cargo.getUnloadingTime()` (desempaqueta un `Integer` nullable).

## Ejecución local

```bash
# Todo el gate de calidad
mvn verify

# Solo análisis estático
mvn checkstyle:check spotbugs:check pmd:check
```

## IDE (IntelliJ / Cursor)

1. **Checkstyle:** Settings → Editor → Code Style → Checkstyle → importar `config/checkstyle/checkstyle.xml`.
2. **SpotBugs:** plugin SpotBugs opcional; en CI manda el reporte HTML en `target/spotbugsXml.xml`.
3. **PMD:** `mvn pmd:pmd` genera `target/site/pmd.html`.

## Supresiones

- **Checkstyle** ([`config/checkstyle/suppressions.xml`](../../config/checkstyle/suppressions.xml)): paquetes fuera del gate (`co.wt`, `com.tritonik`, `routing/v3`, `osrm`, `business.object`, `service.geocoding`, `GeocodingConfig`). Excepción puntual documentada: `JourneyPlanningServiceImpl` `IllegalCatch` — el DAO JNI legacy `com.tritonik` declara `throws Exception`, forzando el `catch (Exception)`; la firma legacy no se modifica sin aprobación (`.cursorrules`).
- **SpotBugs** ([`config/spotbugs/exclude-filter.xml`](../../config/spotbugs/exclude-filter.xml)): getters/setters Lombok (`EI_EXPOSE_REP`), paquetes legacy (mismo alcance que el gate), y dos casos forzados por framework/legacy documentados inline: `SecurityConfig` (Spring `HttpSecurity.build()` declara `throws Exception`) y `AlgorithmResultConverter` (`DCN_NULLPOINTER` sobre el getter primitivo legacy de `Cargo`).
- **RefreshTokenService / JourneyPlanningServiceImpl:** los rethrow `RuntimeException` crudos se reemplazaron por excepciones de dominio (`RefreshTokenOperationException`, `RoutingCalculationException`).
