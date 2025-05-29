
/**=========================================================
 * Module: geolocation_service.js
 * servicio de geolocalizacion para la aplicaion
 =========================================================*/

App.factory('GeoLocation', [
  '$q',
  function ($q) {

    function navigatorLocation (deferred) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position){
          var result = {
            latitude : position.coords.latitude,
            longitude : position.coords.longitude
          };
          deferred.resolve(result)
        }, function (error) {
          var  result = "";
          switch(error.code) {
            case error.PERMISSION_DENIED:
                result = "User denied the request for Geolocation."
                break;
            case error.POSITION_UNAVAILABLE:
                result = "Location information is unavailable."
                break;
            case error.TIMEOUT:
                result = "The request to get user location timed out."
                break;
            case error.UNKNOWN_ERROR:
                result = "An unknown error occurred."
                break;
          }
          console.log(result);
          anotherEstrategy(deferred);
        });
      } else {
        anotherEstrategy(deferred);
      }
    };

    function anotherEstrategy (deferred) {
      deferred.reject({ latitude: 0.0, longitude : 0.0 });
    };

    return {
      getLocation : function () {
        var deferred = $q.defer();
        navigatorLocation(deferred);
        return deferred.promise;
      }
    }
    
  }
]);