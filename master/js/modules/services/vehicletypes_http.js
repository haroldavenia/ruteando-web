
App.service('VehicleTypesHttp', [
  '$http', 
  '$q', 
  '$resource',
  'config',
  function ($http, $q, $resource, config) {

    var url = config().path.api.typeResources;

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
    //return $resource(url) paramDefault;
  }

]);
