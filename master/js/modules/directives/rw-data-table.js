/**=========================================================
 * Module: rw-data-table.js (FND-005)
 * Tabla con página de servidor (page base 0), orden por columna, selección persistente
 * entre páginas y acciones por fila. Las celdas se pintan como texto.
 * <rw-data-table items="vm.page.items" total="vm.page.total" page="vm.page.page" size="vm.page.size"
 *   columns="vm.columns" actions="vm.actions" selection="vm.selected" on-page="vm.load(page)"
 *   on-sort="vm.sortBy(sort)" sort="vm.sort"></rw-data-table>
 =========================================================*/
(function () {
  'use strict';

  App.directive('rwDataTable', [function () {
    return {
      restrict: 'E',
      scope: {
        items: '=', total: '=', page: '=', size: '=', columns: '=', actions: '=?',
        selection: '=?', idField: '@', sort: '=?', onPage: '&', onSort: '&', caption: '@'
      },
      template:
        '<div class="rw-data-table table-responsive">' +
        '<table class="table table-striped table-hover">' +
        '  <caption class="sr-only" ng-if="caption">{{ caption | translate }}</caption>' +
        '  <thead><tr>' +
        '    <th ng-if="selection" class="rw-col-check"><input type="checkbox" ng-checked="vm.allSelected()" ng-click="vm.toggleAll()" aria-label="{{ \'ui.table.selectPage\' | translate }}"></th>' +
        '    <th ng-repeat="col in columns" ng-attr-aria-sort="{{ vm.ariaSort(col) }}">' +
        '      <button type="button" class="btn btn-link rw-sort" ng-if="col.sortable" ng-click="vm.sortBy(col)">{{ col.label | translate }} <em class="fa" ng-class="vm.sortIcon(col)" aria-hidden="true"></em></button>' +
        '      <span ng-if="!col.sortable">{{ col.label | translate }}</span>' +
        '    </th>' +
        '    <th ng-if="actions.length" class="rw-col-actions"><span class="sr-only">{{ \'ui.table.actions\' | translate }}</span></th>' +
        '  </tr></thead>' +
        '  <tbody><tr ng-repeat="row in items track by vm.id(row)" ng-class="{ \'rw-row-selected\': vm.isSelected(row) }">' +
        '    <td ng-if="selection"><input type="checkbox" ng-checked="vm.isSelected(row)" ng-click="vm.toggle(row)" aria-label="{{ \'ui.table.selectRow\' | translate }}"></td>' +
        '    <td ng-repeat="col in columns">{{ vm.cell(row, col) }}</td>' +
        '    <td ng-if="actions.length" class="text-right text-nowrap">' +
        '      <button type="button" ng-repeat="a in actions" ng-if="!a.visible || a.visible(row)" class="btn btn-sm" ng-class="a.danger ? \'btn-danger\' : \'btn-default\'" ng-click="a.onClick(row)" title="{{ a.label | translate }}" aria-label="{{ a.label | translate }}"><em class="fa {{ a.icon }}" aria-hidden="true"></em></button>' +
        '    </td>' +
        '  </tr></tbody>' +
        '</table>' +
        '<div class="rw-table-foot clearfix">' +
        '  <span class="rw-range">{{ \'ui.table.range\' | translate:vm.range() }}</span>' +
        '  <span class="rw-selected" ng-if="selection.length">{{ \'ui.table.selected\' | translate:{ count: selection.length } }}</span>' +
        '  <div class="btn-group pull-right" role="group" aria-label="{{ \'ui.table.pagination\' | translate }}">' +
        '    <button type="button" class="btn btn-default btn-sm rw-prev" ng-disabled="page <= 0" ng-click="vm.go(page - 1)" aria-label="{{ \'ui.table.prev\' | translate }}"><em class="fa fa-chevron-left" aria-hidden="true"></em></button>' +
        '    <span class="btn btn-default btn-sm disabled rw-page">{{ page + 1 }} / {{ vm.pages() }}</span>' +
        '    <button type="button" class="btn btn-default btn-sm rw-next" ng-disabled="page + 1 >= vm.pages()" ng-click="vm.go(page + 1)" aria-label="{{ \'ui.table.next\' | translate }}"><em class="fa fa-chevron-right" aria-hidden="true"></em></button>' +
        '  </div>' +
        '</div>' +
        '</div>',
      link: function (scope) {
        var vm = scope.vm = {};
        var idField = scope.idField || 'id';

        vm.id = function (row) { return row[idField]; };
        vm.pages = function () { return Math.max(1, Math.ceil((scope.total || 0) / (scope.size || 1))); };
        vm.range = function () {
          var total = scope.total || 0;
          var from = total === 0 ? 0 : scope.page * scope.size + 1;
          var to = Math.min(total, (scope.page + 1) * scope.size);
          return { from: from, to: to, total: total };
        };
        vm.go = function (page) {
          if (page < 0 || page >= vm.pages()) { return; }
          scope.onPage({ page: page });
        };
        vm.cell = function (row, col) {
          var value = col.format ? col.format(row) : row[col.key];
          return value === null || value === undefined ? '' : value;
        };
        vm.isSelected = function (row) { return !!scope.selection && scope.selection.indexOf(vm.id(row)) >= 0; };
        vm.toggle = function (row) {
          var index = scope.selection.indexOf(vm.id(row));
          if (index >= 0) { scope.selection.splice(index, 1); } else { scope.selection.push(vm.id(row)); }
        };
        vm.allSelected = function () {
          return !!(scope.items && scope.items.length) && scope.items.every(vm.isSelected);
        };
        vm.toggleAll = function () {
          var select = !vm.allSelected();
          scope.items.forEach(function (row) {
            if (vm.isSelected(row) !== select) { vm.toggle(row); }
          });
        };
        function current() {
          var parts = (scope.sort || '').split(',');
          return { key: parts[0], dir: parts[1] || 'asc' };
        }
        vm.sortBy = function (col) {
          var s = current();
          var dir = s.key === col.key && s.dir === 'asc' ? 'desc' : 'asc';
          scope.onSort({ sort: col.key + ',' + dir });
        };
        vm.sortIcon = function (col) {
          var s = current();
          if (s.key !== col.key) { return 'fa-sort'; }
          return s.dir === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc';
        };
        vm.ariaSort = function (col) {
          var s = current();
          if (!col.sortable) { return undefined; }
          if (s.key !== col.key) { return 'none'; }
          return s.dir === 'asc' ? 'ascending' : 'descending';
        };
      }
    };
  }]);
})();
