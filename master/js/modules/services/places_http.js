/**=========================================================
 * Module: Places_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
App.service('PlacesHttp', [
  '$http', 
  '$q', 
  '$resource',
  'config',
  function ($http, $q, $resource, config) {

    var url = config().path.api.places;


    var paramDefault = {
      id : '@id',
      ids : '@ids'
    },

        actions = {
          'getList' : {
            'method' : 'GET',
            'isArray' : true
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

    return $resource(url,paramDefault,actions,{});
    //return $resource(url);
  }

]);
