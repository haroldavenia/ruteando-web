> **Estado: vigente** | Base `/api/v1` | 2026-11-17
>
> Las rutas `/hanoit/api/v1/geocoding*` y el lote `geocode_address_list` **no existen**.
> El alta masiva de direcciones es `POST /api/v1/packages/upload` (CSV). Ver
> [`../frontend/migration-guide.md`](../frontend/migration-guide.md) §9.

# Geocoding — contrato para el frontend

Base: `http://localhost:8000`. Autenticación JWT en todas las llamadas de este documento.

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

El `tenantId` sale del token. El cliente no lo envía.

| Método | Ruta | Uso en UI |
|--------|------|-----------|
| POST | `/api/v1/geocoding` | Dirección de texto → punto en el mapa |
| POST | `/api/v1/reverse-geocoding` | Pin del mapa → dirección |
| GET | `/api/v1/places/nearby?lon=&lat=&maxDistance=` | Depósitos cercanos al pin (metros, default `5000`) |
| GET | `/api/v1/zones/containing?longitude=&latitude=` | Zona cuyo polígono cubre el punto |

Configuración del motor (singleton, solo `super_admin`): `GET` y `PUT /api/v1/admin/geocoding-config`.

---

## Convención de coordenadas

Toda ubicación de la API nueva es un **GeoJSON Point**. El orden del array es `[longitud, latitud]`.

```json
{ "type": "Point", "coordinates": [-74.0721, 4.6097] }
```

El motor interno sigue usando `x` = longitud y `y` = latitud. El controller los convierte a GeoJSON antes de responder. El frontend no debe interpretar `x`/`y`.

---

## 1. Forward — `POST /api/v1/geocoding`

Convierte un texto en coordenadas. El cuerpo solo lleva `address` (obligatorio, máximo 500 caracteres). Ciudad y país van **dentro del texto**, no en campos separados.

```json
{ "address": "Calle 100 #15-20, Bogotá, Colombia" }
```

Antes de consultar al proveedor, el servidor elimina del texto los caracteres `<`, `>`, `{`, `}`, `[`, `]`, `|`, `\`, `^`, `~` y el acento grave.

### 200

```json
{
  "address": "Calle 100 #15-20, Bogotá",
  "standardizedAddress": "CL 100 15 20, BOGOTA, COLOMBIA",
  "location": { "type": "Point", "coordinates": [-74.0721, 4.6097] },
  "geocodingScore": 95.0,
  "geocodingStatus": "match",
  "city": "Bogotá",
  "country": "Colombia"
}
```

| Campo | Tipo | UI |
|-------|------|----|
| `address` | string \| null | Texto a mostrar |
| `standardizedAddress` | string \| null | Dirección normalizada; guardarla en el paquete si el usuario confirma |
| `location` | GeoJSON Point \| ausente | Centro del marcador. Ausente si no hubo match |
| `geocodingScore` | number 0–100 | Confianza. Umbral de “revisar a mano” lo define el producto |
| `geocodingStatus` | string | `match` \| `mean` \| `unmatch` \| `manual` \| `unprocessed` |
| `city`, `country` | string \| null | Rellenar el formulario de paquete/lugar |

Sin resultado el cuerpo es `200` con `geocodingStatus: "unmatch"` y sin `location`. No es un 404.

### 400

`address` vacío, ausente o de más de 500 caracteres → `ErrorResponse` con `error: "BAD_REQUEST"`.

---

## 2. Reverse — `POST /api/v1/reverse-geocoding`

```json
{
  "location": { "type": "Point", "coordinates": [-74.0721, 4.6097] }
}
```

`coordinates[0]` es longitud (−180…180) y `coordinates[1]` es latitud (−90…90). Si falta el punto o está fuera de rango → **400**.

La respuesta usa el mismo `GeocodingResponse` del forward. Si el proveedor no resuelve la coordenada, el estado es `unmatch` (no un 500).

---

## 3. Qué hacer con el resultado

Al confirmar en un formulario de paquete o lugar, persistir:

| Destino | Campos que salen del geocoding |
|---------|--------------------------------|
| `POST/PUT /api/v1/packages` | `address`, `standardizedAddress`, `location`, `geocodingScore`, `geocodingStatus`, `city`, `country` |
| `POST/PUT /api/v1/places` | `address`, `location` (obligatorio), `zoneId` si `GET /zones/containing` devolvió una zona |

`geocodingStatus: "manual"` se envía cuando el usuario arrastra el pin y no vuelve a geocodificar.

Etiquetas de estado: `GET /api/v1/master-domains/GeocodingStatus`.

---

## 4. CSV (sustituto del lote legacy)

`POST /api/v1/packages/upload` con `multipart/form-data`, campo `file`. Cualquier usuario autenticado del tenant.

### Formato

- Codificación UTF-8, con o sin BOM.
- Delimitador `,`. Si la cabecera no tiene comas, se usa `;` (exportaciones de Excel en español).
- Campos entre comillas dobles admitidos, con `""` para una comilla literal. Un campo **no** puede ocupar varias líneas.
- Las líneas en blanco se ignoran.
- La primera línea no vacía es la cabecera. Los nombres no distinguen mayúsculas y las columnas desconocidas se ignoran.
- El archivo debe terminar en `.csv` o llegar con un content type que contenga `csv`.

| Columna | Alias | Regla |
|---------|-------|-------|
| `address` | — | **Obligatoria** en la cabecera y en cada fila |
| `guideNumber` | `guide_number`, `tracking_code` | Única por tenant |
| `name`, `city`, `country`, `observation`, `category` | — | Texto |
| `postalCode` | `postal_code` | Texto |
| `longitude`, `latitude` | `lon`, `lat` | Número con `.` decimal. Van juntas o ninguna |
| `weight`, `volume` | — | Número con `.` decimal. `weight` en **gramos** y `volume` en **cm³** (unidades de plataforma, `GET /api/v1/units`). El backend no convierte: un archivo en kg se debe convertir antes de subirlo |
| `serviceType` | `service_type` | `delivery`, `pickup` o `mixed`; vacío = `delivery` |
| `receiver_name` | — | Nombre de quien recibe |

Cada paquete se crea con `status = pending` y `geocodingStatus = unprocessed`.

### Tope de filas

`GET /api/v1/packages/upload/limits` responde `{ maxRows, maxAddressesPerFile, effectiveLimit }`. `effectiveLimit = min(10000, config.maxAddressesPerFile del tenant)`, con 5000 si el tenant no lo define. Lo puede leer un `agent` (antes solo estaba en `/billing/usage`, de `tenant_admin`).

Si el archivo tiene más filas de datos que `effectiveLimit`, responde **422** sin guardar nada:

```json
{
  "error": "UNPROCESSABLE_ENTITY",
  "message": "CSV has 5200 rows; the limit for this tenant is 5000",
  "details": { "limit": 5000, "rows": 5200 }
}
```

### Respuestas

**200** aunque haya filas inválidas. Las filas válidas se guardan en lotes de 500; las inválidas se informan:

```json
{
  "totalRows": 150,
  "successCount": 148,
  "errorCount": 2,
  "errors": [
    { "row": 46, "message": "Missing required field: address" },
    { "row": 90, "message": "Invalid number in column 'weight': '1,5' (use '.' as decimal separator)" }
  ]
}
```

`row` es el **número de línea del archivo** (la cabecera es la línea 1). La UI debe listar `errors` aunque el HTTP sea 200. Mensajes posibles por fila: `Missing required field: address`, `Invalid number in column '…'`, `Invalid serviceType '…' (expected delivery, pickup or mixed)`, `Both longitude and latitude are required when one is present`, `guideNumber '…' is repeated in the file (first at line N)` y `guideNumber '…' already exists`.

**Guías duplicadas.** `guideNumber` es único por tenant cuando viene informado; vacío o solo espacios cuenta como ausente, y las filas sin guía nunca chocan entre sí. Si una guía se repite dentro del archivo se guarda la primera aparición y las siguientes salen como error de fila. Si ya existe en el tenant, la fila sale como `already exists`. Volver a subir el mismo archivo no duplica nada: cada fila ya cargada sale como `already exists`. `successCount` es el número de paquetes realmente guardados.

**400 `BAD_REQUEST`** para el archivo completo: vacío, que no es CSV, sin cabecera o sin columna `address`.

---

## 5. Admin del motor

`GET /api/v1/admin/geocoding-config` y `PUT` con el mismo cuerpo. No hay `{id}`: es un singleton.

```json
{
  "geocodingStrategyClassName": "com.hanoit.service.geocoding.ArcGisStrategy",
  "arcGisMaxAddressesPerRequest": 50,
  "arcGisMaxThreads": 4,
  "geocentrixMaxAddressesPerRequest": 20,
  "geocentrixMaxThreads": 2
}
```

Los cuatro enteros son obligatorios y ≥ 1. Rol distinto de `super_admin` → **403**.

---

## 6. Errores que la pantalla debe contemplar

| HTTP | `error` | Cuándo |
|------|---------|--------|
| 400 | `BAD_REQUEST` | Address vacío o coordenadas inválidas |
| 400 | `VALIDATION_ERROR` | Body del admin incompleto. `details` trae el campo |
| 401 | `UNAUTHORIZED` | JWT ausente o vencido |
| 403 | `FORBIDDEN` | Admin de geocoding sin rol `super_admin` |
| 422 | `UNPROCESSABLE_ENTITY` | CSV con más filas que `effectiveLimit` (`details {limit, rows}`) |
| 429 | `RATE_LIMIT_EXCEEDED` | No aplica a geocoding hoy; sí a login si la pantalla redirige |
| 500 | `INTERNAL_ERROR` | Fallo del proveedor |
