/**=========================================================
 * Module: rw-page-head.js (FND-005)
 * Cabecera de pantalla: título, subtítulo y acciones (transclusión).
 * <rw-page-head title="places.title" subtitle="places.subtitle"><button …></button></rw-page-head>
 =========================================================*/
(function () {
  'use strict';

  App.directive('rwPageHead', [function () {
    return {
      restrict: 'E',
      transclude: true,
      scope: { title: '@', subtitle: '@' },
      template:
        '<div class="content-heading rw-page-head">' +
        '  <div class="rw-page-head-actions pull-right" ng-transclude></div>' +
        '  <h1 class="rw-page-title">{{ title | translate }}</h1>' +
        '  <small ng-if="subtitle">{{ subtitle | translate }}</small>' +
        '</div>'
    };
  }]);
})();
