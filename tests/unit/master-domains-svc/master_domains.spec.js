describe('MasterDomains (FND-003)', function () {
  var MasterDomains, $httpBackend, $rootScope, $log;
  var URL = '/api/v1/master-domains/PackageStatus/values';

  function packageStatus() {
    var domains = fixtureBody('get__master-domains');
    return domains.filter(function (d) { return d.code === 'PackageStatus'; })[0].values;
  }

  beforeEach(module('angle'));
  beforeEach(inject(function (_MasterDomains_, _$httpBackend_, _$rootScope_, _$log_) {
    MasterDomains = _MasterDomains_;
    $httpBackend = _$httpBackend_;
    $rootScope = _$rootScope_;
    $log = _$log_;
  }));
  afterEach(function () { $httpBackend.verifyNoOutstandingExpectation(); });

  it('[FND-003 CA-1] dos llamadas a values() hacen una sola petición', function () {
    $httpBackend.expectGET(URL).respond(200, packageStatus());
    var a, b;
    MasterDomains.values('PackageStatus').then(function (v) { a = v; });
    MasterDomains.values('PackageStatus').then(function (v) { b = v; });
    $httpBackend.flush();
    expect(a).toBe(b);
    expect(a.length).toBe(packageStatus().length);
  });

  it('[FND-003 CA-2] activeValues excluye inactivos y ordena por sortOrder (null al final)', function () {
    $httpBackend.whenGET('/api/v1/master-domains/MeasurementUnit/values').respond(200, [
      { key: 'kg', label: 'Kilos', active: false, sortOrder: 1 },
      { key: 'm', label: 'Metros', active: true, sortOrder: null },
      { key: 'cm3', label: 'cm³', active: true, sortOrder: 3 },
      { key: 'g', label: 'Gramos', active: true, sortOrder: 2 },
      { key: 'a', label: 'A', active: true, sortOrder: null }
    ]);
    var active;
    MasterDomains.activeValues('MeasurementUnit').then(function (v) { active = v; });
    $httpBackend.flush();
    expect(active.map(function (v) { return v.key; })).toEqual(['g', 'cm3', 'a', 'm']);
  });

  it('[FND-003 CA-3] label resuelve también claves inactivas y devuelve la clave si no existe', function () {
    $httpBackend.whenGET(URL).respond(200, packageStatus());
    var inactive, missing;
    MasterDomains.label('PackageStatus', 'returned').then(function (l) { inactive = l; });
    MasterDomains.label('PackageStatus', 'nope').then(function (l) { missing = l; });
    $httpBackend.flush();
    expect(inactive).toBe('Returned');
    expect(missing).toBe('nope');
  });

  it('[FND-003 CA-4] con un 500 usa el fallback local y avisa en consola', function () {
    $httpBackend.whenGET('/api/v1/master-domains/RestrictionType/values').respond(500, { error: 'INTERNAL_ERROR' });
    var values;
    MasterDomains.values('RestrictionType').then(function (v) { values = v; });
    $httpBackend.flush();
    expect(values.map(function (v) { return v.key; })).toEqual(['fixed_routes', 'resource_vs_time', 'time_windows']);
    expect(values[0].fallback).toBe(true);
    expect($log.warn.logs.length).toBe(1);

    $httpBackend.whenGET('/api/v1/master-domains/Desconocido/values').respond(500, {});
    var none;
    MasterDomains.values('Desconocido').then(function (v) { none = v; });
    $httpBackend.flush();
    expect(none).toEqual([]);
  });

  it('[FND-003 CA-5] session:ended y tenant:changed invalidan la caché', function () {
    $httpBackend.expectGET(URL).respond(200, packageStatus());
    MasterDomains.values('PackageStatus');
    $httpBackend.flush();
    $rootScope.$broadcast('session:ended');
    $httpBackend.expectGET(URL).respond(200, packageStatus());
    MasterDomains.values('PackageStatus');
    $httpBackend.flush();
    $rootScope.$broadcast('tenant:changed');
    $httpBackend.expectGET(URL).respond(200, packageStatus());
    MasterDomains.values('PackageStatus');
    $httpBackend.flush();
  });

  it('[FND-003 CA-7] las claves de Role se usan tal cual (minúsculas del contrato v3)', function () {
    $httpBackend.whenGET('/api/v1/master-domains/Role/values').respond(200, [
      { key: 'tenant_admin', label: 'Tenant admin', active: true, sortOrder: 2 },
      { key: 'super_admin', label: 'Super admin', active: true, sortOrder: 1 }
    ]);
    var keys;
    MasterDomains.activeValues('Role').then(function (v) { keys = v.map(function (x) { return x.key; }); });
    $httpBackend.flush();
    expect(keys).toEqual(['super_admin', 'tenant_admin']);
  });

  it('[FND-003 CA-3] el filtro domainLabel pinta la etiqueta cuando el dominio llega', inject(function ($filter) {
    $httpBackend.whenGET(URL).respond(200, packageStatus());
    var filter = $filter('domainLabel');
    expect(filter('pending', 'PackageStatus')).toBe('pending');
    $httpBackend.flush();
    expect(filter('pending', 'PackageStatus')).toBe('Pending');
    expect(filter(null, 'PackageStatus')).toBe('');
    expect(filter('', 'PackageStatus')).toBe('');
  }));
});
