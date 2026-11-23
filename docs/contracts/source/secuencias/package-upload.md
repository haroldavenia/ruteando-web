# Package CSV Upload Sequence

```mermaid
sequenceDiagram
    participant Client
    participant PackageController
    participant PackageService
    participant TenantRepository
    participant PackageRepository

    opt Mostrar el tope antes de subir
        Client->>PackageController: GET /api/v1/packages/upload/limits
        PackageController-->>Client: 200 {maxRows, maxAddressesPerFile, effectiveLimit}
    end

    Client->>PackageController: POST /api/v1/packages/upload (multipart, campo file)
    PackageController->>PackageService: processUpload(file, tenantId, userId)
    PackageService->>PackageService: validar archivo (no vacío, .csv o content type csv)
    PackageService->>PackageService: leer líneas no vacías con su número de línea
    PackageService->>PackageService: cabecera: quitar BOM, detectar , o ;, exigir address
    alt Archivo inválido
        PackageService-->>Client: 400 BAD_REQUEST
    end
    PackageService->>TenantRepository: findById(tenantId) → config.maxAddressesPerFile
    alt Filas > min(10000, maxAddressesPerFile)
        PackageService-->>Client: 422 UNPROCESSABLE_ENTITY {limit, rows} (no guarda nada)
    end

    loop Cada fila (lotes de 500)
        PackageService->>PackageService: parseCsvRow (campos con comillas)
        alt Fila válida
            PackageService->>PackageService: add to batch
        else Fila inválida
            PackageService->>PackageService: errors[] += {row: línea del archivo, message}
        end
        opt Batch size >= 500
            PackageService->>PackageRepository: saveAll(batch)
        end
    end

    opt Remaining batch
        PackageService->>PackageRepository: saveAll(remaining)
    end

    PackageService-->>PackageController: UploadSummaryResponse
    PackageController-->>Client: 200 {totalRows, successCount, errorCount, errors[]}
```

Reglas de columnas y mensajes: [`GEOCODING_API.md`](../../api/GEOCODING_API.md) §4.
