/**=========================================================
 * Module: Routes_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
/*
App.service('RoutesHttp',[
	'$http',
	'$q',
	function ($http, $q) {
		return ({
			getRoutes : getRoutes
		});

		function getRoutes() {
	  		var request = $http({
	                method: "get",
//	               url: ENDPOINT + NAMESPACE + "/Routes"
					url : 'json/routes.json'
	                    });
	        return( request.then( handleSuccess, handleError ) );
		}

		function handleError( error ) {
			return ($q.reject(error));
		}
	   
    	function handleSuccess( response ) {
            return( response.data );
        }
	}]);
*/


App.service('RoutesHttp',[
    '$http', 
    '$q', 
    '$resource',
    'config',
    function ($http, $q, $resource, config) {

        var url = config().path.api.routes;
		
//		console.log("change port 9001 RoutesHttp");
//        var url = 'http://192.168.1.42:9000/hanoit/api/v1/routes';
//        var url = 'http://52.26.129.237:9001/hanoit/api/v1/routes';
                
        var paramDefault = {
                id : '@id'
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
        
        return $resource(url,paramDefault,actions,{});
        //return $resource(url);
    }

]);


