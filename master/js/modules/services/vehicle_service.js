/**=========================================================
 * Module: vehicle_service.js
 * servicio para los datos de Vehiculos.
 =========================================================*/

App.service('VehicleService', [
    '$http', 
    '$q', 
    '$resource',
    'config',
    function ($http, $q, $resource, config) {
        
        var url = config().path.api.vehicles,
            paramDefault = {
                'id' : '@id'
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