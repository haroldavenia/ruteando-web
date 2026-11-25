/**=========================================================
 * Module: Visits_http.js
 * service para las conexiones con los servicios web.
 =========================================================*/
App.service('VisitsHttp', [
	'$http',
	'$q',
	function ($http, $q) {
		return ({
			getVisits : getVisits
		});

		function getVisits() {
	  		var request = $http({
	                method: "get",
//	               url: ENDPOINT + NAMESPACE + "/vehicleType"
					url : 'json/visits.json'
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

