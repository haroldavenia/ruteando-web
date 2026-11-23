/**=========================================================
 * Module: rw-status-badge.js (FND-005)
 * Insignia de estado con etiqueta del catálogo + icono + tono (nunca solo color).
 * <rw-status-badge domain="PackageStatus" key="pkg.status"></rw-status-badge>
 =========================================================*/
(function () {
  'use strict';

  // Tono e icono por dominio y clave. Tonos: success, info, warning, danger, muted, primary.
  App.constant('RW_STATUS_TONES', {
    PackageStatus: {
      pending: ['info', 'fa-clock-o'], attended: ['success', 'fa-check'], unattended: ['warning', 'fa-exclamation'],
      cancelled: ['muted', 'fa-ban'], returned: ['muted', 'fa-undo']
    },
    JourneyStatus: {
      planning: ['info', 'fa-cogs'], planned: ['info', 'fa-calendar-check-o'], in_progress: ['primary', 'fa-truck'],
      completed: ['success', 'fa-flag-checkered'], failed: ['danger', 'fa-times'], cancelled: ['muted', 'fa-ban']
    },
    GeocodingStatus: {
      match: ['success', 'fa-map-marker'], mean: ['info', 'fa-crosshairs'], manual: ['primary', 'fa-hand-pointer-o'],
      unmatch: ['danger', 'fa-question'], unprocessed: ['muted', 'fa-hourglass-o']
    },
    Active: { 'true': ['success', 'fa-check-circle'], 'false': ['muted', 'fa-minus-circle'] },
    InvitationStatus: {
      pending: ['info', 'fa-envelope-o'], accepted: ['success', 'fa-check'], revoked: ['muted', 'fa-ban'], expired: ['warning', 'fa-clock-o']
    }
  });

  App.directive('rwStatusBadge', ['MasterDomains', 'RW_STATUS_TONES', function (MasterDomains, TONES) {
    return {
      restrict: 'E',
      scope: { domain: '@', key: '=', label: '@' },
      template: '<span class="rw-badge rw-badge-{{ tone }}"><em class="fa {{ icon }}" aria-hidden="true"></em> <span>{{ text }}</span></span>',
      link: function (scope) {
        function update() {
          var key = scope.key === undefined || scope.key === null ? '' : String(scope.key);
          var entry = (TONES[scope.domain] || {})[key] || ['muted', 'fa-circle-o'];
          scope.tone = entry[0];
          scope.icon = entry[1];
          scope.text = scope.label || key;
          if (!scope.label && scope.domain && TONES[scope.domain] && scope.domain !== 'Active' && scope.domain !== 'InvitationStatus') {
            MasterDomains.label(scope.domain, key).then(function (text) { scope.text = text; });
          }
        }
        scope.$watch('key', update);
      }
    };
  }]);
})();
