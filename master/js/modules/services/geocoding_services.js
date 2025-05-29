
/**=========================================================
 * Module: geocoding_services.js
 * servicios para geocodificacion y la geocodificacion inversa
 =========================================================*/

App.factory('GeocodingServices', [
  '$http',
  '$q',
  'config',
  function ($http, $q, config) {
  
  function reverse (longitude, latitude) {
    var deferred = $q.defer();
    var address = {
      location : {
        x : longitude,
        y : latitude
      }
    };

    $http.post(config().path.api.reverse_geocoding, address)
      .success(function (data, status) {
        deferred.resolve(data);
      })
      .error(function (data, status) {
        console.info("=====********=======")
        console.dir(arguments);
        var result = {};
        result.status = data.status;
        result.message = data.message;
        deferred.reject(result);
      });

    return deferred.promise;
  }

  return {
    reverse : reverse
  };
}]);