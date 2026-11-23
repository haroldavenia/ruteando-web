describe('Units (FND-003, FND-004)', function () {
  var Units, $httpBackend, $rootScope;

  beforeEach(module('angle'));
  beforeEach(inject(function (_Units_, _$httpBackend_, _$rootScope_) {
    Units = _Units_;
    $httpBackend = _$httpBackend_;
    $rootScope = _$rootScope_;
  }));

  it('[FND-003 CA-6] muestra g→kg y cm³→m³ y captura kg→g entero', function () {
    expect(Units.display('weight', 2500000)).toBe('2 500 kg');
    expect(Units.display('volume', 12000000)).toBe('12 m³');
    expect(Units.display('length', 250)).toBe('2,5 m');
    expect(Units.display('weight', 1234, { locale: 'en' })).toBe('1.23 kg');
    expect(Units.display('weight', -2500, { decimals: 0 })).toBe('-3 kg');
    expect(Units.display('weight', null)).toBe('—');
    expect(function () { Units.display('temperature', 1); }).toThrow();
    expect(Units.toApi('weight', '2,5')).toBe(2500);
    expect(Units.toApi('weight', '2.5')).toBe(2500);
    expect(Units.toApi('weight', '1.200,5')).toBe(1200500);
    expect(Units.toApi('volume', '1 000 000')).toBe(1000000000000);
    expect(Units.toApi('weight', 3)).toBe(3000);
    expect(Units.toApi('weight', 'abc')).toBeNull();
    expect(Units.toApi('weight', undefined)).toBeNull();
    expect(Units.toApi('duration', '90')).toBe(5400);
    expect(Units.fromApi('weight', 2500)).toBe(2.5);
    expect(Units.fromApi('duration', 600)).toBe(10);
    expect(Units.fromApi('weight', null)).toBeNull();
  });

  it('[FND-004 CA-4] formatea 48200 m como 48,2 km y 23400 s como 6:30', function () {
    expect(Units.display('distance', 48200)).toBe('48,2 km');
    expect(Units.display('distance', 48200, { locale: 'en' })).toBe('48.2 km');
    expect(Units.display('duration', 23400)).toBe('6:30');
    expect(Units.duration(540)).toBe('0:09');
    expect(Units.formatNumber(1234567.891, 2, 'es_AR')).toBe('1.234.567,89');
  });

  it('[FND-003 CA-6] carga /units una vez por sesión y reintenta tras un error', function () {
    $httpBackend.expectGET('/api/v1/units').respond(500, {});
    var failed;
    Units.load().catch(function (e) { failed = e; });
    $httpBackend.flush();
    expect(failed.status).toBe(500);

    $httpBackend.expectGET('/api/v1/units').respond(200, { weight: { key: 'g' } });
    var a, b;
    Units.load().then(function (u) { a = u; });
    Units.load().then(function (u) { b = u; });
    $httpBackend.flush();
    expect(a.weight.key).toBe('g');
    expect(b).toBe(a);

    $rootScope.$broadcast('session:ended');
    $httpBackend.expectGET('/api/v1/units').respond(200, { weight: { key: 'g' } });
    Units.load();
    $httpBackend.flush();
    $httpBackend.verifyNoOutstandingExpectation();
  });
});
