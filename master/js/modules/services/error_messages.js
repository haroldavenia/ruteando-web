/**=========================================================
 * Module: error_messages.js (FND-002)
 * ApiError → mensaje i18n: override de pantalla, luego código del backend, luego estado HTTP.
 =========================================================*/
(function () {
  'use strict';

  App.factory('ErrorMessages', ['$injector', function ($injector) {

    // Códigos de docs/contracts/source/migration-guide.md §15 con texto propio (errors.code.*).
    var KNOWN = [
      'VALIDATION_ERROR', 'BAD_REQUEST', 'INVALID_OTP', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'EMAIL_NOT_VERIFIED',
      'UNAUTHORIZED', 'INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT',
      'EMAIL_ALREADY_EXISTS', 'SEAT_LIMIT_EXCEEDED', 'OTP_EXPIRED', 'INVITATION_TOKEN_GONE',
      'UNPROCESSABLE_ENTITY', 'MAX_ATTEMPTS_EXCEEDED', 'MAX_RESENDS', 'ENTERPRISE_PLAN_SELF_SERVICE',
      'SEAT_DECREASE_BLOCKED', 'ACCOUNT_LOCKED', 'RATE_LIMIT_EXCEEDED', 'INTERNAL_ERROR',
      'ROUTING_ENGINE_UNAVAILABLE', 'STRIPE_INTEGRATION_ERROR', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE',
      'GATEWAY_TIMEOUT', 'BAD_GATEWAY', 'INVALID_SORT', 'OTP_DELIVERY_FAILED'
    ];
    var STATUSES = [0, 400, 401, 403, 404, 409, 410, 422, 423, 429, 500, 502, 503, 504];

    function params(error) {
      var details = error.details || {};
      return {
        seconds: error.retryAfter,
        lockedUntil: details.lockedUntil,
        attemptsRemaining: details.attemptsRemaining,
        limit: details.limit,
        rows: details.rows,
        referencedBy: details.referencedBy
      };
    }

    /** Devuelve { key, params } sin traducir (útil para plantillas con `| translate`). */
    function resolve(error, overrides) {
      error = error || {};
      var key;
      if (overrides && overrides[error.code]) {
        key = overrides[error.code];
      } else if (KNOWN.indexOf(error.code) >= 0) {
        key = 'errors.code.' + error.code;
      } else if (STATUSES.indexOf(error.status) >= 0) {
        key = 'errors.status.' + error.status;
      } else {
        key = 'errors.unknown';
      }
      return { key: key, params: params(error) };
    }

    function text(error, overrides) {
      var r = resolve(error, overrides);
      if ($injector.has('$translate')) {
        return $injector.get('$translate').instant(r.key, r.params);
      }
      return r.key;
    }

    /** Errores de validación por campo: { campo: mensaje }. */
    function fieldErrors(error) {
      return error && error.code === 'VALIDATION_ERROR' && error.details && typeof error.details === 'object' ? error.details : {};
    }

    return { resolve: resolve, for: text, fieldErrors: fieldErrors, KNOWN: KNOWN };
  }]);
})();
