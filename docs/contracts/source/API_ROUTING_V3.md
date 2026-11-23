> **Estado: vigente** | Tag Swagger `Routing` | 2026-11-17
>
> El prefijo `/hanoit/v3/routing` **no existe**. El motor vive en **`/api/v1/routing`**
> y exige JWT. La planificación que se persiste es `POST /api/v1/journeys/plan`.

# Motor de ruteo — contrato para el frontend

Base: `http://localhost:8000`. Header `Authorization: Bearer <accessToken>`.

Hay dos familias. El SDD de cada pantalla debe elegir una y no mezclarlas.

| Familia | Persiste | Cuándo usarla |
|---------|----------|---------------|
| `/api/v1/routing/*` | No | Previsualizar una polilínea, una matriz o un clustering sobre coordenadas sueltas |
| `/api/v1/journeys/plan` | Sí (`journeys`, navegación, métricas) | Generar la jornada operativa del día |

| Método | Ruta | Qué calcula |
|--------|------|-------------|
| POST | `/api/v1/routing/route` | Une waypoints **en el orden enviado** |
| POST | `/api/v1/routing/directions` | Mismo cálculo, respuesta cruda de OSRM |
| POST | `/api/v1/routing/matrix` | Matriz de duración entre todos los puntos |
| POST | `/api/v1/routing/nearest` | Subconjunto de paquetes más cercanos a un centro |
| POST | `/api/v1/routing/messenger` | Clustering de mensajeros sobre coordenadas sueltas |
| POST | `/api/v1/routing/optimizations` | Orden nearest-first de una nube de puntos |
| POST | `/api/v1/routing/optimizations/point-route` | Ruta directa sobre esa nube |
| POST | `/api/v1/routing/optimizations/collection` | Recolección con flota |
| POST | `/api/v1/journeys/plan?mode=` | VRP persistido (`packages` o `messenger`) |

Perfiles OSRM admitidos en `route`: `car`/`driving`, `bicycle`/`cycling`, `foot`/`walking`.
Si no se envía `profile`, se usa el dataset `base.osrm`. Un valor fuera de la lista → **400**.

---

## 1. Ruta ordenada — `POST /api/v1/routing/route`

Une origen → destino 1 → destino 2 en el orden del array. Mínimo 2 puntos. Coordenadas WGS84.

```json
{
  "profile": "car",
  "locations": [
    { "latitude": 4.60971, "longitude": -74.08175 },
    { "latitude": 6.25184, "longitude": -75.56359 }
  ],
  "numberOfAlternatives": 0,
  "steps": true,
  "annotations": true,
  "geometries": "polyline",
  "overview": "full",
  "continueStraight": true
}
```

| Campo | Obligatorio | Valores |
|-------|-------------|---------|
| `locations` | Sí | `[{ latitude, longitude }]`, mínimo 2 |
| `profile` | No | `car` \| `driving` \| `bicycle` \| `cycling` \| `foot` \| `walking` |
| `numberOfAlternatives` | No | 0–3. Default 0 |
| `steps` | No | Default `true` |
| `annotations` | No | Default `true` |
| `geometries` | No | `polyline` \| `polyline6` \| `geojson`. Default `polyline` |
| `overview` | No | `simplified` \| `full` \| `false`. Default `full` |
| `continueStraight` | No | Default `true` |

### 200

```json
{
  "distance": 15230.5,
  "time": 1245.2,
  "geoJson": "olye...",
  "packages": [
    { "location": { "latitude": 4.60971, "longitude": -74.08175 }, "distance": 0, "time": 0 },
    { "location": { "latitude": 6.25184, "longitude": -75.56359 }, "distance": 15230.5, "time": 1245.2 }
  ]
}
```

| Campo | Unidad | UI |
|-------|--------|----|
| `distance` | metros | Distancia total |
| `time` | segundos | Duración total |
| `geoJson` | polyline o GeoJSON, según `geometries` | Capa del mapa |
| `packages[]` | distancia y tiempo **acumulados** hasta ese waypoint | Etiqueta de cada parada |

**400** si hay menos de 2 puntos, el perfil es desconocido o un parámetro es inválido.
**500** si OSRM no encuentra camino.

Para pintar la línea en un mapa web, pedir `"geometries": "geojson"`.

---

## 2. Directions y matrix

`POST /api/v1/routing/directions` y `POST /api/v1/routing/matrix` comparten este cuerpo.
`locations` aquí **no** es un array de objetos: es un array de strings `"latitud,longitud"`.

```json
{
  "locations": ["4.60971,-74.08175", "6.25184,-75.56359"],
  "numberOfAlternatives": 0,
  "steps": true,
  "annotations": true,
  "geometries": "geojson",
  "overview": "full",
  "continueStraight": true
}
```

Mínimo 2 puntos. Latitud −90…90, longitud −180…180. Un string mal formado → **400** con el índice.
Matrices de más de 500×500 son válidas pero lentas y pesadas: la UI debería advertir antes de dispararlas.

La respuesta es el JSON crudo de OSRM (`Routes` en directions, `Table` en matrix), no el DTO de `/route`.
En matrix usar `durations[i][j]` (segundos). Un `null` significa que ese par no tiene camino.

---

## 3. Nearest — `POST /api/v1/routing/nearest`

Elige los paquetes más cercanos a un centro. No persiste.

```json
{
  "configuration": {
    "cantNearestPackages": 2,
    "center": {
      "id": "depot-1",
      "nameStreet": "Bodega",
      "location": { "latitude": 4.65, "longitude": -74.08 }
    }
  },
  "packages": [
    { "id": "p1", "description": "Entrega", "nameStreet": "Calle 100", "location": { "latitude": 4.68, "longitude": -74.05 } },
    { "id": "p2", "description": "Entrega", "nameStreet": "Calle 80", "location": { "latitude": 4.67, "longitude": -74.09 } },
    { "id": "p3", "description": "Entrega", "nameStreet": "Calle 26", "location": { "latitude": 4.62, "longitude": -74.10 } }
  ]
}
```

`cantNearestPackages` es el tamaño del subconjunto y no puede superar la cantidad de paquetes. `center` y cada paquete usan `PointRouting` (`latitude`, `longitude`).

**400 `BAD_REQUEST`** (mensaje en español) si falta `configuration`, `cantNearestPackages`, `center` o su ubicación; si no hay paquetes, alguno no tiene `id` o ubicación, o hay ids repetidos; o si `cantNearestPackages` supera la cantidad de paquetes. **502 `ROUTING_ENGINE_UNAVAILABLE`** si OSRM no responde.

---

## 4. Messenger suelto — `POST /api/v1/routing/messenger`

Clustering sobre coordenadas que **no** están guardadas como paquetes. Para la jornada del tenant usar `journeys/plan?mode=messenger`.

```json
{
  "configuration": {
    "numberRoutes": 2,
    "returnToDepot": true,
    "unloadingTime": 300,
    "considerUnloadingTimePackage": true,
    "timeInit": "08:00:00",
    "depot": {
      "id": "depot-1",
      "nameStreet": "Bodega",
      "location": { "latitude": 4.65, "longitude": -74.08 }
    },
    "breakTime": { "timeInit": "12:00:00", "timeEnd": "13:00:00" }
  },
  "packages": [
    { "id": "p1", "description": "Entrega", "nameStreet": "Calle 100", "location": { "latitude": 4.68, "longitude": -74.05 }, "unloadingTime": 180 },
    { "id": "p2", "description": "Entrega", "nameStreet": "Calle 80", "location": { "latitude": 4.67, "longitude": -74.09 }, "unloadingTime": 180 },
    { "id": "p3", "description": "Entrega", "nameStreet": "Calle 26", "location": { "latitude": 4.62, "longitude": -74.10 }, "unloadingTime": 180 }
  ]
}
```

`timeInit` es hora local `HH:mm:ss` (no es un `Instant`). `numberRoutes` es la cantidad de rutas a armar y no puede superar la cantidad de paquetes.

**400 `BAD_REQUEST`** si falta `configuration`, `numberRoutes` (mínimo 1), `unloadingTime` o `considerUnloadingTimePackage`; si el depósito no tiene ubicación (es el inicio de cada ruta); si `depot` y `returnToDepot` no vienen juntos; si `breakTime` no trae inicio y fin, el inicio no es anterior al fin o falta `timeInit`; o si los paquetes fallan las mismas reglas de nearest. **502 `ROUTING_ENGINE_UNAVAILABLE`** si OSRM no responde.

---

## 5. Optimizaciones JNI — `/api/v1/routing/optimizations*`

Tres operaciones sobre una nube de puntos. El cuerpo es el modelo de carga del algoritmo (`configuration` + `cargoInput`), no el DTO de paquetes del tenant.

| Ruta | Resultado |
|------|-----------|
| `/optimizations` | Orden nearest-first y geometría |
| `/optimizations/point-route` | Una ruta directa por esa nube |
| `/optimizations/collection` | Recolección repartida en la flota de `configuration` |

Estas respuestas no se guardan. Si el usuario pulsa “guardar jornada”, la pantalla debe llamar a `POST /api/v1/journeys/plan` con los `packageIds` ya persistidos.

---

## 6. Jornada persistida — `POST /api/v1/journeys/plan`

**201 Created.** Ejecuta el VRP, guarda el resultado y devuelve el detalle (mismo shape que `GET /api/v1/journeys/{id}`).

```json
{
  "settingsId": "663f1a2b4c5d6e7f8a9b0c1d",
  "packageIds": ["663f1a2b4c5d6e7f8a9b0001", "663f1a2b4c5d6e7f8a9b0002"],
  "name": "Jornada 2026-11-17",
  "date": "2026-11-17T13:00:00Z"
}
```

| Campo | Obligatorio | Notas |
|-------|-------------|-------|
| `settingsId` | Sí | ObjectId de `/api/v1/settings`. De ahí salen topología, depósitos, turno y recursos |
| `packageIds` | Sí en modo `packages` | ObjectIds del tenant |
| `name` | No | Título que verá el listado |
| `date` | No | `Instant` UTC. El algoritmo usa `settings`; este campo es metadato de la petición |

Query `mode`:

| `mode` | Algoritmo | Cuándo |
|--------|-----------|--------|
| `packages` (default) | VRP multi-vehículo (capacidad, jornada, zonas) | Distribución del día |
| `messenger` | Rutas fijas (Clarke-Wright) | Mensajería con cantidad fija de rutas (`settings.restrictionType = fixed_routes`) |

**400** si `settingsId` es inválido o faltan paquetes. **404** si el settings o un paquete no es del tenant.

Los ids de paquete son ObjectId hexadecimales normales: el backend asigna internamente ids por posición antes de llamar al algoritmo y los traduce de vuelta (antes fallaba con `For input string`). El cálculo es síncrono; no hay medición publicada del tiempo para 100, 500 o 2000 paquetes.

### Respuesta que debe modelar el detalle de jornada

```json
{
  "id": "6650…",
  "tenantId": "6650…",
  "settingsId": "6650…",
  "settings": { "id": "6650…", "name": "CVRPTW Norte", "routeTopology": "round_trip", "restrictionType": "resource_vs_time" },
  "name": "Jornada 2026-11-17",
  "status": "completed",
  "totalServices": 42,
  "totalResources": 3,
  "totalZones": 2,
  "stats": { "minTime": 3200, "avgTime": 5400, "maxTime": 8100 },
  "invalidPackageIds": [],
  "routes": [
    {
      "routeIndex": 0,
      "name": "Ruta 1",
      "resourceId": "6650…",
      "resource": { "id": "6650…", "name": "Van Norte", "licensePlate": "ABC-123", "resourceTypeName": "NHR" },
      "geoJson": "olye…",
      "startRouteUtc": "2026-11-17T12:00:00Z",
      "finishRouteUtc": "2026-11-17T18:30:00Z",
      "distanceTraveled": 48200.0,
      "duration": 23400,
      "weightUsed": 180.5,
      "volumeUsed": 2.4,
      "weightUsagePercent": 72.2,
      "volumeUsagePercent": 40.0,
      "fuelCost": 35.1,
      "avgStayTime": 480,
      "legsCount": 14,
      "badPackageIds": [],
      "waypoints": [
        {
          "sequence": 0,
          "stopType": "depot",
          "packageId": null,
          "packageInfo": null,
          "placeId": "6650…",
          "coordinates": [-74.08, 4.65],
          "arrivalUtc": "2026-11-17T12:00:00Z",
          "departureUtc": "2026-11-17T12:10:00Z",
          "distance": 0,
          "distanceAccum": 0,
          "duration": 0,
          "durationAccum": 0,
          "weight": 0,
          "weightAccum": 180.5,
          "volume": 0,
          "volumeAccum": 2.4
        }
      ]
    }
  ],
  "resourceSummary": [
    { "typeId": "6650…", "typeName": "NHR", "available": 4, "used": 3, "usagePercent": 75.0, "routeIndexes": [0, 1, 2] }
  ],
  "createdAt": "2026-11-17T11:00:00Z",
  "updatedAt": "2026-11-17T11:00:05Z"
}
```

Unidades de plataforma ([`GET /api/v1/units`](endpoints.md#unidades-de-medida-apiv1units)):
`distance*` en metros, `duration*` y `avgStayTime` en segundos, `weight*` en gramos, `volume*` en
cm³, porcentajes 0–100. El backend no convierte; la UI convierte para mostrar (por ejemplo m → km).
`waypoints[].coordinates` es `[longitud, latitud]`.
Paradas `delivery` y `pickup`: traen `packageId` y `packageInfo = { id, trackingCode, address, status }`, donde `trackingCode` es la guía (`guideNumber` del paquete). Paradas `depot`: traen `placeId`, sin paquete.
La vuelta al depósito solo aparece como última parada cuando la topología del settings vuelve al depósito (`round_trip` o `depot_to_depot`); en `open_delivery` y `open_pickup` la ruta termina en el último servicio.
`invalidPackageIds` y `badPackageIds` son los que el algoritmo no pudo asignar: la UI debe listarlos, no ocultarlos.

`status` de la jornada: `planning` | `in_progress` | `completed` | `failed` | `cancelled`.
`stopType`: `depot` | `delivery` | `pickup`. Sale de `package.serviceType`: `pickup` da `pickup`, y `delivery` o `mixed` dan `delivery`. El backend ya no emite `service`, pero sigue en el catálogo `StopType` porque las jornadas planificadas antes del 2026-11-17 o migradas del legacy pueden traerlo: tratarlo como parada de servicio. Etiquetas en `GET /api/v1/master-domains/JourneyStatus` y `StopType`.

### Listado vs detalle

| Llamada | `routes` |
|---------|----------|
| `GET /api/v1/journeys?page=&size=` y `?status=` | **No viene.** Solo cabecera + `settings` |
| `GET /api/v1/journeys/{id}` y el `201` de `/plan` | Sí, con waypoints y resúmenes |
| `DELETE /api/v1/journeys/{id}` | Soft delete |

Paginación: `page` base 0, `size` default 20. Ver guía de frontend §1.

### Navegación y KPI

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/v1/journeys/{journeyId}/navigations` | Turn-by-turn de todas las rutas |
| GET | `/api/v1/journeys/{journeyId}/navigations/{routeIndex}` | Una ruta (`routeIndex` base 0) |
| GET | `/api/v1/journeys/{journeyId}/metrics` | KPI de la jornada |

`metrics` (`distance` en metros, `efficiency` en servicios por km, `weightAccum` en gramos, `volumeAccum` en cm³, `*Pct` 0–100): `distance`, `efficiency`, `weightAccum`, `volumeAccum`, `avgAttendWeightPct`, `avgAttendVolumePct`, `attendServicesPct`, `attendedRoutes`, `attendedServices`, `totalServices`, `usedResources`, `totalResources`, `attendedCustomers`.

La app del conductor no usa estas rutas: usa `/api/v1/driver/routes` (ver guía de frontend §12).

---

## 7. Diferencia que el SDD debe dejar explícita

| | `/routing/route` | `/routing/messenger` | `/journeys/plan` |
|--|------------------|----------------------|------------------|
| Entrada | Coordenadas | Coordenadas + depósito | `settingsId` + `packageIds` |
| Vehículos | 1, orden fijo | `numberRoutes` | Los recursos del settings |
| Restricciones | Geometría | Tiempo de descarga y depósito | Peso, volumen, jornada, zonas, topología |
| Se guarda | No | No | Sí |
| Mapa | `geoJson` de la respuesta | Geometría del clustering | `routes[].geoJson` |

---

### Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-11-18 | Unidades de plataforma fijas (g, cm³, cm, m, s) documentadas en respuestas, métricas y messenger (`unloadingTime` en segundos) |
| 2026-11-17 (b) | `stopType` `delivery`/`pickup` en lugar de `service`; `packageInfo.trackingCode`; ids hexadecimales en `/plan`; ejemplos válidos de nearest y messenger; 400 y 502 documentados |
| 2026-11-17 | Superficie real `/api/v1/routing` y `/api/v1/journeys/plan`. Contratos de route, directions, matrix, nearest, messenger y journey |
| 2026-04-14 | Sección de journeys sobre el prefijo anterior |
| 2026-03-30 | Endpoints v3 originales |
