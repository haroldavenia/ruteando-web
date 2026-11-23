> **Estado: Actualizado** | Fase 1 incluida | 2026-04-14

# Optimizacion del Motor de Ruteo -- Marzo 2026

Documento tecnico que describe las mejoras algoritmicas implementadas en el motor de ruteo de HanoIT API, la arquitectura de integracion con OSRM-JNI, y como cada endpoint de ruteo maneja las diferentes complejidades del sistema (capacidades, restricciones, horarios, tipos de recurso).

---

## Indice

1. [Resumen de mejoras](#1-resumen-de-mejoras)
2. [Arquitectura OSRM-JNI](#2-arquitectura-osrm-jni)
3. [Algoritmos implementados](#3-algoritmos-implementados)
4. [Endpoints de ruteo por version](#4-endpoints-de-ruteo-por-version)
5. [Matriz de capacidades por endpoint](#5-matriz-de-capacidades-por-endpoint)
6. [Flujo detallado por endpoint](#6-flujo-detallado-por-endpoint)
7. [Bugs corregidos](#7-bugs-corregidos)
8. [Referencias cientificas](#8-referencias-cientificas)
9. [Adapter Layer (Fase 1)](#9-adapter-layer-fase-1)

---

## 1. Resumen de mejoras

### Antes (version anterior)

- Heuristica greedy Nearest-Neighbor de un solo inicio.
- Bug critico en `getMinOfRowBlackWhiteList`: la comparacion `< min` estaba comentada, causando tours esencialmente aleatorios.
- Clusterizacion K-Means con ordenamiento individual por cluster sin refinamiento.
- Sin mejora local post-construccion.

### Despues (version actual)

- **2-opt local search**: mejora iterativa por inversion de sub-segmentos.
- **Or-opt local search**: reubicacion de segmentos de 1, 2 y 3 clientes.
- **Clarke-Wright Savings**: construccion simultanea de rutas para multi-vehiculo, reemplazando K-Means + NN en el endpoint Messenger v2.
- **Hybrid Genetic Search (HGS)**: metaheuristica disponible para instancias grandes (>5 clientes).
- **Correccion de bugs criticos**: nearest-neighbor, indices de restricciones, punto de inicio de vehiculos.
- **Manejo correcto de rutas abiertas vs cerradas**: 2-opt y Or-opt ahora distinguen entre `backToDepot=true` (circuito cerrado) y `backToDepot=false` (ruta abierta).

---

## 2. Arquitectura OSRM-JNI

El motor de ruteo usa OSRM a traves de JNI (Java Native Interface) con dos funciones clave que son completamente independientes del algoritmo TSP:

```
                    +-------------------+
                    |   Request (JSON)  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Endpoint (Java)  |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
   +----------v----------+      +----------v----------+
   | OSRM table() [JNI]  |      | OSRM route() [JNI]  |
   | Matriz de distancia  |      | Geometria de ruta    |
   | (entrada al TSP)     |      | (salida del TSP)     |
   +----------+-----------+      +----------+-----------+
              |                             |
   +----------v----------+                  |
   |  Algoritmo TSP      |                  |
   |  (NN + 2-opt +      |                  |
   |   Or-opt / CW / HGS)|                  |
   +----------+-----------+                  |
              |                             |
              +--- orden de visita --------+
              |                             |
   +----------v-----------------------------v---+
   |          Response (JSON)                    |
   |  geoJson, instructions, packages, etc.     |
   +---------------------------------------------+
```

### Separacion de responsabilidades

| Componente | Responsabilidad | Clase |
|------------|----------------|-------|
| **OSRM `table()`** | Calcular la **matriz NxN** de tiempos de viaje entre todos los puntos | `OsrmServiceManager.table()` via `DistanceTableDAOJNI` |
| **Algoritmo TSP** | Determinar el **orden optimo** de visita usando la matriz | `DistanceTable`, `TravelingSalesman`, `ClarkeWrightSavings`, `HybridGeneticSearch` |
| **OSRM `route()`** | Generar la **geometria de ruta** (polyline, instrucciones) para los puntos ya ordenados | `OsrmDAOJNI.getViarouteResponseJNI()` o `OsrmDAOJNI.getOSRMviarouteJNI()` |

El TSP nunca calcula distancias por su cuenta -- siempre usa la matriz OSRM. Y el OSRM route nunca reordena puntos -- siempre respeta el orden dado.

---

## 3. Algoritmos implementados

### 3.1 Nearest-Neighbor (NN) mejorado

**Clase:** `TravelingSalesman.tspNearestNeighbor()`

Heuristica greedy multi-inicio: prueba cada cliente como punto de partida y conserva el tour con menor tiempo total. Ahora integrado con 2-opt y Or-opt como refinamiento post-construccion.

**Complejidad:** O(n^2) por cada inicio, O(n^3) total con multi-inicio.

### 3.2 2-opt Local Search

**Clase:** `DistanceTable.twoOpt()` / `OsrmDistanceTableResponse.twoOpt()`

Mejora iterativa: para cada par de aristas (i,j), evalua si invertir el sub-segmento entre i y j reduce el costo total. Repite hasta que no se encuentren mas mejoras.

```
Antes:  depot -> A -> B -> C -> D -> E -> depot
                      \_________/
                       invertir?

Si d(A,D) + d(B,E) < d(A,B) + d(D,E):
Despues: depot -> A -> D -> C -> B -> E -> depot
```

**Comportamiento segun `backToDepot`:**
- `backToDepot=true`: optimiza circuito cerrado `[0, c1, ..., cN, 0]`.
- `backToDepot=false`: optimiza ruta abierta `[0, c1, ..., cN]` sin penalizar el retorno.

### 3.3 Or-opt Local Search

**Clase:** `DistanceTable.orOpt()` / `OsrmDistanceTableResponse.orOpt()`

Complementa 2-opt: intenta reubicar segmentos de 1, 2 y 3 clientes consecutivos en la mejor posicion del tour. Encuentra mejoras que 2-opt no puede detectar (movimientos de insercion vs inversion).

### 3.4 Clarke-Wright Savings

**Clase:** `ClarkeWrightSavings.buildRoutes()`

Algoritmo de construccion para VRP (Vehicle Routing Problem). Reemplaza K-Means + NN para el endpoint Messenger v2 cuando se necesitan multiples rutas.

**Funcionamiento:**
1. Calcula "ahorros" `s(i,j) = d(depot,i) + d(depot,j) - d(i,j)` para cada par de clientes.
2. Ordena ahorros de mayor a menor.
3. Fusiona rutas iterativamente por los extremos mientras el numero de rutas sea mayor al deseado.
4. Aplica 2-opt + Or-opt a cada ruta resultante.

**Ventaja sobre K-Means:** Agrupa y ordena simultaneamente considerando la distancia real de la red vial (via OSRM), no la distancia euclidiana.

### 3.5 Hybrid Genetic Search (HGS)

**Clase:** `HybridGeneticSearch.solve()`

Metaheuristica para instancias grandes. Disponible via `DistanceTable.getOptimizedTour()`.

**Parametros:**
- Poblacion: 20 individuos
- Generaciones: 50
- Seleccion por torneo (tamano 3)
- Cruce: Order Crossover (OX)
- Refinamiento: 2-opt + Or-opt por cada descendiente

**Uso:** Se activa automaticamente para instancias con >5 clientes cuando se invoca `getOptimizedTour()`.

---

## 4. Endpoints de ruteo por version

### v2 -- Delivery Controller (`/hanoit/v2/delivery/`)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/optimisationForMessenger` | POST | Ruteo para mensajeros. Multiples rutas con Clarke-Wright. |
| `/optimisationForPackages` | POST | Ruteo con evaluacion de capacidades (peso, volumen, tiempo, restricciones, recursos). |
| `/optimalRouteOfPointCloud` | POST | Ruteo simple de nube de puntos. Una sola ruta optimizada. |
| `/routeToPointCloud` | POST | Ruta directa sin optimizacion (orden del request). |
| `/collectionRoute` | POST | Ruteo de recoleccion con ventanas de tiempo. |

### v3 -- Routing Controller (`/hanoit/v3/routing/`)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/single` | POST | Ruta entre waypoints en orden fijo. Sin optimizacion. |
| `/nearest` | POST | Rutas mas cercanas a un punto central. |
| `/messenger` | POST | Ruteo messenger con K-Means++, tiempos de descanso, tiempos de descarga. |

---

## 5. Matriz de capacidades por endpoint

| Capacidad | Messenger v2 | Packages v2 | PointCloud v2 | Collection v2 | Messenger v3 |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Matriz OSRM (distancias reales) | SI | SI | SI | SI | SI |
| Ruta OSRM (geometria) | SI | SI | SI | SI | SI |
| 2-opt | SI | SI | SI | -- | SI |
| Or-opt | SI | SI | SI | -- | SI |
| Clarke-Wright Savings | SI | -- | -- | -- | -- |
| Multi-inicio NN | -- | SI | -- | -- | -- |
| K-Means clustering | -- | SI | -- | -- | SI (K-Means++) |
| Evaluacion de peso | -- | SI | -- | -- | -- |
| Evaluacion de volumen | -- | SI | -- | -- | -- |
| Evaluacion de tiempo max | -- | SI | -- | SI | -- |
| Restricciones de carga | -- | SI | -- | -- | -- |
| Asignacion de vehiculos | -- | SI | -- | SI | -- |
| Ventanas de tiempo | -- | -- | -- | SI | -- |
| Tiempos de descanso | -- | -- | -- | -- | SI |
| Tiempo de descarga | SI | SI | -- | -- | SI |
| Retorno al deposito | SI | SI | SI | -- | SI |
| Multiples rutas | SI | SI | -- | SI | SI |
| HGS disponible | -- | -- | SI* | -- | -- |

*SI = disponible via `getOptimizedTour()`, no activado por defecto.

---

## 6. Flujo detallado por endpoint

### 6.1 `optimisationForMessenger` (v2)

**Rol:** Ruteo puro para mensajeros. No evalua peso ni volumen.

```
1. Validar request (paquetes, deposito, backToDepot, numberOfRoutes)
2. Separar paquetes validos/invalidos (lat/lon null)
3. OSRM table() -> DistanceTable (primera pasada)
4. findBadPoints() -> identificar puntos inalcanzables
5. Remover bad points (orden inverso para evitar desplazamiento de indices)
6. OSRM table() -> DistanceTable (segunda pasada, sin bad points)
7. ClarkeWrightSavings.buildRoutes(distTable, numberOfRoutes, backToDepot):
   a. Calcular ahorros s(i,j) usando la matriz OSRM
   b. Fusionar rutas por ahorros decrecientes
   c. Por cada ruta: aplicar 2-opt + Or-opt
8. Por cada ruta CW:
   a. Mapear indices -> paquetes
   b. OSRM route() -> geometria (polyline, instrucciones, viaPoints)
   c. Calcular distancias y tiempos de arribo por paquete
9. Crear Journey con rutas y persistir en MongoDB
```

### 6.2 `optimisationForPackages` (v2)

**Rol:** Ruteo con evaluacion completa de capacidades y restricciones.

```
1. Validar request y determinar TypeOfAlgorithm:
   - evalTime: solo tiempo
   - evalWeightTime: peso + tiempo
   - evalVolumeTime: volumen + tiempo
   - evalWeightVolumen: peso + volumen
   - evalWeightVolumenTime: peso + volumen + tiempo
   - evalRestriction: restricciones de carga
2. OSRM table() -> DistanceTable (deteccion de bad points)
3. Construir lista de PointCluster
4. DoAlgorithmJNI.startJNI():
   a. Calcular numero de clusters (puntos / visitas_por_hora * horas_laborales)
   b. K-Means clustering
   c. OSRM table() -> Constants.DISTANCETABLE (depot + puntos + centroides)
   d. Si evalRestriction:
      - Por cada restriccion: filtrar puntos, re-clusterizar, doItJNI()
      - Puntos restantes: vehiculos estandar, doItJNI()
   e. doItJNI() por cluster:
      i.   TravelingSalesman.tspNearestNeighbor() con multi-inicio
           -> getMinimumElementsDistTable(index, blackList, whiteList) [NN]
           -> twoOpt(indices) [mejora local]
           -> orOpt(indices) [mejora local]
      ii.  sumUp() -> calcular tiempo, peso, volumen del tour
      iii. inLimitJNI() -> validar contra limites del vehiculo
      iv.  Si OVER: quitar ultimo paquete, recalcular
           Si UNDER: agregar paquete del cluster, recalcular
      v.   searchBestVehiculeJNI() -> asignar vehiculo optimo
      vi.  routingJNI() -> OSRM route() para geometria
5. Crear Journey y persistir
```

### 6.3 `optimalRouteOfPointCloud` (v2)

**Rol:** Una sola ruta optimizada para una nube de puntos.

```
1. OSRM table() -> DistanceTable local
2. getMinimumElementsDistTable(backToDepot):
   a. Nearest-Neighbor desde el deposito
   b. 2-opt (cerrado o abierto segun backToDepot)
   c. Or-opt (cerrado o abierto segun backToDepot)
3. Mapear indices ordenados -> coordenadas
4. OSRM route() -> geometria
5. Crear Journey y persistir
```

### 6.4 `MessengerServiceImpl.route()` (v3)

**Rol:** Ruteo messenger avanzado con descansos, tiempos de descarga configurables.

```
1. Validar paquetes y configuracion
2. OSRM distance table -> OsrmDistanceTableResponse (deteccion de bad points)
3. Remover bad points (orden inverso)
4. K-Means++ clustering (numberOfRoutes clusters)
5. Por cada cluster:
   a. Crear sub-lista con deposito al inicio (y al final si returnToDepot)
   b. OSRM distance table -> OsrmDistanceTableResponse
   c. getMinimumElementsDistTable(returnToDepot):
      - Nearest-Neighbor + 2-opt + Or-opt
   d. Mapear indices -> paquetes ordenados
   e. OSRM route() -> geometria
   f. calculateTimeInitAndTimeEndPackage():
      - Asignar hora de inicio y fin a cada paquete
      - Sumar tiempos de descarga (configurables por paquete o globales)
   g. calculateBreakTimePackage() (si configurado):
      - Insertar periodos de descanso en la posicion correcta
      - Ajustar tiempos de paquetes posteriores al descanso
6. Retornar lista de RouteRouting
```

### 6.5 `collectionRoute` (v2)

**Rol:** Ruteo de recoleccion con ventanas de tiempo y multiples vehiculos.

```
1. Validar puntos, vehiculos y deposito
2. Router.calculate():
   a. Convertir a Cargo con coordenadas
   b. OSRM distance table -> matriz de tiempos
   c. Por cada vehiculo (corregido: usar punto de inicio correcto):
      - explorePath(): greedy nearest-neighbor recursivo
      - Respetar ventanas de tiempo (shiftStart, shiftEnd)
      - Respetar tiempo maximo laboral
   d. OSRM route() por cada ruta de vehiculo
3. Retornar ResponseArray con todas las rutas
```

---

## 7. Bugs corregidos

### 7.1 Comparacion `< min` comentada (critico)

**Archivos:** `DistanceTable.java`, `OsrmDistanceTableResponse.java`
**Metodo:** `getMinOfRowBlackWhiteList()`

La comparacion `distance_table[rowNumber][i] < min` estaba comentada, causando que el nearest-neighbor seleccionara el ultimo indice valido en vez del minimo. Los tours generados eran esencialmente aleatorios.

```java
// ANTES (bug):
if (rowNumber != i && whiteList.contains(i) && !blackList.contains(i)
    && !badIndexPoints.contains(i) /*&& distance_table[rowNumber][i] < min*/)

// DESPUES (corregido):
if (rowNumber != i && whiteList.contains(i) && !blackList.contains(i)
    && !badIndexPoints.contains(i) && distance_table[rowNumber][i] < min)
```

**Impacto:** Todos los endpoints que usan TSP con blacklist/whitelist (Packages v2, Messenger v2).

### 7.2 Punto de inicio incorrecto en Router (collection)

**Archivo:** `Router.java`
**Metodo:** `calculate()`

Todos los vehiculos partian del mismo punto (`this.points.get(0)`) en vez de su punto asignado.

```java
// ANTES (bug):
initialRoute[0] = this.points.get(0);
Cargo[] calc = explorePath(..., this.points.get(0), ...);

// DESPUES (corregido):
initialRoute[0] = this.points.get(i);
Cargo[] calc = explorePath(..., this.points.get(i), ...);
```

### 7.3 Indice incorrecto en validacion de restricciones

**Archivo:** `DeliveryControllerJNI.java`
**Metodo:** `optimisationForPackages()`

En el loop de validacion de restricciones, se usaba `type.getResource().get(j)` con el indice `j` de restricciones, causando `IndexOutOfBoundsException` o comparaciones incorrectas.

```java
// ANTES (bug): usaba resource con indice de restriction
cargo.getWeight() > type.getResource().get(j).getMaxiumWeight()

// DESPUES (corregido): usa la restriccion directamente
Restriction restriction = type.getRestriction().get(j);
cargo.getWeight() > restriction.getUpperWeightLimit()
```

### 7.4 Remocion secuencial de bad points

**Archivos:** `DeliveryControllerJNI.java`, `MessengerServiceImpl.java`

Al remover paquetes inalcanzables por indice de forma secuencial, los indices se desplazaban tras cada remocion, causando que el paquete incorrecto fuera marcado como no ruteable.

```java
// ANTES (bug): remocion secuencial
for (int i = 0; i < badPoints.size(); i++) {
    packages.remove(badPoints.get(i) - 1);  // indices se desplazan!
}

// DESPUES (corregido): remocion en orden inverso
sortedBadPoints.sort(Collections.reverseOrder());
for (int i = 0; i < sortedBadPoints.size(); i++) {
    packages.remove(sortedBadPoints.get(i) - 1);  // sin desplazamiento
}
```

### 7.5 Optimizacion ruta abierta vs cerrada

**Archivos:** `DistanceTable.java`, `OsrmDistanceTableResponse.java`, `ClarkeWrightSavings.java`

2-opt y Or-opt siempre optimizaban como circuito cerrado, incluso cuando `backToDepot=false`. Ahora se distingue correctamente:

- `backToDepot=true`: optimiza `[depot, c1, ..., cN, depot]` como circuito.
- `backToDepot=false`: optimiza `[depot, c1, ..., cN]` como ruta abierta.

---

## 8. Referencias cientificas

| Algoritmo | Referencia |
|-----------|-----------|
| 2-opt | Croes, G.A. (1958). "A Method for Solving Traveling Salesman Problems." Operations Research, 6(6), 791-812. |
| Or-opt | Or, I. (1976). "Traveling Salesman-type Combinatorial Problems and their Relation to the Logistics of Regional Blood Banking." Ph.D. Thesis, Northwestern University. |
| Clarke-Wright Savings | Clarke, G. & Wright, J.W. (1964). "Scheduling of Vehicles from a Central Depot to a Number of Delivery Points." Operations Research, 12(4), 568-581. |
| Hybrid Genetic Search | Vidal, T. (2022). "Hybrid genetic search for the CVRP: Open-source implementation and SWAP* neighborhood." Computers & Operations Research, 140, 105643. |
| Nearest Neighbor | Johnson, D.S. & McGeoch, L.A. (1997). "The Traveling Salesman Problem: A Case Study in Local Optimization." Local Search in Combinatorial Optimization, Wiley. |

---

*Ultima actualizacion: Marzo 2026*

---

## 9. Adapter Layer (Fase 1)

La Fase 1 introduce una **capa adaptadora** que conecta el nuevo modelo de datos MongoDB con el algoritmo JNI existente, sin modificar el algoritmo ni sus DTOs.

### Arquitectura

```
    Nuevo Modelo MongoDB              Adapter Layer               Algoritmo JNI (sin cambios)
    ──────────────────────    ─────────────────────────    ──────────────────────────────────
    RoutingSettings          →  RoutingAdapterService  →  Confg (maxTime, depot, flags)
    Resource                 →  buildConfg()            →  co.wt.delivery.Resource (capacity)
    ResourceType             →                          →  Restriction (weight/volume limits)
    RoutingPlace (depot)     →                          →  Depot (lat, lon, name)
    RoutingPackage           →  buildCargos()           →  Cargo (lat, lon, weight, volume)
                                                        →  BuildClusterPoint → PointCluster
                                                        →  DoAlgorithmJNI.startJNI()
    
    ResponseArray            ←  AlgorithmResultConverter←  Response[] (transport, cargo, geo)
    RoutingJourney           ←  buildJourney()          
    RouteNavigation          ←  buildNavigations()      
    JourneyMetrics           ←  buildMetrics()          
```

### Componentes

| Componente | Clase Java | Paquete |
|------------|-----------|---------|
| Adaptador de entrada | `RoutingAdapterService` | `com.hanoit.routing.adapter` |
| Convertidor de salida | `AlgorithmResultConverter` | `com.hanoit.routing.adapter` |
| Orquestador | `JourneyPlanningServiceImpl` | `com.hanoit.routing.service.impl` |

### RoutingAdapterService — Metodos publicos

| Metodo | Entrada | Salida | Descripcion |
|--------|---------|--------|-------------|
| `buildConfg()` | Settings, Resources, ResourceTypes, Place | `Confg` | Construye configuracion legacy con depot, flags, recursos, restricciones |
| `buildCargos()` | List<RoutingPackage> | `List<Cargo>` | Convierte paquetes a cargos con lat/lon, peso, volumen |
| `resolveRoutingProfile()` | ResourceType | `RoutingProfile` | Normaliza perfil OSRM (driving→car, cycling→bicycle, walking→foot) |
| `resolveShiftDuration()` | Settings, Resource | `int` (segundos) | Modo dual: settings global > resource individual |
| `resolveShiftStart()` | Settings, Resource | `Instant` | Modo dual: settings global > resource individual |
| `resolveBreakDuration()` | Settings, Resource | `int` (segundos) | Modo dual: settings global > resource individual |

### Modo Dual (Turno/Descanso)

La resolucion de parametros de jornada sigue la logica:

```
Si settings.shiftDurationSec >= 0 → usa valor global (aplica a TODA la flota)
Si settings.shiftDurationSec < 0 o null → usa resource.shiftDurationSec (individual)
Misma logica para shiftStartUtc y breakDurationSec
Default: 28800s (8h) para duracion, 0s para descanso
```

### routeTopology → backToDepot

| routeTopology | placeStartId | placeEndId | backToDepot | Waypoints depot |
|---------------|-------------|------------|-------------|-----------------|
| `depot_to_depot` | Requerido | Requerido | `true` | Inicio + Fin |
| `round_trip` | Requerido | = placeStartId | `true` | Inicio + Fin |
| `open_delivery` | Requerido | null | `false` | Solo Inicio |
| `open_pickup` | null | Requerido | `false` | Solo Fin |
| `flexible` | null | null | `false` | Ninguno |

### restrictionType → Flags del algoritmo

| restrictionType | evaluateWeight | evaluateVolume | fixedRoutes | Descripcion |
|-----------------|---------------|----------------|-------------|-------------|
| `fixed_routes` | false | false | N (entero) | Numero fijo de rutas |
| `resource_vs_time` | configurable | configurable | null | Por capacidad y jornada |
| `time_windows` | configurable | configurable | null | CVRPTW (Fase 2) |

### AlgorithmResultConverter — Metodos publicos

| Metodo | Entrada | Salida | Descripcion |
|--------|---------|--------|-------------|
| `buildJourney()` | ResponseArray, tenantId, settingsId | `RoutingJourney` | Construye jornada con rutas embebidas y waypoints |
| `buildNavigations()` | ResponseArray, tenantId, journeyId | `List<RouteNavigation>` | Extrae instrucciones y via points |
| `buildMetrics()` | RoutingJourney, tenantId | `JourneyMetrics` | Calcula KPIs de eficiencia |

### Tests del Adapter (45 tests)

- `RoutingAdapterServiceTest`: 37 tests (BuildConfg, BuildCargos, DualMode, ResolveRoutingProfile)
- `AlgorithmResultConverterTest`: 8 tests (single/multiple routes, depot handling, navigation, metrics)

---

### Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-04-14 | Agregada seccion Adapter Layer: RoutingAdapterService, AlgorithmResultConverter, modo dual, topologia, restricciones |
| 2026-03-30 | Version original con algoritmos y arquitectura OSRM-JNI |
