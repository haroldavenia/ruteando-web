/** Contrato: los catálogos reales sirven a MasterDomains y a rw-status-badge (FND-003, FND-005). */
describe('Contrato de catálogos /api/v1/master-domains (FND-003)', function () {
  beforeEach(module('angle'));

  it('[FND-003 CA-2] cada valor real trae key, label, active y sortOrder', function () {
    var domains = fixtureBody('get__master-domains');
    expect(domains.length).toBeGreaterThan(10);
    domains.forEach(function (d) {
      expect(typeof d.code).toBe('string');
      d.values.forEach(function (v) {
        expect(typeof v.key).toBe('string');
        expect(typeof v.label).toBe('string');
        expect(typeof v.active).toBe('boolean');
        expect(v.sortOrder === null || typeof v.sortOrder === 'number').toBe(true);
      });
    });
  });

  it('[FND-003 CA-4] el fallback local cubre los dominios de enum del contrato', inject(function (MASTER_DOMAINS_FALLBACK) {
    var domains = fixtureBody('get__master-domains');
    ['RestrictionType', 'TypeLengthOfStay', 'RouteTopology', 'OsrmProfile', 'ServiceType', 'StopType', 'PackageStatus', 'GeocodingStatus', 'PlaceType'].forEach(function (code) {
      var real = domains.filter(function (d) { return d.code === code; })[0];
      var activeKeys = real.values.filter(function (v) { return v.active; }).map(function (v) { return v.key; });
      expect(MASTER_DOMAINS_FALLBACK[code]).toEqual(activeKeys, code);
    });
  }));

  it('[FND-005 CA-5] rw-status-badge tiene tono e icono para cada estado real de paquete y geocodificación', inject(function (RW_STATUS_TONES) {
    var domains = fixtureBody('get__master-domains');
    ['PackageStatus', 'GeocodingStatus'].forEach(function (code) {
      domains.filter(function (d) { return d.code === code; })[0].values.filter(function (v) { return v.active; }).forEach(function (v) {
        expect(RW_STATUS_TONES[code][v.key]).toBeDefined(code + '.' + v.key);
      });
    });
  }));
});
