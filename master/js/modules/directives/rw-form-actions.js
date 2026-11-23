/**=========================================================
 * Module: rw-form-actions.js (FND-005)
 * Barra fija de acciones de formulario: Guardar (deshabilitado si inválido o guardando) y Cancelar.
 * <rw-form-actions form="vm.form" saving="vm.saving" on-cancel="vm.cancel()" submit-text="ui.actions.save"></rw-form-actions>
 =========================================================*/
(function () {
  'use strict';

  App.directive('rwFormActions', [function () {
    return {
      restrict: 'E',
      scope: { form: '=', saving: '=', onCancel: '&', submitText: '@' },
      template:
        '<div class="rw-form-actions">' +
        '  <span class="rw-form-dirty text-warning" ng-if="form.$dirty && !saving">{{ \'ui.form.unsaved\' | translate }}</span>' +
        '  <button type="button" class="btn btn-default" ng-click="onCancel()" ng-disabled="saving">{{ \'ui.actions.cancel\' | translate }}</button>' +
        '  <button type="submit" class="btn btn-primary" ng-disabled="saving || form.$invalid" aria-busy="{{ !!saving }}">' +
        '    <em class="fa fa-circle-o-notch fa-spin" ng-if="saving" aria-hidden="true"></em> {{ (submitText || \'ui.actions.save\') | translate }}' +
        '  </button>' +
        '</div>'
    };
  }]);
})();
