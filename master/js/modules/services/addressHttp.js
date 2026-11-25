'use strict';

  App.service('addressHttp', function addressHttp($http, $q, config) {
  	return({
  		geoCoding: geoCoding
  	});

  	function geoCoding(parameters) {
  	console.log('corregir parametro url addressHttp.js');
      var request = $http({
                      method: "post",
                      data: parameters,
//                      url: 'http://52.26.129.237:9001/hanoit/api/v1/geocoding'
                      url: config().path.api.geocoding
                    });
                    return( request.then( handleSuccess, handleError ) );
  	 }

    function handleSuccess( response ) {
        return( response );
    }


    function handleError( rejection ) {
       return $q.reject(rejection);
    }

  });




