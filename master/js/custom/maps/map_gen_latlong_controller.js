App.controller('MapGenLatLongController', [
  '$scope',
  '$rootScope',
  '$http',
  '$state',
  '$stateParams',
  'MapsServices',
  'Notify',
  'message',
  'Geocoding',
  'GeoLocation',
  'GeocodingServices',
  'tempStorageData',
  'Decoder',
  function($scope, $rootScope, $http, $state, $stateParams, MapsServices, Notify, message, Geocoding, GeoLocation, GeocodingServices, tempStorageData, Decoder) {
      if(($stateParams.map_mode_use !== undefined || $stateParams.map_mode_use !== null) && ($stateParams.map_mode_use == 'assigned' || $stateParams.map_mode_use == 'journey' || $stateParams.map_mode_use == 'route'))
      {
        'use strict';
      }
      $scope.MAP;

      //recuperar $stateParams.map_mode_use para defirnir intencion del mapa
      uso_mapa = $stateParams.map_mode_use !== undefined || $stateParams.map_mode_use !== null ? $stateParams.map_mode_use : 'no-map-origin';
      var geoJson  = null;
      var routeId  = null;
      var packages = null;
      var place    = null;
      var returnTo = null;

      //adecuar datos para la vista y seteo del object map
      switch(uso_mapa) {
          case 'geocoding':

              $scope.map = {
                coordinates: {
                  longitude: -74.12464382600275,
                  latitude: 4.692948474207697
                },
                newCoordinates: {
                  longitude: '',
                  latitude: ''
                },
                address: '',
                newAddress: '',
                zone: '',
                newZone: '',
                save: false
              };

              $scope.geocoding = {
                model: {
                  address: '',
                  zone: '',
                  location: {
                    x: 0,
                    y: 0
                  }
                }
              };

              break;
          case 'address':

          $scope.address;
          $scope.map = {
            coordinates: {
              longitude: -74.04487,
              latitude: 4.73162
            },
            newCoordinates: {
              longitude: '',
              latitude: ''
            },
            modific : false
          };

              break;
          case 'assigned':
              $scope.address;
              $scope.map = {
                coordinates : {longitude: -74.04487, latitude: 4.73162}
              }
              var address = $stateParams.address || {};
              var latitude = (typeof address.latitude !== 'undefined')? parseFloat(address.latitude) : '';
              var longitude = (typeof address.longitude !== 'undefined')? parseFloat(address.longitude) : '';
              if(longitude && latitude) {
                $scope.map.coordinates = {longitude : longitude, latitude: latitude};
              }
              break;
          case 'journey':
              $scope.map = {
                routes : '',
                idRoute : '',
                MAP : ''
              };
              $scope.journey = $stateParams.journey || null;
              break;
          case 'route':
              if($stateParams.geoJson === null && tempStorageData.data.mapRoute === undefined){
                $state.go('app.routes.list');
                return ;
              }

              if($stateParams.geoJson !== null)
              {
                tempStorageData.data.mapRoute = {
                  geoJson : null,
                  routeId : null,
                  packages : null,
                  place : null,
                  returnTo : {}
                };
              }

              geoJson  = setParamCo($stateParams.geoJson, 'geoJson');
              routeId  = setParamCo($stateParams.routeId, 'routeId');
              packages = setParamCo($stateParams.packages, 'packages');
              place    = setParamCo($stateParams.place, 'place');
              returnTo = setParamCo($stateParams.returnTo, 'returnTo');

              $scope.map = {
                geoJson : geoJson !== null ? geoJson : '',
                routeId : routeId !== null ? routeId : '',
                packages : packages !== null ? packages : '',
                place : place !== null ? place : ''
              };

              $scope.showingTab = true;
              if(returnTo.data.journey !== undefined) {
                tempStorageData.data.journeyRoutes = returnTo.data.journey;
              }

              $rootScope.$on('closeTab', function() {
                $scope.showingTab = false;
              });

              break;
          default:
              //Default
      }

      $scope.$on('$viewContentLoaded', function(event) {
        var mapShow = 'point';
        if(uso_mapa == 'geocoding'){
          $scope.MAP = MapsServices.init({
            container: 'map',
            controlId: 'olmap',
            onClickMap: geocoding
              //onDblClickMap: geocoding
          });
          GeoLocation.getLocation().then(init, init);
        }
        if(uso_mapa == 'address'){
          $scope.MAP = MapsServices.init({
            container : 'map',
            controlId : 'olmap'
          });
          GeoLocation.getLocation().then(init, init);
        }
        if(uso_mapa == 'assigned'){
          $scope.MAP = MapsServices.init({
            container : 'map',
            controlId : 'olmap'
          });
          MapsServices.goToPoint($scope.map.coordinates, true, true);
          MapsServices.zoom(18);
        }
        if(uso_mapa == 'journey'){
          $scope.map.MAP = MapsServices.init({
            container : 'map',
            controlId : 'olmap'
          });

          if(!$scope.journey.routes) return;

          var routes = $scope.journey.routes,
              encodeRoutes = [], decodeRoutes,
              points = [], packages, pack;

          for(var i = 0; i < routes.length; ++i){
            encodeRoutes.push(routes[i].geoJson)
            packages = routes[i].packages;
            if(packages){
              for (var j = 0; j < packages.length; j++) {
                pack = packages[j];
                if(pack && pack.latitude && pack.longitude ){
                  points.push({latitude: pack.latitude, longitude: pack.longitude});
                }else{
                  console.log('== no pack == route[', i,'].packages[',j,']' );
                }
              };
            }else{
              console.log('== no packages == route[', i,']');
            }
          }

          decodeRoutes = Decoder.decodePaths(encodeRoutes);
          MapsServices.showPath(decodeRoutes);
        }
        if(uso_mapa == 'route'){
          $scope.MAP = MapsServices.init({
            container : 'map',
            controlId : 'olmap'
          });

          if($scope.map.geoJson) {
            var points = Decoder.decodePoints($scope.map.geoJson);
            MapsServices.showPath([points]);

            if($scope.map.packages) {
              MapsServices.showPoints($scope.map.packages, $scope.map.place);
            };
          } else {
            console.log($stateParams);
          }
        }
      });

      $scope.accept = function() {
        if(uso_mapa == 'assigned' || uso_mapa == 'journey'){
          if($stateParams.returnTo.state){
            $state.go($stateParams.returnTo.state, $stateParams.returnTo.data);
          }
        }
        
        if(uso_mapa == 'route'){
          if(returnTo.state){
            $state.go(returnTo.state, returnTo.data);
          }
        }
      }

      $scope.zoon = function (){
          if (!$scope.map.idRoute) return;
          MapsServices.zoonToRoute($scope.map.idRoute.id);
      };

      $scope.goToBack = function() {
        if(uso_mapa == 'assigned'){
          $state.go('app.visits.list', {
            journey : $stateParams.returnTo.data.journey,
            packages : $stateParams.returnTo.data.packages
          });
        }
        if(uso_mapa == 'route'){
          if (returnTo.state.name == 'app.routes.list') {
            $state.go('app.routes.list', { journey : returnTo.data.journey } );
          } else if (returnTo.state.name == 'app.journeys.list') {
            $state.go('app.journeys.list');
          }
        }
      };

      $scope.showTab = function() {
        $scope.showingTab = true;
      }

      $scope.save = function() {
        if(uso_mapa == 'geocoding'){
          if (!$scope.map.save) {
            console.log(message);
            message.show("warning", "Actualice las coordenadas");
            return;
          } else {
            if ($stateParams.returnTo.state) {
              $scope.geocoding.model.address = $scope.map.newAddress;
              $scope.geocoding.model.zone = $scope.map.newZone;
              $scope.geocoding.model.location.x = $scope.map.newCoordinates.longitude;
              $scope.geocoding.model.location.y = $scope.map.newCoordinates.latitude;
              $stateParams.returnTo.data.address = $scope.geocoding.model;
              $state.go($stateParams.returnTo.state, {
                data: $stateParams.returnTo.data
              });

            }
          }
        }
        if(uso_mapa == 'address'){
          if(!$scope.map.modific){return;}
          if($stateParams.returnTo.state){
            // TODO: falta modificar los datoso con la nueva direccion
            $stateParams.address.x = $scope.map.newCoordinates.longitude;
            $stateParams.address.y = $scope.map.newCoordinates.latitude;
            // $stateParams.address.status = true;
            $state.go($stateParams.returnTo.state,{ data : $stateParams.returnTo.data });
          }
        }

      };

      $scope.reset = function() {
        if(uso_mapa == 'geocoding'){
          $scope.map.newCoordinates = angular.copy($scope.map.coordinates);
          $scope.map.newAddress = angular.copy($scope.map.address);
          MapsServices.goToPoint($scope.map.coordinates, true);
          $scope.map.save = false;
        }
        if(uso_mapa == 'address'){
          $scope.map.modific = false;
          $scope.map.newCoordinates = angular.copy($scope.map.coordinates);
          MapsServices.goToPoint($scope.map.coordinates, true);
        }

      };

      $scope.cancel = function() {
        if(uso_mapa == 'geocoding'){
          if ($stateParams.returnTo.state) {
            $scope.geocoding.model.address = $scope.map.address;
            $scope.geocoding.model.zone = $scope.map.zone;
            $scope.geocoding.model.location.x = $scope.map.coordinates.longitude;
            $scope.geocoding.model.location.y = $scope.map.coordinates.latitude;
            $stateParams.returnTo.data.address = $scope.geocoding.model;
            $state.go($stateParams.returnTo.state, {
              data: $stateParams.returnTo.data
            });
          }

        }
        if(uso_mapa == 'address'){
          if($stateParams.returnTo.state){
            $state.go($stateParams.returnTo.state, { data : $stateParams.returnTo.data });
          }
        }
        if(uso_mapa == 'assigned'){
          $scope.address;
          $scope.map = {
            coordinates : {longitude: -74.04487, latitude: 4.73162}
          };
        }
      };

      $scope.inverseGeocoding = function() {
        Notify.alert("Buscando dirección, porfavor espere", {
          status: 'info',
          timeout: 5000
        });
        GeocodingServices.reverse($scope.map.newCoordinates.longitude, $scope.map.newCoordinates.latitude).then(function(data) {
          $scope.map.newAddress = data.address;
          $scope.map.newZone = data.zone;
          $scope.map.newCoordinates.longitude = round(data.location.x, 6);
          $scope.map.newCoordinates.latitude = round(data.location.y, 6);
          $scope.map.save = true;
          $.notify.closeAll();
          Notify.alert("Direccion localizada", {
            status: 'success',
            timeout: 2000
          });
        }, function(data) {
          $scope.map.save = false;
          $.notify.closeAll();
          Notify.alert("Direccion no localizada", {
            status: 'danger',
            timeout: 2000
          });
        });

      };

      function init(geolocation) {
        if(uso_mapa == 'geocoding'){
          var geocoding = $stateParams.geocoding || (new Geocoding());
          var latitude = ((typeof geocoding.getLatitude() !== 'undefined') && geocoding.getLatitude() != 0.0) ? geocoding.getLatitude() : geolocation.latitude;
          var longitude = ((typeof geocoding.getLongitude() !== 'undefined') && geocoding.getLongitude() != 0.0) ? geocoding.getLongitude() : geolocation.longitude;
          var address = (typeof geocoding.getAddress() !== 'undefined') ? geocoding.getAddress() : "...";

          $scope.map.address = address || "";
          $scope.map.newAddress = address || "";
          $scope.map.coordinates = {
            longitude: longitude,
            latitude: latitude
          };
          $scope.map.newCoordinates = {
            longitude: longitude,
            latitude: latitude
          };
          MapsServices.goToPoint($scope.map.coordinates, true, true);
          MapsServices.zoom(18);
        }
        if(uso_mapa == 'address'){
          var address = $stateParams.address || {};
          var latitude = (angular.isDefined(address.y) && address.y != 0.0 )? parseFloat(address.y) : geolocation.latitude;
          var longitude = (angular.isDefined(address.x) && address.x != 0.0)? parseFloat(address.x) : geolocation.longitude;;

          $scope.map.coordinates = {
            longitude: longitude,
            latitude: latitude
          };
          $scope.map.newCoordinates = {
            longitude: longitude,
            latitude: latitude
          };
          MapsServices.goToPoint($scope.map.coordinates, true, true);
          MapsServices.zoom(18);
        }
      };

      function setCoordinates(coordinate) {
        if(uso_mapa == 'geocoding'){
          $scope.map.newCoordinates.longitude = coordinate[0];
          $scope.map.newCoordinates.latitude = coordinate[1];
          $scope.map.newAddress = '';
          $scope.map.save = false;
        }
        if(uso_mapa == 'address'){
          $scope.map.newCoordinates.longitude = coordinate[0];
          $scope.map.newCoordinates.latitude = coordinate[1];
          $scope.map.modific = true;
        }

        $scope.$digest();

      }

      function setParamCo(stateParam, param)
      {
        if(stateParam !== null){
          tempStorageData.data.mapRoute[param] = stateParam;
          return stateParam;
        }else if(tempStorageData.data.mapRoute[param] !== null){
          return tempStorageData.data.mapRoute[param];
        }else {
          tempStorageData.data.mapRoute[param] = null;
          return null;
        }
      }

      function geocoding(coordinates) {
        setCoordinates(coordinates);
        $scope.inverseGeocoding();
      }

      function round(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals);
      }

    } // fin de funcion
  ]);
