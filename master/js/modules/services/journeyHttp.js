/**=========================================================
 * Module: journeys_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/

App.service('JourneyHttp',[
  '$http', 
  '$q', 
  '$resource',
  'config',
  function ($http, $q, $resource, config) {

    var url = config().path.api.journeys;

    //        var url = 'http://52.26.129.237:9001/hanoit/api/v1/journeys';
    //        var url = 'http://192.168.1.42:9000/hanoit/api/v1/journeys';

    var paramDefault = {
      id : '@id',
      ids: '@ids'
    },

        actions = {
          'getList' : {
            'url': url + '/summary',
            'method' : 'GET',
            'isArray' : true
          },
          'detail' : {
            'method' : 'GET'
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

