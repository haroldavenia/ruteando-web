/** Comprobaciones del propio arnés unitario (FND-001). */
describe('arnés Karma', function () {
  it('[FND-001 CA-1] carga AngularJS 1.3.15 y el módulo angle con el código migrado', function () {
    expect(angular.version.full).toBe('1.3.15');
    module('angle');
    inject(function (ApiClient, $injector) {
      expect(typeof ApiClient.get).toBe('function');
      expect($injector.has('MasterDomains')).toBe(true);
    });
  });

  it('[FND-001 CA-2] fixture() devuelve el ejemplo real con coordenadas [lon, lat]', function () {
    var f = fixture('get__places__id');
    expect(f.response.status).toBe(200);
    expect(f.response.body.location.coordinates.length).toBe(2);
  });
});
