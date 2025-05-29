/**=========================================================
 * Module: drivers_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
App.service('DriversHttp', [
  '$http', 
  '$q', 
  '$resource',
  'config',
  function ($http, $q, $resource, config) {

    var url = config().path.api.drivers;

    var paramDefault = {
      id : '@id',
      ids : '@ids'
    };

    actions = {
      'getList' : {
        'method' : 'GET',
        'isArray' : true
      },
      'save':   {
        'method':'POST'
      },
      'read' : {
        'method' : 'GET'
      },
      'update' : {
        'method' : 'PUT'
      },
      'deleteIds' : {
        'method' : 'DELETE'
      }
    };

    return $resource(url, paramDefault, actions);
  }

]);
