/**=========================================================
 * Module: rw-list-state.js (FND-005)
 * Estados uniformes de listados y detalles: cargando, vacío, error con «Reintentar».
 * <rw-list-state state="vm.state" retry="vm.reload()" create="vm.create()" empty-text="places.empty"></rw-list-state>
 =========================================================*/
(function () {
  'use strict';

  App.directive('rwListState', [function () {
    return {
      restrict: 'E',
      scope: { state: '=', retry: '&', create: '&', emptyText: '@', errorText: '=?', createText: '@' },
      template:
        '<div class="rw-list-state" ng-switch="vm.current()" role="status" aria-live="polite">' +
        '  <div ng-switch-when="loading" class="rw-state rw-state-loading"><em class="fa fa-circle-o-notch fa-spin" aria-hidden="true"></em> <span>{{ \'ui.state.loading\' | translate }}</span></div>' +
        '  <div ng-switch-when="empty" class="rw-state rw-state-empty">' +
        '    <em class="fa fa-inbox fa-2x" aria-hidden="true"></em><p>{{ (vm.emptyText || \'ui.state.empty\') | translate }}</p>' +
        '    <button type="button" class="btn btn-primary" ng-if="vm.hasCreate" ng-click="vm.create()">{{ (vm.createText || \'ui.actions.create\') | translate }}</button>' +
        '  </div>' +
        '  <div ng-switch-when="error" class="rw-state rw-state-error alert alert-danger">' +
        '    <em class="fa fa-exclamation-triangle" aria-hidden="true"></em> <span>{{ vm.errorText || (\'ui.state.error\' | translate) }}</span>' +
        '    <button type="button" class="btn btn-default btn-sm" ng-if="vm.hasRetry" ng-click="vm.retry()">{{ \'ui.actions.retry\' | translate }}</button>' +
        '  </div>' +
        '</div>',
      controllerAs: 'vm',
      bindToController: true,
      controller: ['$attrs', function ($attrs) {
        var vm = this;
        vm.hasRetry = !!$attrs.retry;
        vm.hasCreate = !!$attrs.create;
        vm.current = function () { return vm.state; };
      }]
    };
  }]);
})();
