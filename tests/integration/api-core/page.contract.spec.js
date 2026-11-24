/** Contrato: las páginas reales de /api/v1 pasan por ApiClient.normalizePage sin perder datos (FND-002). */
describe('Contrato de páginas /api/v1 (FND-002)', function () {
  var PAGED = ['get__places', 'get__packages', 'get__journeys', 'get__users', 'get__resources', 'get__settings', 'get__audit-logs', 'get__resource-types'];

  beforeEach(module('angle'));

  PAGED.forEach(function (name) {
    it('[FND-002 CA-7] ' + name + ' se normaliza a {items,total,page,size,totalPages}', inject(function (ApiClient) {
      var body = fixtureBody(name);
      var page = ApiClient.normalizePage(body);
      expect(Array.isArray(page.items)).toBe(true);
      expect(page.items.length).toBe(body.content.length);
      ['total', 'page', 'size', 'totalPages'].forEach(function (k) {
        expect(typeof page[k]).toBe('number', name + '.' + k);
      });
    }));
  });

  it('[FND-002 CA-7] /zones no es paginado: llega como arreglo (no usar page())', function () {
    expect(Array.isArray(fixtureBody('get__zones'))).toBe(true);
  });

  it('[FND-002 CA-6] los errores reales del gateway se leen como ApiError', inject(function (ApiError) {
    var f = fixture('gateway-errors/post__auth__login__invalid-credentials');
    var err = ApiError.fromResponse({ status: f.response.status, data: f.response.body, headers: function () { return null; } });
    expect(err.status).toBe(401);
    expect(err.code).toBe(f.response.body.error);
    expect(err.retryAfter).toBeNull();
  }));
});

describe('Contrato de borrado por lote (FND-002)', function () {
  beforeEach(module('angle'));
  it('[FND-002 CA-17] la forma documentada de batch-delete se resume sin perder ids', inject(function (ApiClient, $httpBackend) {
    // Ejemplo de docs/contracts/source/endpoints.md (M1) hasta capturar el fixture real.
    $httpBackend.whenPOST('/api/v1/settings/batch-delete').respond(200, { results: [
      { id: 'a', status: 'deleted' },
      { id: 'b', status: 'not_found' },
      { id: 'c', status: 'conflict', error: { code: 'CONFLICT', message: 'in use', details: { referencedBy: 'journeys', ids: ['j1', 'j2'] } } }
    ] });
    var r;
    ApiClient.batchDelete('settings', ['a', 'b', 'c']).then(function (x) { r = x; });
    $httpBackend.flush();
    expect([r.deleted, r.notFound, r.conflicts.map(function (c) { return c.id; })]).toEqual([['a'], ['b'], ['c']]);
    expect(r.conflicts[0].error.details.ids.length).toBe(2);
  }));
});
