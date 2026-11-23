describe('ApiClient (FND-002)', function () {
  var ApiClient, ApiError, $httpBackend, $q, $rootScope;

  beforeEach(module('angle'));
  beforeEach(inject(function (_ApiClient_, _ApiError_, _$httpBackend_, _$q_, _$rootScope_) {
    ApiClient = _ApiClient_;
    ApiError = _ApiError_;
    $httpBackend = _$httpBackend_;
    $q = _$q_;
    $rootScope = _$rootScope_;
  }));
  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('[FND-002 CA-1] usa la base relativa /api/v1 y rechaza URLs absolutas', function () {
    $httpBackend.expectGET('/api/v1/places/1').respond(200, { id: '1' });
    var body;
    ApiClient.get('/places/1').then(function (b) { body = b; });
    $httpBackend.flush();
    expect(body).toEqual({ id: '1' });
    expect(function () { ApiClient.get('http://hanoit:9000/hanoit/api/v1/places'); }).toThrow();
    expect(function () { ApiClient.get('/api/v1/places'); }).toThrow();
  });

  it('[FND-002 CA-6] rechaza un 404 con ApiError{status, code, message}', function () {
    $httpBackend.whenGET('/api/v1/places/x').respond(404, { error: 'NOT_FOUND', message: 'x', path: '/api/v1/places/x', details: null });
    var err;
    ApiClient.get('/places/x').catch(function (e) { err = e; });
    $httpBackend.flush();
    expect(err instanceof ApiError).toBe(true);
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('x');
    expect(err.path).toBe('/api/v1/places/x');
  });

  it('[FND-002 CA-16] lee 401/403 de la capa de seguridad como ApiError con su código', function () {
    $httpBackend.whenGET('/api/v1/users').respond(401, { error: 'UNAUTHORIZED', message: 'Full authentication is required' });
    $httpBackend.whenGET('/api/v1/tenants').respond(403, '{"error":"FORBIDDEN","message":"Access denied"}');
    var e1, e2;
    ApiClient.get('/users').catch(function (e) { e1 = e; });
    ApiClient.get('/tenants').catch(function (e) { e2 = e; });
    $httpBackend.flush();
    expect([e1.status, e1.code]).toEqual([401, 'UNAUTHORIZED']);
    expect([e2.status, e2.code, e2.message]).toEqual([403, 'FORBIDDEN', 'Access denied']);
  });

  it('[FND-002 CA-16] sin cuerpo JSON deduce el código del estado, también si no hay red', function () {
    $httpBackend.whenGET('/api/v1/a').respond(502, '<html>Bad gateway</html>');
    var err;
    ApiClient.get('/a').catch(function (e) { err = e; });
    $httpBackend.flush();
    expect([err.status, err.code]).toEqual([502, 'BAD_GATEWAY']);
    expect(ApiError.fromResponse(0).code).toBe('NETWORK_ERROR');
    expect(ApiError.fromResponse({ status: -1 }).status).toBe(0);
    expect(ApiError.fromResponse({ status: 418, data: '{malformado' }).code).toBe('HTTP_418');
    expect(ApiError.fromResponse(err)).toBe(err);
  });

  it('[FND-002 CA-10] conserva Retry-After de un 429', function () {
    $httpBackend.whenPOST('/api/v1/auth/login').respond(429, { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many' }, { 'Retry-After': '30' });
    var err;
    ApiClient.post('/auth/login', {}).catch(function (e) { err = e; });
    $httpBackend.flush();
    expect(err.retryAfter).toBe(30);
  });

  it('[FND-002 CA-12] trata 201/202/204 sin cuerpo como éxito', function () {
    $httpBackend.whenDELETE('/api/v1/places/1').respond(204, '');
    $httpBackend.whenPOST('/api/v1/journeys/1/navigations').respond(202);
    $httpBackend.whenPUT('/api/v1/places/1').respond(200, { id: '1' });
    $httpBackend.whenPATCH('/api/v1/packages/1/status/attended').respond(200, { status: 'attended' });
    var results = [];
    ApiClient.del('/places/1').then(function (b) { results.push(b); });
    ApiClient.post('/journeys/1/navigations').then(function (b) { results.push(b); });
    ApiClient.put('places/1', { name: 'a' }).then(function (b) { results.push(b); });
    ApiClient.patch('/packages/1/status/attended', {}).then(function (b) { results.push(b); });
    $httpBackend.flush();
    expect(results).toEqual([null, null, { id: '1' }, { status: 'attended' }]);
  });

  it('[FND-002 CA-7] normaliza páginas con `page` o con `number` (audit-logs)', function () {
    var audit = fixtureBody('get__audit-logs');
    var page = ApiClient.normalizePage(audit);
    expect(page.page).toBe(audit.number);
    expect(page.items.length).toBe(audit.content.length);

    $httpBackend.expectGET('/api/v1/places?page=0&size=20').respond(200, fixtureBody('get__places'));
    var result;
    ApiClient.page('/places').then(function (p) { result = p; });
    $httpBackend.flush();
    expect(result).toEqual(jasmine.objectContaining({ total: 1, page: 0, size: 20, totalPages: 1 }));
    expect(ApiClient.normalizePage(null)).toEqual({ items: [], total: 0, page: 0, size: 0, totalPages: 1 });
  });

  it('[FND-002 CA-13] envía sort permitido y rechaza campos fuera de la lista blanca sin pedir', function () {
    $httpBackend.expectGET('/api/v1/packages?page=1&size=50&sort=createdAt,desc&status=pending').respond(200, { content: [], totalElements: 0, totalPages: 0, page: 1, size: 50 });
    ApiClient.page('/packages', { page: 1, size: 50, sort: 'createdAt,desc', params: { status: 'pending' } });
    $httpBackend.flush();

    var errors = [];
    ApiClient.page('/packages', { sort: 'tenantId,asc' }).catch(function (e) { errors.push(e); });
    ApiClient.page('/places', { sort: 'name,up' }).catch(function (e) { errors.push(e); });
    ApiClient.page('/zones', { sort: 'name' }).catch(function (e) { errors.push(e); });
    $rootScope.$digest();
    expect(errors.map(function (e) { return e.code; })).toEqual(['INVALID_SORT', 'INVALID_SORT', 'INVALID_SORT']);
    expect(errors[0].details.allowed).toContain('guideNumber');
    expect(errors[2].details.allowed).toEqual([]);
    expect(ApiClient.sortParam('places', 'name')).toBe('name');
  });

  it('[FND-002 CA-8] listAll recorre páginas hasta el tope y avisa truncated', function () {
    function pageOf(n) {
      var content = [];
      for (var i = 0; i < 100; i++) { content.push({ id: n * 100 + i }); }
      return { content: content, totalElements: 300, totalPages: 3, page: n, size: 100 };
    }
    $httpBackend.whenGET(/\/api\/v1\/places\?page=\d&size=100/).respond(function (m, url) {
      return [200, pageOf(Number(/page=(\d)/.exec(url)[1]))];
    });
    var result;
    ApiClient.listAll('/places', { max: 250 }).then(function (r) { result = r; });
    $httpBackend.flush();
    expect(result.items.length).toBe(250);
    expect(result.truncated).toBe(true);

    var all;
    ApiClient.listAll('/places', { max: 1000 }).then(function (r) { all = r; });
    $httpBackend.flush();
    expect(all.items.length).toBe(300);
    expect(all.truncated).toBe(false);
  });

  it('[FND-002 CA-8] listAll termina con una página vacía y usa el tope por defecto', function () {
    $httpBackend.whenGET('/api/v1/zones?page=0&size=100').respond(200, { content: [], totalElements: 0, totalPages: 5, page: 0, size: 100 });
    var result;
    ApiClient.listAll('/zones').then(function (r) { result = r; });
    $httpBackend.flush();
    expect(result).toEqual({ items: [], total: 0, truncated: false });
  });

  it('[FND-002 CA-9] runBulk informa éxitos y fallos y nunca supera la concurrencia', function () {
    var inFlight = 0;
    var maxInFlight = 0;
    var pending = [];
    function fn(id) {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      var d = $q.defer();
      pending.push(function () {
        inFlight--;
        if (id === 3) { d.reject({ status: 409, data: { error: 'CONFLICT', details: { referencedBy: 'settings', ids: ['s1'] } } }); } else { d.resolve(id); }
      });
      return d.promise;
    }
    var report;
    ApiClient.runBulk([1, 2, 3, 4, 5], fn, { concurrency: 4 }).then(function (r) { report = r; });
    $rootScope.$digest();
    expect(inFlight).toBe(4);
    while (pending.length) {
      pending.shift()();
      $rootScope.$digest();
    }
    expect(maxInFlight).toBe(4);
    expect(report.ok.length).toBe(4);
    expect(report.failed.length).toBe(1);
    expect(report.failed[0].id).toBe(3);
    expect(report.failed[0].error instanceof ApiError).toBe(true);
    expect(report.failed[0].error.details.referencedBy).toBe('settings');

    var empty;
    ApiClient.runBulk([], fn).then(function (r) { empty = r; });
    $rootScope.$digest();
    expect(empty).toEqual({ ok: [], failed: [] });
  });

  it('[FND-002 CA-2] marca las peticiones como apiV1 para que el interceptor legacy no las altere', function () {
    var seen;
    $httpBackend.whenGET('/api/v1/units').respond(function (method, url, data, headers) { seen = headers; return [200, {}]; });
    ApiClient.request('GET', '/units', { headers: { 'X-Test': '1' }, transformRequest: angular.identity });
    $httpBackend.flush();
    expect(seen['X-Test']).toBe('1');
  });
});
