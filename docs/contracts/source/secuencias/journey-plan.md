# Journey Planning Sequence

```mermaid
sequenceDiagram
    participant Client
    participant JourneyController
    participant JourneyPlanningService
    participant SettingsRepository
    participant PackageRepository
    participant ResourceRepository
    participant RoutingAdapterService
    participant DoAlgorithmJNI
    participant AlgorithmResultConverter
    participant JourneyRepository

    Client->>JourneyController: POST /api/v1/journeys/plan?mode=packages {settingsId, packageIds, name}
    JourneyController->>JourneyPlanningService: createJourney(request, tenantId, userId)
    JourneyPlanningService->>SettingsRepository: findById(settingsId)
    SettingsRepository-->>JourneyPlanningService: RoutingSettings
    JourneyPlanningService->>PackageRepository: findAllById(packageIds)
    PackageRepository-->>JourneyPlanningService: List<RoutingPackage> (ObjectId hex)
    JourneyPlanningService->>ResourceRepository: findAllById(resourceIds)
    ResourceRepository-->>JourneyPlanningService: List<Resource>
    JourneyPlanningService->>RoutingAdapterService: buildConfg(settings, resources)
    RoutingAdapterService-->>JourneyPlanningService: Confg (backToDepot = round_trip | depot_to_depot)
    JourneyPlanningService->>RoutingAdapterService: buildCargos(packages)
    RoutingAdapterService-->>JourneyPlanningService: List<Cargo>
    JourneyPlanningService->>JourneyPlanningService: assignAlgorithmIds → "0", "1", … + map posición → packageId
    Note right of JourneyPlanningService: El algoritmo C++ solo acepta ids numéricos
    JourneyPlanningService->>DoAlgorithmJNI: execute(confg, cargos)
    Note right of DoAlgorithmJNI: Quita la vuelta al depósito solo si backToDepot
    DoAlgorithmJNI-->>JourneyPlanningService: Algorithm result
    JourneyPlanningService->>AlgorithmResultConverter: buildJourney(result, positional map)
    AlgorithmResultConverter-->>JourneyPlanningService: RoutingJourney (waypoints con packageId)
    JourneyPlanningService->>AlgorithmResultConverter: applyStopTypes(journey, serviceTypes)
    Note right of AlgorithmResultConverter: pickup → pickup; delivery/mixed → delivery; depot sin cambio
    JourneyPlanningService->>JourneyRepository: save(journey)
    JourneyRepository-->>JourneyPlanningService: RoutingJourney
    JourneyPlanningService->>JourneyPlanningService: enrichDetail(response, journey)
    Note right of JourneyPlanningService: SettingsSummary, ResourceSummary por ruta,<br/>packageInfo {id, trackingCode, address, status} por parada
    JourneyPlanningService-->>JourneyController: JourneyResponse (enriched)
    JourneyController-->>Client: 201 JourneyResponse
```

Errores: 400 `BAD_REQUEST` si `settingsId` es inválido o faltan paquetes; 404 si el settings o un
paquete no es del tenant. Contrato completo en [`API_ROUTING_V3.md`](../../api/API_ROUTING_V3.md) §6.
