/**=========================================================
 * Module: rw-confirm.js (FND-005)
 * Confirmación reutilizable. RwConfirm.ask({ title, message, confirmText, danger }) → promesa.
 * Usa $modal (ui.bootstrap) si existe; si no, $window.confirm.
 * Atributo: <button rw-confirm="places.confirmDelete" rw-confirm-action="vm.remove(p)" rw-confirm-danger="true">
 =========================================================*/
(function () {
  'use strict';

  App.factory('RwConfirm', ['$injector', '$q', '$window', function ($injector, $q, $window) {
    function t(key, params) {
      return $injector.has('$translate') ? $injector.get('$translate').instant(key, params) : key;
    }

    function ask(options) {
      options = options || {};
      var view = {
        title: t(options.title || 'ui.confirm.title'),
        message: t(options.message || 'ui.confirm.message', options.params),
        confirmText: t(options.confirmText || 'ui.actions.confirm'),
        cancelText: t('ui.actions.cancel'),
        danger: !!options.danger
      };
      if ($injector.has('$modal')) {
        return $injector.get('$modal').open({
          template:
            '<div class="modal-header"><h3 class="modal-title" id="rw-confirm-title">{{ view.title }}</h3></div>' +
            '<div class="modal-body"><p>{{ view.message }}</p></div>' +
            '<div class="modal-footer">' +
            '  <button type="button" class="btn btn-default" ng-click="$dismiss()">{{ view.cancelText }}</button>' +
            '  <button type="button" class="btn" ng-class="view.danger ? \'btn-danger\' : \'btn-primary\'" ng-click="$close(true)">{{ view.confirmText }}</button>' +
            '</div>',
          controller: ['$scope', function ($scope) { $scope.view = view; }],
          ariaLabelledBy: 'rw-confirm-title'
        }).result;
      }
      return $window.confirm(view.message) ? $q.when(true) : $q.reject('cancel');
    }

    return { ask: ask };
  }]);

  App.directive('rwConfirm', ['RwConfirm', function (RwConfirm) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.on('click', function (event) {
          event.preventDefault();
          RwConfirm.ask({ message: attrs.rwConfirm, danger: attrs.rwConfirmDanger === 'true' }).then(function () {
            scope.$eval(attrs.rwConfirmAction);
          });
          scope.$applyAsync ? scope.$applyAsync() : scope.$apply();
        });
      }
    };
  }]);
})();
