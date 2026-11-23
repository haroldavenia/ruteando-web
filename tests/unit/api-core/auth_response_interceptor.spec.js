describe('authResponseInterceptor legacy con ApiClient (FND-002)', function () {
  var interceptor, $rootScope, tokenStorage, $location;

  beforeEach(module('angle', function ($provide) {
    tokenStorage = jasmine.createSpyObj('tokenStorage', ['resetToken']);
    $provide.value('tokenStorage', tokenStorage);
    $provide.value('message', jasmine.createSpyObj('message', ['show']));
  }));
  beforeEach(inject(function (authResponseInterceptor, _$rootScope_, _$location_) {
    interceptor = authResponseInterceptor;
    $rootScope = _$rootScope_;
    $location = _$location_;
  }));

  it('[FND-002 CA-16] deja pasar intactos los errores de /api/v1 (los convierte ApiClient)', function () {
    var response = { status: 401, data: { error: 'invalid_token' }, config: { apiV1: true } };
    var rejected;
    interceptor.responseError(response).catch(function (r) { rejected = r; });
    $rootScope.$digest();
    expect(rejected).toBe(response);
    expect(tokenStorage.resetToken).not.toHaveBeenCalled();
  });

  it('[FND-002 CA-16] mantiene el comportamiento legacy para módulos aún no migrados', function () {
    spyOn($location, 'path');
    interceptor.responseError({ status: 401, data: { error: 'invalid_token' }, config: {} });
    expect(tokenStorage.resetToken).toHaveBeenCalled();
    expect($location.path).toHaveBeenCalledWith('access/login');
  });
});
