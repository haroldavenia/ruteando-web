describe('Componentes rw-* (FND-005)', function () {
  var $compile, $rootScope, $httpBackend;

  beforeEach(module('angle'));
  beforeEach(inject(function (_$compile_, _$rootScope_, _$httpBackend_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
  }));

  function render(html, values) {
    var scope = $rootScope.$new();
    angular.extend(scope, values);
    var el = $compile(html)(scope);
    scope.$digest();
    return { el: el, scope: scope };
  }
  function text(el) { return el.text().replace(/\s+/g, ' ').trim(); }

  describe('rw-data-table', function () {
    function rows(from, to) {
      var out = [];
      for (var i = from; i < to; i++) { out.push({ id: 'p' + i, name: 'Lugar ' + i, type: 'depot' }); }
      return out;
    }
    var html = '<rw-data-table items="items" total="total" page="page" size="size" columns="columns" actions="actions" selection="selected" sort="sort" on-page="go(page)" on-sort="order(sort)"></rw-data-table>';

    function table(extra) {
      return render(html, angular.extend({
        items: rows(20, 40), total: 45, page: 1, size: 20, selected: [], sort: 'name,asc',
        columns: [{ key: 'name', label: 'places.name', sortable: true }, { key: 'type', label: 'places.type', format: function (r) { return r.type.toUpperCase(); } }, { key: 'missing', label: 'x' }],
        actions: [{ label: 'ui.actions.delete', icon: 'fa-trash', danger: true, onClick: jasmine.createSpy('remove') }],
        go: jasmine.createSpy('go'), order: jasmine.createSpy('order')
      }, extra));
    }

    it('[FND-005 CA-3] muestra el rango 21–40 de 45 y emite onPage al cambiar de página', function () {
      var t = table();
      expect(text(angular.element(t.el[0].querySelector('.rw-range')))).toBe('ui.table.range {"from":21,"to":40,"total":45}');
      var trs = t.el[0].querySelectorAll('tbody tr');
      expect(trs.length).toBe(20);
      expect(angular.element(trs[0]).find('td').eq(2).text()).toBe('DEPOT');
      expect(angular.element(trs[0]).find('td').eq(3).text()).toBe('');
      angular.element(t.el[0].querySelector('.rw-next')).triggerHandler('click');
      expect(t.scope.go).toHaveBeenCalledWith(2);
      angular.element(t.el[0].querySelector('.rw-prev')).triggerHandler('click');
      expect(t.scope.go).toHaveBeenCalledWith(0);
      t.el.isolateScope().vm.go(5);
      expect(t.scope.go.calls.count()).toBe(2);
    });

    it('[FND-005 CA-3] la selección persiste entre páginas y admite seleccionar la página', function () {
      var t = table();
      var checks = t.el.find('tbody').find('input');
      angular.element(checks[0]).triggerHandler('click');
      t.scope.$digest();
      expect(t.scope.selected).toEqual(['p20']);
      t.scope.items = rows(40, 45);
      t.scope.page = 2;
      t.scope.$digest();
      expect(t.scope.selected).toEqual(['p20']);
      var vm = t.el.isolateScope().vm;
      vm.toggleAll();
      expect(t.scope.selected.length).toBe(6);
      expect(vm.allSelected()).toBe(true);
      vm.toggleAll();
      expect(t.scope.selected).toEqual(['p20']);
      vm.toggle({ id: 'p20' });
      expect(t.scope.selected).toEqual([]);
    });

    it('[FND-005 CA-3] ordena por columna alternando asc/desc e informa aria-sort', function () {
      var t = table();
      var vm = t.el.isolateScope().vm;
      vm.sortBy(t.scope.columns[0]);
      expect(t.scope.order).toHaveBeenCalledWith('name,desc');
      expect(vm.sortIcon(t.scope.columns[0])).toBe('fa-sort-asc');
      expect(vm.ariaSort(t.scope.columns[0])).toBe('ascending');
      expect(vm.ariaSort(t.scope.columns[1])).toBeUndefined();
      t.scope.sort = 'name,desc';
      t.scope.$digest();
      vm.sortBy(t.scope.columns[0]);
      expect(t.scope.order).toHaveBeenCalledWith('name,asc');
      expect(vm.sortIcon(t.scope.columns[0])).toBe('fa-sort-desc');
      expect(vm.ariaSort(t.scope.columns[0])).toBe('descending');
      t.scope.sort = null;
      t.scope.$digest();
      expect(vm.sortIcon(t.scope.columns[0])).toBe('fa-sort');
      expect(vm.ariaSort({ key: 'type', sortable: true })).toBe('none');
    });

    it('[FND-005 CA-3] invoca acciones por fila y muestra 0–0 de 0 sin datos', function () {
      var t = table();
      angular.element(t.el[0].querySelector('tbody .btn-danger')).triggerHandler('click');
      expect(t.scope.actions[0].onClick).toHaveBeenCalledWith(t.scope.items[0]);
      var empty = table({ items: [], total: 0, page: 0 });
      expect(text(angular.element(empty.el[0].querySelector('.rw-range')))).toContain('"from":0,"to":0,"total":0');
      expect(empty.el.isolateScope().vm.allSelected()).toBe(false);
      expect(empty.el.isolateScope().vm.pages()).toBe(1);
    });
  });

  describe('rw-list-state', function () {
    it('[FND-005 CA-4] en error «Reintentar» llama retry(); en vacío ofrece crear', function () {
      var reload = jasmine.createSpy('reload');
      var create = jasmine.createSpy('create');
      var t = render('<rw-list-state state="state" retry="reload()" create="create()" empty-text="places.empty"></rw-list-state>', { state: 'error', reload: reload, create: create });
      expect(text(t.el)).toContain('ui.state.error');
      angular.element(t.el[0].querySelector('.rw-state-error button')).triggerHandler('click');
      expect(reload).toHaveBeenCalled();
      t.scope.state = 'empty';
      t.scope.$digest();
      expect(text(t.el)).toContain('places.empty');
      angular.element(t.el[0].querySelector('.rw-state-empty button')).triggerHandler('click');
      expect(create).toHaveBeenCalled();
      t.scope.state = 'loading';
      t.scope.$digest();
      expect(text(t.el)).toContain('ui.state.loading');
      expect(t.el.find('div').attr('role')).toBe('status');
      t.scope.state = 'ready';
      t.scope.$digest();
      expect(text(t.el)).toBe('');
    });

    it('[FND-005 CA-4] sin retry/create no muestra botones y usa textos por defecto', function () {
      var t = render('<rw-list-state state="state" error-text="msg"></rw-list-state>', { state: 'error', msg: 'Sin conexión' });
      expect(t.el.find('button').length).toBe(0);
      expect(text(t.el)).toContain('Sin conexión');
      t.scope.state = 'empty';
      t.scope.$digest();
      expect(text(t.el)).toContain('ui.state.empty');
    });
  });

  describe('rw-status-badge', function () {
    it('[FND-005 CA-5] muestra etiqueta del catálogo, icono y tono de advertencia', function () {
      $httpBackend.whenGET('/api/v1/master-domains/PackageStatus/values').respond(200, [{ key: 'unattended', label: 'Unattended', active: true, sortOrder: 3 }]);
      var t = render('<rw-status-badge domain="PackageStatus" key="status"></rw-status-badge>', { status: 'unattended' });
      $httpBackend.flush();
      var badge = t.el.find('span').eq(0);
      expect(badge.hasClass('rw-badge-warning')).toBe(true);
      expect(t.el.find('em').hasClass('fa-exclamation')).toBe(true);
      expect(text(t.el)).toBe('Unattended');
    });

    it('[FND-005 CA-5] admite etiqueta fija, dominios locales y claves desconocidas', function () {
      var a = render('<rw-status-badge domain="Active" key="on"></rw-status-badge>', { on: true });
      expect(a.el.find('span').eq(0).hasClass('rw-badge-success')).toBe(true);
      expect(text(a.el)).toBe('true');
      var b = render('<rw-status-badge domain="Otro" key="k" label="Fija"></rw-status-badge>', { k: null });
      expect(b.el.find('span').eq(0).hasClass('rw-badge-muted')).toBe(true);
      expect(text(b.el)).toBe('Fija');
    });
  });

  describe('rw-page-head, rw-form-actions y rw-confirm', function () {
    it('[FND-005 CA-3] la cabecera y la barra de formulario respetan estados', function () {
      var head = render('<rw-page-head title="places.title" subtitle="places.subtitle"><button class="btn">Nuevo</button></rw-page-head>', {});
      expect(text(head.el)).toContain('places.title');
      expect(text(head.el)).toContain('Nuevo');
      var cancel = jasmine.createSpy('cancel');
      var f = render('<form name="form"><input name="n" ng-model="n" required><rw-form-actions form="form" saving="saving" on-cancel="cancel()"></rw-form-actions></form>', { cancel: cancel, saving: false });
      var submit = f.el[0].querySelector('button[type=submit]');
      expect(submit.disabled).toBe(true);
      f.scope.n = 'x';
      f.scope.form.n.$setViewValue('x');
      f.scope.$digest();
      expect(submit.disabled).toBe(false);
      expect(text(f.el)).toContain('ui.form.unsaved');
      f.scope.saving = true;
      f.scope.$digest();
      expect(submit.disabled).toBe(true);
      expect(f.el[0].querySelector('button[type=button]').disabled).toBe(true);
      f.scope.saving = false;
      f.scope.$digest();
      angular.element(f.el[0].querySelector('button[type=button]')).triggerHandler('click');
      expect(cancel).toHaveBeenCalled();
    });

    it('[FND-005 CA-4] rw-confirm ejecuta la acción solo si se confirma (window.confirm)', inject(function ($window, RwConfirm) {
      var remove = jasmine.createSpy('remove');
      spyOn($window, 'confirm').and.returnValues(true, false);
      var t = render('<button rw-confirm="places.confirmDelete" rw-confirm-action="remove()" rw-confirm-danger="true">x</button>', { remove: remove });
      t.el.triggerHandler('click');
      $rootScope.$digest();
      expect(remove).toHaveBeenCalled();
      t.el.triggerHandler('click');
      $rootScope.$digest();
      expect(remove.calls.count()).toBe(1);
      var rejected;
      $window.confirm.and.returnValue(false);
      RwConfirm.ask().catch(function (r) { rejected = r; });
      $rootScope.$digest();
      expect(rejected).toBe('cancel');
    }));
  });
});

describe('rw-confirm con $modal y $translate (FND-005)', function () {
  var opened;
  beforeEach(module('angle', function ($provide) {
    $provide.value('$translate', { instant: function (k) { return 'T:' + k; } });
    $provide.value('$modal', {
      open: function (options) {
        opened = options;
        return { result: { then: function (fn) { fn(true); } } };
      }
    });
  }));

  it('[FND-005 CA-4] abre el modal con textos traducidos y tono de peligro', inject(function (RwConfirm, $controller, $rootScope) {
    var confirmed = false;
    RwConfirm.ask({ message: 'places.confirmDelete', danger: true }).then(function () { confirmed = true; });
    expect(confirmed).toBe(true);
    var scope = $rootScope.$new();
    opened.controller[1](scope);
    expect(scope.view).toEqual({ title: 'T:ui.confirm.title', message: 'T:places.confirmDelete', confirmText: 'T:ui.actions.confirm', cancelText: 'T:ui.actions.cancel', danger: true });
    expect(opened.template).toContain('$close(true)');
  }));
});
