/**=========================================================
 * Module: api_config.js (FND-002)
 * Configuración única de la superficie /api/v1.
 * La base es relativa: server/server.js reenvía /api/v1/** a BACKEND_URL (ADR-0002).
 =========================================================*/
(function () {
  'use strict';

  App.constant('apiConfig', {
    baseUrl: '/api/v1',
    pageSize: 20,
    listAllMax: 1000,
    bulkConcurrency: 4,
    // POST /{recurso}/batch-delete admite como máximo 100 ids (más es 422).
    batchMax: 100,
    // Por encima de este número de paquetes, journeys/plan se pide con async=true (D11).
    planAsyncThreshold: 500,
    // Funciones condicionadas a configuración del backend.
    features: { pushWeb: false },
    // Lista blanca de `sort` por listado (docs/contracts/source/endpoints.md#ordenamiento-sort).
    sortable: {
      packages: ['createdAt', 'updatedAt', 'guideNumber', 'name', 'status', 'serviceType', 'city', 'geocodingStatus'],
      journeys: ['createdAt', 'updatedAt', 'name', 'status', 'totalServices', 'totalResources'],
      settings: ['createdAt', 'updatedAt', 'description', 'routeTopology', 'restrictionType'],
      users: ['createdAt', 'updatedAt', 'email', 'firstName', 'lastName', 'role', 'lastLoginAt'],
      places: ['name', 'type', 'createdAt', 'updatedAt'],
      resources: ['name', 'licensePlate', 'createdAt', 'updatedAt']
    }
  });
})();
