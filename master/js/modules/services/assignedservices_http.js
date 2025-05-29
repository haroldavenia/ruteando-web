/**=========================================================
 * Module: drivers_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
App.service('AssignedServicesHttp', [
  '$http', 
  '$q', 
  '$resource',
  'config',
  function ($http, $q, $resource, config) {

    var url = config().path.api.assignedServices;

    var paramDefault = {
      id : '@id',
      ids : '@ids'
    };

    actions = {
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
