> **Estado: Actualizado** | Fase 1 incluida | 2026-04-14

# Logging y Configuracion MongoDB — Abril 2026

Documento tecnico que describe la estrategia de logging por ambiente, la configuracion del cliente MongoDB para resolver el problema de heartbeat, y las buenas practicas adoptadas para el registro de eventos en la aplicacion.

---

## Indice

1. [Problema resuelto: MongoDB HeartBeat Timeout](#1-problema-resuelto-mongodb-heartbeat-timeout)
2. [Arquitectura de logging](#2-arquitectura-de-logging)
3. [Perfiles de ambiente](#3-perfiles-de-ambiente)
4. [Appenders y archivos de log](#4-appenders-y-archivos-de-log)
5. [Niveles de log por paquete](#5-niveles-de-log-por-paquete)
6. [Buenas practicas adoptadas](#6-buenas-practicas-adoptadas)
7. [Archivos modificados](#7-archivos-modificados)
8. [Como ejecutar con un perfil](#8-como-ejecutar-con-un-perfil)
9. [Estructura de archivos de log](#9-estructura-de-archivos-de-log)

---

## 1. Problema resuelto: MongoDB HeartBeat Timeout

### Sintoma

El driver de MongoDB generaba excepciones `MongoSocketReadTimeoutException` durante el monitoreo de heartbeat del servidor:

```
com.mongodb.MongoSocketReadTimeoutException: Timeout while receiving message
    at com.mongodb.internal.connection.InternalStreamConnection.receive
    ...
    at com.mongodb.internal.connection.ServerMonitor$ServerMonitorRunnable.run
```

Estos errores aparecian periodicamente en consola aunque la base de datos funcionaba correctamente. El problema era que el `MongoClient` se creaba con un connection string simple sin configurar timeouts ni frecuencia de heartbeat.

### Solucion

Se configuro `MongoClientSettings` en `MongoConfig.java` con parametros explicitos:

```java
MongoClientSettings settings = MongoClientSettings.builder()
    .applyToClusterSettings(cluster -> cluster
        .hosts(List.of(new ServerAddress(host, Integer.parseInt(port))))
        .serverSelectionTimeout(30, TimeUnit.SECONDS))
    .applyToServerSettings(server -> server
        .heartbeatFrequency(30, TimeUnit.SECONDS)      // cada 30s (default: 10s)
        .minHeartbeatFrequency(5, TimeUnit.SECONDS))    // minimo 5s entre heartbeats
    .applyToSocketSettings(socket -> socket
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS))             // previene MongoSocketReadTimeoutException
    .applyToConnectionPoolSettings(pool -> pool
        .maxSize(50)                                    // max conexiones simultaneas
        .minSize(5)                                     // conexiones siempre listas
        .maxWaitTime(30, TimeUnit.SECONDS)
        .maxConnectionIdleTime(10, TimeUnit.MINUTES)
        .maxConnectionLifeTime(30, TimeUnit.MINUTES))
    .build();
```

| Parametro | Valor | Proposito |
|-----------|-------|-----------|
| `heartbeatFrequency` | 30s | Reduce la frecuencia de verificacion del servidor (default 10s era muy agresivo) |
| `minHeartbeatFrequency` | 5s | Tiempo minimo entre heartbeats acelerados tras un fallo |
| `socketReadTimeout` | 30s | Previene timeout en lecturas lentas del heartbeat |
| `connectTimeout` | 10s | Tiempo maximo para establecer conexion TCP |
| `maxSize` | 50 | Pool de conexiones para carga concurrente de ruteo |
| `minSize` | 5 | Conexiones calientes listas sin latencia de creacion |
| `maxConnectionIdleTime` | 10min | Libera conexiones ociosas para no saturar el servidor |

Adicionalmente, el nivel de log del driver MongoDB se configura en `WARN` (dev) o `ERROR` (prod) para suprimir el ruido de monitoreo interno.

---

## 2. Arquitectura de logging

### Antes (version anterior)

- `log4j.properties` como configuracion principal (framework antiguo).
- `debug=true` en `application.properties` habilitaba logging verbose de Spring para todo.
- Dependencias explicitas `log4j-core` y `log4j-api` en `pom.xml`, conflictuando con el Logback que Spring Boot incluye por defecto.
- `System.out.println` esparcidos en **19+ clases** del codigo fuente principal para debug, errores y diagnostico.
- `e.printStackTrace()` en bloques catch sin contexto ni nivel de severidad.
- Sin diferenciacion de ambientes: el mismo nivel de detalle en desarrollo y produccion.

### Despues (version actual)

```
logback-spring.xml          <-- Configuracion centralizada con perfiles
application.properties      <-- spring.profiles.active=dev (default)
application-dev.properties  <-- Niveles para desarrollo
application-prod.properties <-- Niveles para produccion
```

- **Framework**: Logback (incluido en `spring-boot-starter`) con SLF4J como facade.
- **Perfiles**: `dev`, `prod`, `default` -- cada uno con niveles y appenders distintos.
- **Cero `System.out.println`**: Todos reemplazados por `log.error/warn/info/debug/trace`.
- **Cero `e.printStackTrace()`**: Todos reemplazados por `log.error("mensaje", exception)`.
- **Dependencias eliminadas**: `log4j-core`, `log4j-api` removidas del `pom.xml`.

---

## 3. Perfiles de ambiente

### Perfil `dev` (desarrollo)

- Consola con colores y timestamps.
- Codigo de la aplicacion en **DEBUG** para trazabilidad completa.
- Spring y MongoDB en INFO/WARN para reducir ruido.
- Archivos de log activos para revision post-ejecucion.

### Perfil `prod` (produccion)

- **Sin salida a consola** -- todo va a archivos.
- Codigo de la aplicacion en **WARN** -- solo problemas y errores.
- Driver MongoDB en **ERROR** -- elimina completamente el ruido de heartbeat.
- Archivo separado `hanoit-error.log` para errores criticos.

### Perfil `default` (sin perfil especificado)

- Consola + archivos.
- Codigo de la aplicacion en **INFO**.
- Frameworks en WARN.

### Comparativa

| Aspecto | `dev` | `prod` | `default` |
|---------|-------|--------|-----------|
| Consola | Si (colores, solo WARN+) | No | Si (solo WARN+) |
| Archivo general | Si | Si | Si |
| Archivo de errores | Si | Si | Si |
| Nivel app (`com.hanoit`, `co.wt`, `com.tritonik`) | INFO | WARN | INFO |
| Nivel Spring | WARN | WARN | WARN |
| Nivel MongoDB driver | WARN | ERROR | WARN |
| Nivel root | INFO | WARN | INFO |

---

## 4. Appenders y archivos de log

La configuracion se encuentra en `src/main/resources/logback-spring.xml`.

### CONSOLE

- Solo activo en `dev` y `default`.
- Patron con colores: `%highlight(%-5level) [%thread] %cyan(%logger{36}) - %msg`
- Encoding UTF-8.

### FILE (rolling)

- Archivo: `logs/hanoit.log`
- Rotacion por tamano (50MB) y por dia.
- Historico: 30 dias, maximo 1GB total.
- Formato: `yyyy-MM-dd HH:mm:ss.SSS LEVEL [thread] logger:line - message`

### ERROR_FILE (solo errores)

- Archivo: `logs/hanoit-error.log`
- Filtro: solo `ERROR` y superior.
- Rotacion por tamano (50MB) y por dia.
- Historico: 60 dias, maximo 500MB total.
- Permite buscar rapidamente errores criticos sin filtrar el log general.

### Configurar directorio de logs

Por defecto los logs se escriben en `./logs/`. Para cambiar el directorio:

```bash
java -DLOG_DIR=/var/log/hanoit -jar HanoIT.jar
```

---

## 5. Niveles de log por paquete

### En `logback-spring.xml` (perfil `dev`)

| Paquete | Nivel | Justificacion |
|---------|-------|---------------|
| `com.hanoit` | INFO | Codigo de negocio: servicios, controladores, ruteo v3, routing Fase 1 |
| `com.hanoit.routing` | INFO | Fase 1+2: controllers, services, adapter, security, config |
| `co.wt` | INFO | Algoritmos TSP, modelos OSRM, utilidades de ruteo |
| `com.tritonik` | INFO | Algoritmos legacy JNI, DAOs de OSRM |
| `org.springframework.web` | WARN | Solo warnings/errors relevantes |
| `org.springframework.security` | INFO | Eventos de autenticacion |
| `org.springframework.data.mongodb` | INFO | Operaciones de Spring Data |
| `org.mongodb.driver` | WARN | Suprime heartbeat/monitoring interno |
| `org.springdoc` | INFO | Generacion de OpenAPI |

### En `application.properties` (global, todas las profiles)

```properties
logging.level.org.mongodb.driver=WARN
logging.level.org.mongodb.driver.cluster=WARN
logging.level.org.mongodb.driver.connection=WARN
```

Esto garantiza que incluso sin `logback-spring.xml`, el driver de MongoDB no inunde la consola.

---

## 6. Buenas practicas adoptadas

### Criterio de seleccion de nivel

| Nivel | Cuando usar | Ejemplo |
|-------|-------------|---------|
| `ERROR` | Fallos irrecuperables, excepciones no manejadas, errores de conexion criticos | `log.error("Error calculating distance table", e)` |
| `WARN` | Situaciones recuperables, fallbacks, datos faltantes que no detienen el flujo | `log.warn("Cluster has less than 1 point")` |
| `INFO` | Eventos significativos de negocio visibles en produccion | `log.info("Cantidad de paquetes a procesar [{}]", size)` |
| `DEBUG` | Diagnostico detallado: coordenadas, tiempos, geometria de ruta | `log.debug("Old coordinates: {} {}", lon, lat)` |
| `TRACE` | Volcado de matrices, datos muy verbosos para debugging profundo | `log.trace("Distance matrix:\n{}", matrixStr)` |

### Reglas aplicadas en el codigo

1. **Nunca `System.out.println`**: Todas las salidas van a traves del logger.
2. **Nunca `e.printStackTrace()`**: Se usa `log.error("contexto", exception)` que incluye el stacktrace completo en el log con contexto.
3. **Mensajes parametrizados**: Se usa `log.debug("valor: {}", var)` en lugar de concatenacion `log.debug("valor: " + var)` para evitar evaluacion innecesaria cuando el nivel no esta activo.
4. **Un logger por clase**: Declarado como campo estatico final.
5. **Errores con exception como ultimo argumento**: `log.error("mensaje", e)` para que Logback registre el stacktrace completo.

### Logger por framework

El proyecto usa dos facades de logging, ambas compatibles con Logback:

| Framework | Uso | Ejemplo |
|-----------|-----|---------|
| `org.apache.commons.logging.Log` | Clases existentes (legacy) | `protected final Log log = LogFactory.getLog(getClass());` |
| `org.slf4j.Logger` | Clases nuevas o modificadas | `private static final Logger log = LoggerFactory.getLogger(MyClass.class);` |

Ambas son mapeadas automaticamente a Logback por Spring Boot a traves de bridges (`jcl-over-slf4j`).

---

## 7. Archivos modificados

### Configuracion

| Archivo | Cambio |
|---------|--------|
| `src/main/java/com/hanoit/MongoConfig.java` | Configuracion de `MongoClientSettings` con heartbeat, timeouts y connection pool |
| `src/main/resources/logback-spring.xml` | **Nuevo.** Configuracion centralizada de Logback con perfiles dev/prod/default |
| `src/main/resources/application.properties` | Eliminado `debug=true` y niveles DEBUG excesivos. Agregado `spring.profiles.active=dev` y niveles MongoDB WARN |
| `src/main/resources/application-dev.properties` | **Nuevo.** Perfil de desarrollo con niveles DEBUG |
| `src/main/resources/application-prod.properties` | **Nuevo.** Perfil de produccion con niveles WARN/ERROR |
| `src/main/resources/log4j.properties` | **Eliminado.** Reemplazado por logback-spring.xml |
| `src/main/java/com/hanoit/AppConfig.java` | Eliminada referencia a `classpath:log4j.properties` en `@PropertySource` |
| `pom.xml` | Eliminadas dependencias `log4j-core` y `log4j-api` (Logback ya viene con Spring Boot) |

### Codigo fuente -- System.out.println eliminados

| Archivo | Cambios |
|---------|---------|
| `DeliveryControllerJNI.java` | `System.out.println` → `log.debug`/`log.error` (3 ocurrencias) |
| `DistanceTable.java` | `System.out.println` → `log.warn`/`log.trace`, `e.printStackTrace()` → `log.error` |
| `OsrmDistanceTableResponse.java` | `System.out.println` → `log.warn`/`log.trace`, `e.printStackTrace()` → `log.error` |
| `Router.java` | Agregado SLF4J logger. `System.out.println` → `log.debug` (7 ocurrencias) |
| `OsrmDAO.java` | Agregado SLF4J logger. `System.out.println` → `log.error`, `e.printStackTrace()` eliminados |
| `DistanceTableDAOJNI.java` | `System.out.println` → `log.error` |
| `OptimazionRouteJNI.java` | `System.out.println` → `log.error`/`log.debug`, `e.printStackTrace()` → `log.error` (12 ocurrencias) |
| `DoAlgorithmJNI.java` | `System.out.println` → `log.debug`, lineas vacias eliminadas |
| `JourneyConverterService.java` | `System.out.println` → `log.debug` (2 ocurrencias) |
| `VehiclePositionConsumerServiceImp.java` | Agregado SLF4J logger. `System.out.println` → `log.debug` |
| `OptimazionRoute.java` | Agregado SLF4J logger. `System.out.println` → `log.error` |
| `ControlInputs.java` | Agregado SLF4J logger. `System.out.println` → `log.error`, `e.printStackTrace()` eliminados |
| `DistanceTableDAO.java` | `System.out.println` → `log.error`/`log.warn` (5 ocurrencias) |
| `ViarouteResponse.java` | Agregado SLF4J logger. `System.out.println` → `log.debug` |
| `utils.java` | Agregado SLF4J logger. `System.out.println` → `log.debug` (2 ocurrencias) |
| `HTTPConnection.java` | Agregado SLF4J logger. `System.out.println` → `log.error`, `e.printStackTrace()` eliminados (5 ocurrencias) |
| `BuildCargo.java` | Agregado SLF4J logger. `System.out.println` → `log.error`, `e.printStackTrace()` eliminado |
| `MessengerServiceImpl.java` | `e.printStackTrace()` → `log.error` con `throw RuntimeException` (2 ocurrencias) |
| `OsrmDAOJNI.java` | `e.printStackTrace()` → `log.error` |
| `ValidateRequestOptimizationRoute.java` | Agregado SLF4J logger. `e.printStackTrace()` → `log.error` |
| `DataTest.java` | `e.printStackTrace()` → `log.error` |

**Total: 21 archivos, ~50+ ocurrencias de System.out.println/e.printStackTrace() eliminadas.**

---

## 8. Como ejecutar con un perfil

### Desarrollo (default)

```bash
mvn spring-boot:run
```

o

```bash
java -jar target/HanoIT-0.1.7.jar
```

Usa el perfil `dev` por defecto (`spring.profiles.active=dev` en `application.properties`).

### Produccion

```bash
java -Dspring.profiles.active=prod -jar HanoIT.jar
```

o con variable de entorno:

```bash
export SPRING_PROFILES_ACTIVE=prod
java -jar HanoIT.jar
```

### Cambiar directorio de logs

```bash
java -DLOG_DIR=/var/log/hanoit -Dspring.profiles.active=prod -jar HanoIT.jar
```

---

## 9. Estructura de archivos de log

```
logs/
  hanoit.log                    <-- Log general (INFO+ en dev, WARN+ en prod)
  hanoit-2026-03-24.0.log       <-- Archivo rotado por dia
  hanoit-2026-03-24.1.log       <-- Segundo archivo del mismo dia si supera 50MB
  hanoit-error.log              <-- Solo errores (ERROR+)
  hanoit-error-2026-03-24.0.log <-- Errores rotados por dia
```

### Ejemplo de formato de log

```
2026-03-24 14:30:45.123 DEBUG [http-nio-8000-exec-1] c.h.c.a.r.v2.DeliveryControllerJNI - java.path.library=/opt/libraries
2026-03-24 14:30:45.456 INFO  [http-nio-8000-exec-1] c.h.c.a.r.v2.DeliveryControllerJNI - Cantidad de paquetes a procesar [10]
2026-03-24 14:30:46.789 ERROR [http-nio-8000-exec-1] c.h.c.a.r.v2.DeliveryControllerJNI - Error in routing. Message: Connection refused
    at com.hanoit.controller.api.rest.v2.DeliveryControllerJNI.optimisationForMessenger(DeliveryControllerJNI.java:836)
    ...
```

En produccion, el mismo error apareceria en **ambos** archivos (`hanoit.log` y `hanoit-error.log`), permitiendo buscar rapidamente solo errores en el archivo dedicado.

---

## 10. Configuracion MongoDB — Fase 1 (`com.hanoit.routing.config`)

La Fase 1 introduce un segundo `MongoConfig` en `com.hanoit.routing.config.MongoConfig` que configura:

```java
@Bean
public MappingMongoConverter mappingMongoConverter(...) {
    converter.setTypeMapper(new DefaultMongoTypeMapper(null));
    return converter;
}
```

Esto **elimina el campo `_class`** de todas las colecciones nuevas (`tenants`, `users`, `resources`, `settings`, `packages`, `journeys`, etc.), haciendo los documentos agnósticos al framework.

### Componentes de startup con logs relevantes

| Componente | Clase | Logs emitidos |
|------------|-------|---------------|
| `MasterDomainSeeder` | `com.hanoit.routing.config.MasterDomainSeeder` | `INFO`: creación/verificación de catálogos del sistema (package_status, service_type, route_topology, etc.) |
| `IndexInitializer` | `com.hanoit.routing.config.IndexInitializer` | `INFO`: verificación de índices compuestos en las 12 colecciones al iniciar la aplicación |

Ejemplo de log de startup:

```
INFO  [main] c.h.r.c.MasterDomainSeeder - Seeded 9 master domains
INFO  [main] c.h.r.c.IndexInitializer - IndexInitializer: verifying compound indexes for all routing collections
INFO  [main] c.h.r.c.IndexInitializer - IndexInitializer: all indexes verified
```

### Niveles de log recomendados para Fase 1

| Paquete | Nivel recomendado (dev) | Descripcion |
|---------|------------------------|-------------|
| `com.hanoit.routing.controller` | DEBUG | Endpoints `/api/*` |
| `com.hanoit.routing.service` | DEBUG | Logica de negocio CRUD |
| `com.hanoit.routing.adapter` | DEBUG | Conversion modelo ↔ algoritmo |
| `com.hanoit.routing.security` | DEBUG | TenantInterceptor, TenantContext |
| `com.hanoit.routing.config` | INFO | MasterDomainSeeder, IndexInitializer |

---

### Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-14 | Agregados: `com.hanoit.routing` en niveles de log, MongoConfig sin `_class`, MasterDomainSeeder e IndexInitializer como componentes de startup |
| 2026-03-24 | Versión original con configuración MongoDB y eliminación de System.out.println |
