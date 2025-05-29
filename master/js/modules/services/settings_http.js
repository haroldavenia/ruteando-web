/**=========================================================
 * Module: Settings_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
App.service('SettingsHttp', [
    '$http', 
    '$q', 
    '$resource',
    'config',
    function ($http, $q, $resource, config) {

        var url = config().path.api.settings;

                
        var paramDefault = {
                id : '@id',
                ids : '@ids'
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
                    'method' : 'delete'
                }
            };

        return $resource(url,paramDefault,actions,{});
    }

]);

