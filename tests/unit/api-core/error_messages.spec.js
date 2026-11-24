describe('ErrorMessages (FND-002)', function () {
  var ErrorMessages, ApiError, translated;

  beforeEach(module('angle', function ($provide) {
    translated = [];
    $provide.value('$translate', {
      instant: function (key, params) {
        translated.push([key, params]);
        return key === 'errors.code.RATE_LIMIT_EXCEEDED' ? 'Demasiados intentos. Espera ' + params.seconds + ' segundos.' : key;
      }
    });
  }));
  beforeEach(inject(function (_ErrorMessages_, _ApiError_) {
    ErrorMessages = _ErrorMessages_;
    ApiError = _ApiError_;
  }));

  it('[FND-002 CA-10] traduce 429 con los segundos de Retry-After', function () {
    var error = new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'x', { retryAfter: 30 });
    expect(ErrorMessages.for(error)).toBe('Demasiados intentos. Espera 30 segundos.');
    expect(translated[0][1].seconds).toBe(30);
  });

  it('[FND-002 CA-11] el override de pantalla gana al código y este al estado', function () {
    var conflict = new ApiError(409, 'CONFLICT', 'dup');
    expect(ErrorMessages.resolve(conflict, { CONFLICT: 'places.errors.duplicate' }).key).toBe('places.errors.duplicate');
    expect(ErrorMessages.resolve(conflict).key).toBe('errors.code.CONFLICT');
    expect(ErrorMessages.resolve(new ApiError(404, 'SUBSCRIPTION_MISSING')).key).toBe('errors.status.404');
    expect(ErrorMessages.resolve(new ApiError(418, 'TEAPOT')).key).toBe('errors.unknown');
    expect(ErrorMessages.resolve(null).key).toBe('errors.unknown');
  });

  it('[FND-002 CA-11] expone parámetros útiles y errores por campo', function () {
    var locked = new ApiError(423, 'ACCOUNT_LOCKED', 'x', { details: { lockedUntil: '2026-11-20T10:00:00Z' } });
    expect(ErrorMessages.resolve(locked).params.lockedUntil).toBe('2026-11-20T10:00:00Z');
    var validation = new ApiError(400, 'VALIDATION_ERROR', 'x', { details: { name: 'requerido' } });
    expect(ErrorMessages.fieldErrors(validation)).toEqual({ name: 'requerido' });
    expect(ErrorMessages.fieldErrors(locked)).toEqual({});
    expect(ErrorMessages.KNOWN).toContain('SEAT_LIMIT_EXCEEDED');
  });
});

describe('ErrorMessages sin $translate (FND-002)', function () {
  beforeEach(module('angle'));
  it('[FND-002 CA-11] devuelve la clave si no hay angular-translate', inject(function (ErrorMessages, ApiError) {
    expect(ErrorMessages.for(new ApiError(0, 'NETWORK_ERROR'))).toBe('errors.code.NETWORK_ERROR');
  }));
});

describe('ErrorMessages OTP (FND-002)', function () {
  beforeEach(module('angle'));
  it('[FND-002 CA-18] OTP_DELIVERY_FAILED (502) tiene texto propio y no el genérico de 502', inject(function (ErrorMessages, ApiError) {
    expect(ErrorMessages.resolve(new ApiError(502, 'OTP_DELIVERY_FAILED')).key).toBe('errors.code.OTP_DELIVERY_FAILED');
    expect(ErrorMessages.resolve(new ApiError(502, 'X_NUEVO')).key).toBe('errors.status.502');
  }));
});
