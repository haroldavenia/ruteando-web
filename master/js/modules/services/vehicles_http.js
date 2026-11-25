/**=========================================================
 * Module: vehicles_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
App.service('VehiclesHttp',[
  '$http', 
  '$q', 
  '$resource',
  'config',
  function ($http, $q, $resource, config) {

    var url = config().path.api.vehicles,
        paramDefault = {
          'id' : '@id',
          'ids' : '@ids'
        },

        actions ={
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

    function handleError( error ) {
      return ($q.reject(error));
    }

    function handleSuccess( response ) {
      return( response.data );
    }

    return $resource(url,paramDefault,actions);
  }

]);

