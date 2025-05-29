/**=========================================================
 * Module: drivers_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
App.service('CatalogsHttp', [
    '$http', 
    '$q', 
    '$resource',
    'config',
    function ($http, $q, $resource, config) {

        var url = config().path.api.catalogs;
        
        var paramDefault = {
                id : '@id'
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
                }
            };

        return $resource(url, paramDefault, actions);
    }

]);
