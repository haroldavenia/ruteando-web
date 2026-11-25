/**=========================================================
 * Module: Journey_controller.js
 * controllador para el modulo de trajectos
 =========================================================*/
App.controller('ItineraryFormController',[
  '$scope',
  '$rootScope',
  '$state',
  '$stateParams',
  'Notify',
  'Address',
  'Geocoding',
  'uuid',
  'TYPE_LENGTH_OF_STAY',
  '$filter',
  'tempStorageData',
  function ($scope, $rootScope, $state, $stateParams, Notify, Address, Geocoding, uuid, TYPE_LENGTH_OF_STAY, $filter, tempStorageData) {
    "use strict"
    $scope.package = {
      model : {
        id: "",
        guideNumber: "", // ok
        zone: null, // ok
        capability : "volume",
        name: "",
        address: "", // ok
        longitude: "", // ok
        latitude: "", // ok
        deliveryTime : "",
        timeState: null,  // ok
        pieceNumber: 1, // ok
        distanceArrival: 0, //NA
        timeArrival: 0, //NA
        timePlanningArrival: 0, //NA
        visitOrder: "", //NA
        weigth: null,
        volume : null,
        measure: {
          height: 0, // ok
          width: 0, // ok
          depth: 0  // ok
        },
        receiver: {
          address: "",
          phoneNumber: "",
          longitude: 0,
          latitude: 0,
          city: ""
        },
        sender: {
          address: "",
          phoneNumber: "",
          longitude: 0,
          latitude: 0,
          city: ""
        },
        status : false,
        errorMessage : ''
      },
      geocoding : function(field) {

        var returnTo = {
          state: $state.current.name,
          data: {
            journey : $scope.journey,
            package : $scope.package.model,
            field : field,
            address: {}
          }
        };
        $state.go('app.address.geocoding', { returnTo : returnTo });
      },
      goToMap : function(field) {

        var geocoding = new Geocoding({
                    result : field == 'address' ? $scope.package.model : $scope.package.model[field] ,
                    address : "address",
                    latitude : "latitude",
                    longitude : "longitude",
                    status : "status"
                });

        console.log($scope.package.model);
        console.log(geocoding);
        var returnTo = {
          state: $state.current.name,
          data: {
            journey : $scope.journey,
            package : $scope.package.model,
            field : field,
            address: {}
          }
        };

        $state.go('app.maps.geocoding', {map_mode_use: 'geocoding', geocoding : geocoding, returnTo : returnTo });
      },
      send : function() {
        if ($state.is('app.itinerary.add')) {
          $scope.package.model.id = ($scope.journey.itinerary.length == 0) ? 1 : $scope.journey.itinerary[$scope.journey.itinerary.length -1].id + 1;
          $scope.journey.itinerary.push($scope.package.model);
          $state.go('app.itinerary.list', { data: { journey: $scope.journey }});
        } else if ($state.is('app.itinerary.edit')) {
          for (var i = 0; i < $scope.journey.itinerary.length; i++) {
            if ($scope.journey.itinerary[i].id == $scope.package.model.id) {
              $scope.journey.itinerary[i] = $scope.package.model;
              break;
            }
          }
          $state.go('app.itinerary.list', { data: { journey: $scope.journey }});
        }
      },
      cancel : function() {
        $state.go('app.itinerary.list', { data: { journey: $scope.journey }});
      }
    };

    function evaluateStatus() {
      console.log("realizando evaluacion del status de la operación");
      $scope.package.model.status = true;
      var errorMessage = '';
      if (!$scope.package.model.latitude || !$scope.package.model.longitude) {
        errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.ADDRESS') + ',';
        $scope.package.model.status = false;
      }

      if ($scope.journey.setting.evaluateWeight && $scope.package.model.weigth == null) {
        errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.WEIGHT') + ',';
        //            errorMessage = errorMessage + ' Peso,';
        $scope.package.model.status = false;
      }


      if ($scope.journey.setting.evaluateVolume && $scope.package.model.volume == null) {
        errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.VOLUME') + ',';
        //            errorMessage = errorMessage + ' Volumen,';
        $scope.package.model.status = false;
      }

      if ($scope.journey.setting.typeLengthOfStay == TYPE_LENGTH_OF_STAY.DEFINE_ITINERARY && $scope.package.model.timeState == null) {
        errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.TIME_OF_STAY') + ',';
        //            errorMessage = errorMessage + ' Tiempo De Estadia,';
        $scope.package.model.status = false;
      }

      if ($scope.journey.setting.evaluateItineraryZone && $scope.package.model.zone == null) {
        errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.ZONE') + ',';
        //            errorMessage = errorMessage + ' Zona,';
        $scope.package.model.status = false;
      }
      $scope.package.model.errorMessage = errorMessage.substring(0, errorMessage.length - 1);


    }


    $scope.$watch('package.model.latitude',evaluateStatus);
    $scope.$watch('package.model.longitude',evaluateStatus);
    $scope.$watch('package.model.weigth',evaluateStatus);
    $scope.$watch('package.model.volume',evaluateStatus);
    $scope.$watch('package.model.timeState',evaluateStatus);
    $scope.$watch('package.model.zone',evaluateStatus);

    if ($stateParams.data === null) {
      if(tempStorageData.hasOwnProperty('stateParamsItineFrm'))
      {
        $stateParams = tempStorageData.stateParamsItineFrm;
      }
    }

    if ($stateParams.returnTo === undefined && $stateParams.data === null) {
      $state.go('app.home');
    } else {
      $scope.journey = $stateParams.returnTo.data.journey;
      tempStorageData['stateParamsItineFrm'] = $stateParams;
    }

    if ($stateParams.data) {
      if ($stateParams.data.package !== undefined) {
        $scope.package.model = $stateParams.data.package;
        ($scope.package.model.capability == undefined) ? $scope.package.model.capability = 'volume' : null ;
      };

      ($stateParams.data.journey !== undefined) ? $scope.journey = $stateParams.data.journey : null;



      if ($stateParams.data.field !== undefined && $stateParams.data.address !== undefined && $stateParams.data.address.address !== undefined) {
        if ($stateParams.data.field == 'address') {
          $scope.package.model.address = ($stateParams.data.address.address) ? $stateParams.data.address.address : $scope.package.model.address;
          $scope.package.model.longitude = ($stateParams.data.address.location.x) ? $stateParams.data.address.location.x : $scope.package.model.longitude
          $scope.package.model.latitude = ($stateParams.data.address.location.y) ? $stateParams.data.address.location.y : $scope.package.model.latitude;
        } else if ($stateParams.data.field == 'sender') {
          $scope.package.model.sender.address = ($stateParams.data.address.address) ? $stateParams.data.address.address : $scope.package.model.sender.address;
          $scope.package.model.sender.longitude = ($stateParams.data.address.location.x) ? $stateParams.data.address.location.x : $scope.package.model.sender.longitude;
          $scope.package.model.sender.latitude = ($stateParams.data.address.location.y) ? $stateParams.data.address.location.y : $scope.package.model.sender.latitude;
        } else if ($stateParams.data.field == 'receiver') {
          $scope.package.model.receiver.address = ($stateParams.data.address.address) ? $stateParams.data.address.address : $scope.package.model.receiver.address;
          $scope.package.model.receiver.longitude = ($stateParams.data.address.location.x) ? $stateParams.data.address.location.x : $scope.package.model.receiver.longitude;
          $scope.package.model.receiver.latitude = ($stateParams.data.address.location.y) ? $stateParams.data.address.location.y : $scope.package.model.receiver.latitude;
        }
      }
    }

    $scope.$watch('package.model.measure.height', function() {
      if ($scope.package.model.capability == 'measure') {
        $scope.package.model.volume = ($scope.package.model.measure.height * $scope.package.model.measure.width * $scope.package.model.measure.depth);
      }
    });

    $scope.$watch('package.model.measure.width', function() {
      if ($scope.package.model.capability == 'measure') {
        $scope.package.model.volume = ($scope.package.model.measure.height * $scope.package.model.measure.width * $scope.package.model.measure.depth);
      }
    });

    $scope.$watch('package.model.measure.depth', function() {
      if ($scope.package.model.capability == 'measure') {
        $scope.package.model.volume = ($scope.package.model.measure.height * $scope.package.model.measure.width * $scope.package.model.measure.depth);
      }
    });

    $scope.$watch('package.model.volume', function(newValue, oldValue) {

      if ($scope.package.model.capability == 'volume') {
        $scope.package.model.measure = {
          height: 0,
          width: 0,
          depth: 0
        };
      }

    })

    console.log($scope.package.model);

  }
]);
