/**=========================================================
 * Module: api_error.js (FND-002)
 * Error tipado de /api/v1: { error, message, timestamp, path, details }.
 =========================================================*/
(function () {
  'use strict';

  App.factory('ApiError', [function () {

    function ApiError(status, code, message, extra) {
      extra = extra || {};
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.message = message || code;
      this.details = extra.details === undefined ? null : extra.details;
      this.path = extra.path || null;
      this.timestamp = extra.timestamp || null;
      this.retryAfter = extra.retryAfter === undefined ? null : extra.retryAfter;
      this.client = !!extra.client;
    }
    ApiError.prototype = Object.create(Error.prototype);
    ApiError.prototype.constructor = ApiError;

    var STATUS_CODES = {
      0: 'NETWORK_ERROR', 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND',
      409: 'CONFLICT', 410: 'GONE', 422: 'UNPROCESSABLE_ENTITY', 423: 'ACCOUNT_LOCKED',
      429: 'RATE_LIMIT_EXCEEDED', 500: 'INTERNAL_ERROR', 502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE', 504: 'GATEWAY_TIMEOUT'
    };

    function parseBody(data) {
      if (typeof data === 'string' && data.charAt(0) === '{') {
        try { return JSON.parse(data); } catch (e) { return null; }
      }
      return data && typeof data === 'object' ? data : null;
    }

    function readRetryAfter(headers) {
      var value = typeof headers === 'function' ? headers('Retry-After') : null;
      var seconds = parseInt(value, 10);
      return isNaN(seconds) ? null : seconds;
    }

    /** Convierte la respuesta de $http (o lo que deje un interceptor) en ApiError. */
    ApiError.fromResponse = function (response) {
      if (response instanceof ApiError) { return response; }
      var status = response && typeof response === 'object' && typeof response.status === 'number' ? response.status : 0;
      if (status < 0) { status = 0; }
      var body = response && typeof response === 'object' ? parseBody(response.data) : null;
      var code = body && typeof body.error === 'string' ? body.error : (STATUS_CODES[status] || 'HTTP_' + status);
      return new ApiError(status, code, body && body.message, {
        details: body ? body.details : null,
        path: body && body.path,
        timestamp: body && body.timestamp,
        retryAfter: readRetryAfter(response && response.headers)
      });
    };

    ApiError.client = function (code, message, details) {
      return new ApiError(400, code, message, { details: details, client: true });
    };

    return ApiError;
  }]);
})();
