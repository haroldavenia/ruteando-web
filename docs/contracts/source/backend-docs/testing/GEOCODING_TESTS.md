> **Estado: Sin cambios en Fase 1** | 2026-04-14

> [!NOTE]
> Las pruebas de geocodificación no fueron modificadas en la Fase 1. Continúan funcionando con la misma configuración descrita a continuación.

# Pruebas de Geocodificación (Geocentrix y Esri/ArcGIS)

Conjunto de pruebas para los geocodificadores Geocentrix y Esri/ArcGIS, usando el lote `address_NoRepetidas_Colombia.csv` como datos de prueba.

## Archivos de prueba

| Archivo | Descripción |
|---------|-------------|
| `GeocodingTestDataLoader` | Carga direcciones desde `address_NoRepetidas_Colombia.csv` |
| `GeocodingTestDataLoaderTest` | Pruebas unitarias del cargador (sin servicios externos) |
| `GeocodingGeocentrixIntegrationTest` | Pruebas de integración con Geocentrix |
| `GeocodingEsriIntegrationTest` | Pruebas de integración con Esri/ArcGIS |
| `GeocodingLoadTest` | Prueba de carga con el lote CSV completo |

## CSV de direcciones

- **Ubicación:** `src/main/resources/address_NoRepetidas_Colombia.csv`
- **Formato:** `ID;DIRECCION;CIUDAD;PAIS;LONGITUD;LATITUD` (separador `;`)
- **Registros:** ~7852 direcciones en Colombia

## Cómo ejecutar

### 1. Pruebas del cargador (sin servicios externos)

```bash
mvn test -Dtest=GeocodingTestDataLoaderTest
```

### 2. Pruebas de Geocentrix

Requiere `geocoding.geocentrix.enabled=true` y Geocentrix en `localhost:9091`.

```bash
mvn test -Dtest=GeocodingGeocentrixIntegrationTest
```

### 3. Pruebas de Esri/ArcGIS

Requiere `geocoding.arcgis.enabled=true` y el GeocodeServer de ArcGIS accesible.

```bash
mvn test -Dtest=GeocodingEsriIntegrationTest
```

### 4. Prueba de carga rápida (100 direcciones)

Usa la configuración actual de `general.properties`:

```bash
mvn test -Dtest=GeocodingLoadTest#loadTestQuick_hundredAddresses
```

### 5. Prueba de carga completa (lote CSV)

Procesa todas las direcciones del CSV en batches de 50:

```bash
mvn test -Dtest=GeocodingLoadTest -Dgeocoding.load.enabled=true
```

Limitar a 500 direcciones:

```bash
mvn test -Dtest=GeocodingLoadTest -Dgeocoding.load.enabled=true -Dgeocoding.load.limit=500
```

## Configuración para pruebas

Los tests de Geocentrix y Esri usan `@TestPropertySource` para forzar un solo proveedor:

- **GeocodingGeocentrixIntegrationTest:** `geocoding.arcgis.enabled=false`, `geocoding.geocentrix.enabled=true`
- **GeocodingEsriIntegrationTest:** `geocoding.arcgis.enabled=true`, `geocoding.geocentrix.enabled=false`

El `GeocodingLoadTest` usa la configuración por defecto de `general.properties`.

## Ejecutar todas las pruebas de geocodificación

```bash
mvn test -Dtest=GeocodingTestDataLoaderTest,GeocodingGeocentrixIntegrationTest,GeocodingEsriIntegrationTest,GeocodingLoadTest
```

**Nota:** Geocentrix debe estar disponible en `http://localhost:9091` para que pasen las pruebas de integración con ese proveedor.
