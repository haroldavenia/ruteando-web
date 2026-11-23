# OSRM JNI — guía para el consumidor (este backend)

Este documento indica qué **debe hacer el backend** frente a **osrm-jni** (`com.hanoit:osrm-jni` **3.0.6**, ver [`pom.xml`](../pom.xml)). Alineado con el código de **osrm-java**: `OsrmRoutingJsonMapper`, `OsrmService` (orden de carga JNI y log con `java.library.path` si falla), y `JSONUtils` (`Jdk8Module` en el `ObjectMapper` interno).

---

## 1. Mensajes genéricos (`Route calculation returned empty result` / `Table calculation returned empty result`)

En **osrm-java**, `OsrmRoutingJsonMapper` usa ese texto cuando **`jsonResult` es `null` o en blanco**, **antes** de parsear JSON. No significa por sí solo “grafo OK pero OSRM misterioso”: suele indicar JNI que devolvió cadena vacía, motor/proceso mal cargado, o fallo aguas arriba **sin** cuerpo JSON.

**Qué hacer en el backend (antes de escalar al mantenedor del JAR):**

- Loguear el resultado **crudo**: `routeRaw(...)` / `tableRaw(...)`, o la cadena que llega al mapper si ya la tenéis en memoria.
- Comprobar **`osrm.properties` efectivo** (`-Dosrm.properties`), **`base.osrm`** y perfiles car|bicycle|foot (según cómo esté definido vuestro fichero; p. ej. claves `base.osrm`, `base.osrm.car`, etc.), **`OSRM_DATA`** / **`-Dosrm.data`**, y que los ficheros **`.osrm`** existan. Opcional en arranque: **`osrm.validate.dataset.paths=true`**.
- Si el JSON **no** está vacío pero la petición falla, el mapper lanza **`OsrmRoutingException`** con el **código** devuelto por OSRM cuando `!routes.isSuccess()` (o el equivalente en table) — ahí tenéis **mensaje + código** en JSON.

Pedir “códigos más finos desde nativo” solo para el caso **cadena vacía** es una **mejora posible** en librería/native; el diagnóstico útil **hoy** es: **JSON raw + rutas de ficheros + validación del dataset**.

---

## 2. `UnsatisfiedLinkError` / nativo no encontrado

En **osrm-java**, **`OsrmService`** intenta en orden: **`-Dosrm.jni.library`** → **`OSRM_JNI_LIBRARY`** → **`System.loadLibrary("osrm-jni")`**. Si falla, el **log ERROR** incluye **`java.library.path` completo** (contrastar con dónde copiasteis el binario).

**Qué hacer en el backend:**

- Preferir **ruta absoluta** al `.so`: `-Dosrm.jni.library=/ruta/a/libosrm-jni.so` o **`OSRM_JNI_LIBRARY`** equivalente.
- Asegurar que el **dynamic linker** vea también las librerías OSRM de las que depende ese `.so`: **`LD_LIBRARY_PATH`** (Linux), **ldconfig**, y **misma arquitectura** que la JVM (**amd64** vs **aarch64**).
- Revisar el **log de error** de la librería y contrastar con vuestra instalación.

La “matriz documentada por SO/arquitectura” es material de **despliegue** (vos elegís qué `.so` instaláis); el JAR documenta **orden de carga** y el nombre lógico **`osrm-jni`**.

---

## 3. Conflicto o advertencia de `org.json`

El **`pom.xml` de `osrm-jni`** no declara **`org.json`**; la librería usa **Jackson**. Si aparecen conflictos o advertencias relacionadas con **`org.json`**, suelen venir de **otras dependencias del proyecto consumidor**.

**Qué hacer en el backend:**

- Ejecutar **`mvn dependency:tree`** (o equivalente) **en esta aplicación** y ver **quién** arrastra `org.json`.
- Resolver en el **consumidor**: exclusiones Maven, alinear versiones, o shade **en la aplicación**. No es un requisito impuesto por el JAR `osrm-jni`.

---

## 4. `Optional` en modelos y `Jdk8Module`

En **osrm-java**, el parseo interno usa **`JSONUtils`** con un **`ObjectMapper` que ya registra `Jdk8Module`** (ver clase `JSONUtils` en osrm-java).

**Qué hacer en el backend:**

- Si solo usáis **`OsrmServiceManager.route(...)`** / **`table(...)`** y trabajáis con **modelos ya construidos** por la librería: **no** necesitáis registrar **`Jdk8Module`** vosotros.
- Si **vosotros** deserializáis JSON OSRM a **`Routes`** / **`Table`** con **vuestro propio `ObjectMapper`**: entonces sí debéis **`.registerModule(new Jdk8Module())`** (o equivalente). La dependencia **`jackson-datatype-jdk8`** puede venir transitiva de `osrm-jni`, pero el **módulo hay que registrarlo en cada mapper nuevo** que creéis.
- En este backend, **`OsrmModelObjectMapper#get()`** centraliza un `ObjectMapper` con **`Jdk8Module`** para serializar modelos osrm-jni (`Table`, etc.) sin repetir configuración.

---

## Resumen — acción práctica en el backend

| Tema | Acción práctica en el backend |
|------|--------------------------------|
| Mensajes vacíos | Log de `routeRaw` / `tableRaw`; validar rutas `.osrm` y variables; cuando el JSON venga de OSRM, **`OsrmRoutingException`** con **code** si `!isSuccess()`. |
| JNI | Path absoluto al `.so`; `LD_LIBRARY_PATH` para libs OSRM; arquitectura acorde a la JVM; leer log que incluye `java.library.path`. |
| `org.json` | Árbol de dependencias de **vuestra** app; no atribuir el conflicto al `osrm-jni` por defecto. |
| Jackson / `Optional` | `Jdk8Module` solo si montáis **vuestro** `ObjectMapper` sobre los mismos modelos. |
