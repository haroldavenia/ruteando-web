/**=========================================================
 * Module: master_domains.js (FND-003)
 * Catálogos del backend (GET /master-domains/{code}/values) con caché por sesión
 * y fallback local si el backend no responde.
 =========================================================*/
(function () {
  'use strict';

  // Fallback mínimo (claves del contrato v3). Solo se usa si la carga falla.
  App.constant('MASTER_DOMAINS_FALLBACK', {
    RestrictionType: ['fixed_routes', 'resource_vs_time', 'time_windows'],
    TypeLengthOfStay: ['fixed', 'define_itinerary'],
    RouteTopology: ['depot_to_depot', 'round_trip', 'open_delivery', 'open_pickup', 'flexible'],
    OsrmProfile: ['driving', 'cycling', 'walking'],
    ServiceType: ['pickup', 'delivery', 'mixed'],
    StopType: ['depot', 'delivery', 'pickup', 'service'],
    PackageStatus: ['pending', 'attended', 'unattended', 'cancelled'],
    GeocodingStatus: ['match', 'mean', 'unmatch', 'manual', 'unprocessed'],
    JourneyStatus: ['planning', 'in_progress', 'completed', 'failed', 'cancelled'],
    PlaceType: ['depot', 'warehouse', 'store', 'office', 'custom'],
    Role: ['super_admin', 'tenant_admin', 'agent', 'driver']
  });

  App.factory('MasterDomains', ['ApiClient', '$q', '$rootScope', '$log', 'MASTER_DOMAINS_FALLBACK',
    function (ApiClient, $q, $rootScope, $log, FALLBACK) {
      var cache = {};

      function fallback(code) {
        return (FALLBACK[code] || []).map(function (key, index) {
          return { key: key, label: key, description: null, active: true, sortOrder: index + 1, fallback: true };
        });
      }

      function sort(values) {
        return values.slice().sort(function (a, b) {
          var sa = a.sortOrder === null || a.sortOrder === undefined ? Infinity : a.sortOrder;
          var sb = b.sortOrder === null || b.sortOrder === undefined ? Infinity : b.sortOrder;
          return sa === sb ? String(a.key).localeCompare(String(b.key)) : sa - sb;
        });
      }

      /** Todos los valores (activos e inactivos), ordenados. Una petición por código y sesión. */
      function values(code) {
        if (!cache[code]) {
          cache[code] = ApiClient.get('/master-domains/' + encodeURIComponent(code) + '/values').then(sort, function (error) {
            $log.warn('[MasterDomains] ' + code + ': usando fallback local (' + (error && error.code) + ')');
            delete cache[code];
            return sort(fallback(code));
          });
        }
        return cache[code];
      }

      function activeValues(code) {
        return values(code).then(function (list) {
          return list.filter(function (v) { return v.active; });
        });
      }

      /** Etiqueta de una clave, incluidas las inactivas (registros antiguos). */
      function label(code, key) {
        return values(code).then(function (list) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].key === key) { return list[i].label; }
          }
          return key;
        });
      }

      /** Etiqueta síncrona si el dominio ya está en caché (para filtros). */
      var resolved = {};
      function labelNow(code, key) {
        if (!resolved[code]) {
          resolved[code] = {};
          values(code).then(function (list) {
            list.forEach(function (v) { resolved[code][v.key] = v.label; });
          });
        }
        return resolved[code][key] || key;
      }

      function invalidate() {
        cache = {};
        resolved = {};
      }

      $rootScope.$on('session:ended', invalidate);
      $rootScope.$on('tenant:changed', invalidate);

      return { values: values, activeValues: activeValues, label: label, labelNow: labelNow, invalidate: invalidate };
    }]);
})();
