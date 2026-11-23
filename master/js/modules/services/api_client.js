/**=========================================================
 * Module: api_client.js (FND-002)
 * Única puerta al backend /api/v1: resuelve con el cuerpo y rechaza con ApiError.
 * Páginas `{content,totalElements,totalPages,page,size}` → `{items,total,page,size,totalPages}`.
 =========================================================*/
(function () {
  'use strict';

  App.factory('ApiClient', ['$http', '$q', 'apiConfig', 'ApiError', function ($http, $q, apiConfig, ApiError) {

    function url(path) {
      if (/^https?:\/\//i.test(path) || path.indexOf(apiConfig.baseUrl + '/') === 0) {
        throw ApiError.client('INVALID_PATH', 'Usa rutas relativas a ' + apiConfig.baseUrl + ': ' + path);
      }
      return apiConfig.baseUrl + (path.charAt(0) === '/' ? path : '/' + path);
    }

    function request(method, path, options) {
      options = options || {};
      var config = {
        method: method,
        url: url(path),
        params: options.params,
        data: options.data,
        headers: options.headers,
        timeout: options.timeout,
        apiV1: true
      };
      if (options.transformRequest) { config.transformRequest = options.transformRequest; }
      return $http(config).then(function (response) {
        // 201/202/204 sin cuerpo son éxito (RF-9).
        return response.data === '' || response.data === undefined ? null : response.data;
      }, function (response) {
        return $q.reject(ApiError.fromResponse(response));
      });
    }

    function normalizePage(body) {
      body = body || {};
      var items = body.content || [];
      var page = body.page !== undefined ? body.page : (body.number !== undefined ? body.number : 0);
      return {
        items: items,
        total: body.totalElements !== undefined ? body.totalElements : items.length,
        page: page,
        size: body.size !== undefined ? body.size : items.length,
        totalPages: body.totalPages !== undefined ? body.totalPages : 1
      };
    }

    /** Valida `campo` o `campo,asc|desc` contra la lista blanca del listado. */
    function sortParam(resource, sort) {
      if (!sort) { return undefined; }
      var allowed = apiConfig.sortable[resource];
      var parts = String(sort).split(',');
      var dirOk = parts.length === 1 || (parts.length === 2 && /^(asc|desc)$/.test(parts[1]));
      if (!allowed || allowed.indexOf(parts[0]) < 0 || !dirOk) {
        throw ApiError.client('INVALID_SORT', 'Orden no permitido en ' + resource + ': ' + sort, { allowed: allowed || [] });
      }
      return sort;
    }

    function resourceOf(path) {
      return path.replace(/^\//, '').split(/[/?]/)[0];
    }

    function page(path, options) {
      options = options || {};
      var params = angular.extend({}, options.params, {
        page: options.page || 0,
        size: options.size || apiConfig.pageSize
      });
      try {
        params.sort = sortParam(resourceOf(path), options.sort);
      } catch (e) {
        return $q.reject(e);
      }
      return request('GET', path, { params: params }).then(normalizePage);
    }

    /** Recorre páginas hasta `max` elementos; `truncated` avisa si quedó información fuera. */
    function listAll(path, options) {
      options = options || {};
      var max = options.max || apiConfig.listAllMax;
      var size = options.pageSize || 100;
      var items = [];

      function next(index) {
        return page(path, { page: index, size: size, sort: options.sort, params: options.params }).then(function (result) {
          items = items.concat(result.items);
          if (items.length >= max) {
            return { items: items.slice(0, max), total: result.total, truncated: result.total > max };
          }
          if (index + 1 >= result.totalPages || result.items.length === 0) {
            return { items: items, total: result.total, truncated: false };
          }
          return next(index + 1);
        });
      }
      return next(0);
    }

    /** Ejecuta fn(id) para cada id con concurrencia limitada; nunca rechaza. */
    function runBulk(ids, fn, options) {
      var concurrency = (options && options.concurrency) || apiConfig.bulkConcurrency;
      var queue = ids.slice();
      var ok = [];
      var failed = [];
      var deferred = $q.defer();
      var running = 0;

      function launch() {
        if (!queue.length && running === 0) {
          deferred.resolve({ ok: ok, failed: failed });
          return;
        }
        while (running < concurrency && queue.length) {
          start(queue.shift());
        }
      }
      function start(id) {
        running++;
        $q.when().then(function () { return fn(id); }).then(function (value) {
          ok.push({ id: id, value: value });
        }, function (error) {
          failed.push({ id: id, error: ApiError.fromResponse(error) });
        }).then(function () {
          running--;
          launch();
        });
      }
      launch();
      return deferred.promise;
    }

    return {
      request: request,
      get: function (path, params) { return request('GET', path, { params: params }); },
      post: function (path, data, options) { return request('POST', path, angular.extend({ data: data }, options)); },
      put: function (path, data, options) { return request('PUT', path, angular.extend({ data: data }, options)); },
      patch: function (path, data, options) { return request('PATCH', path, angular.extend({ data: data }, options)); },
      del: function (path, params) { return request('DELETE', path, { params: params }); },
      page: page,
      listAll: listAll,
      runBulk: runBulk,
      normalizePage: normalizePage,
      sortParam: sortParam
    };
  }]);
})();
