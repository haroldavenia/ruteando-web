
/**=========================================================
 * Module: MapsController
 * controlador para el control de los mapas
 =========================================================*/
App.controller('MapsController',[
    '$scope',
    '$rootScope',
    '$http',
    '$state',
    '$stateParams',
    'MapsServices',
    'GeoLocation',
    function($scope, $rootScope, $http, $state, $stateParams, MapsServices, GeoLocation) {
      'use strict';

      var next    = $stateParams.next || 'app.maps',
        back    = $stateParams.back || 'app.maps',
        params  = $stateParams.params || {};

      $scope.mapGoogle;

      // cuando la vista se carga completamente se dispara este evento
      // el cual utilizamos para agregar el mapa en los div dispuesto para ello
      $scope.$on('$viewContentLoaded', function (event){
        
        $scope.mapGoogle = MapsServices.init({
          container : 'map',
          controlId : 'olmap'
        });
        
        //MapsServices.center({longitude: -74.12464382600275, latitude: 4.692948474207697});
        GeoLocation.getLocation().then(init, init);
      });
      
      
    function init(geolocation) {
      var latitude     =  geolocation.latitude;
      var longitude    =  geolocation.longitude;
      MapsServices.goToPoint({longitude : longitude, latitude: latitude}, true, true);
      MapsServices.zoom(18);
    };
      

    }
]);