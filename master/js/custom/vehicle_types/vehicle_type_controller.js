/**=========================================================
 * Module: vehicle_type_controller.js
 * controllador para el modulo de tipos de vehiculos
 =========================================================*/
App.controller('VehicleTypeController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  '$stateParams',
  'VehicleTypesHttp',
  'message',
  function ($scope, $rootScope, $filter, $state, $stateParams, VehicleTypesHttp, message) {


    $scope.vehicleType = {
      model : {
        id : '',
        name : '',
        weight : 0,
        volume : 0,
        capability : 'volume',
        measure : {
          height : 0,
          width : 0,
          depth : 0
        },
        restriction : {
          minWeight : 0,
          minVolume : 0,
          maxWeight : 0,
          maxVolume : 0
        }
      },
      save : function() {
        var _vehicleType = $scope.vehicleType.model;

        if ($scope.name_required) {
          return true;
        };
        if ($scope.weight_required) {
          return true;
        };
        if ($scope.volume_required) {
          return true;
        };

        var vehicleType = {
          id : _vehicleType.id,
          name : _vehicleType.name,
          weight : _vehicleType.weight * 1000,
          volume : _vehicleType.volume,
          capability : _vehicleType.capability,
          measure : {
            height : _vehicleType.measure.height ,
            width : _vehicleType.measure.width ,
            depth : _vehicleType.measure.depth 
          },
          restriction : {
            minWeight : _vehicleType.restriction.minWeight * 1000,
            minVolume : _vehicleType.restriction.minVolume,
            maxWeight : _vehicleType.restriction.maxWeight * 1000,
            maxVolume : _vehicleType.restriction.maxVolume
          }
        };

        var _VehicleTypesHttp = new VehicleTypesHttp(vehicleType);
        if ($state.is('app.vehicleTypes.add')) {
          _VehicleTypesHttp.$save( function(response) {
            if ($stateParams.returnTo.state) {
              $state.go($stateParams.returnTo.state, {data : $stateParams.returnTo.data } );
            } else {
              $state.go('app.vehicleTypes.list');
            }
          });	
        } else if ($state.is('app.vehicleTypes.edit')) {
          _VehicleTypesHttp.$update( function(response) {
            if ($stateParams.returnTo.state) {
              $state.go($stateParams.returnTo.state, {data : $stateParams.returnTo.data } );
            } else {
              $state.go('app.vehicleTypes.list');
            }
          });
        }
      },
      cancel : function() {
        if ($stateParams.returnTo.state) {
          $state.go($stateParams.returnTo.state,{ data : $stateParams.returnTo.data } );
        } else {
          $state.go('app.vehicleTypes.list');
        }
      }
    };

    $scope.$watch('vehicleType.model.measure.height', function() {
      if ($scope.vehicleType.model.capability == 'measure') {
        $scope.vehicleType.model.volume = ($scope.vehicleType.model.measure.height * $scope.vehicleType.model.measure.width * $scope.vehicleType.model.measure.depth);
      }
    });

    $scope.$watch('vehicleType.model.measure.width', function() {
      if ($scope.vehicleType.model.capability == 'measure') {
        $scope.vehicleType.model.volume = ($scope.vehicleType.model.measure.height * $scope.vehicleType.model.measure.width * $scope.vehicleType.model.measure.depth);
      }
    });

    $scope.$watch('vehicleType.model.measure.depth', function() {
      if ($scope.vehicleType.model.capability == 'measure') {
        $scope.vehicleType.model.volume = ($scope.vehicleType.model.measure.height * $scope.vehicleType.model.measure.width * $scope.vehicleType.model.measure.depth);
      }
    });

    $scope.$watch('vehicleType.model.weight', function(newValue, oldValue) {

      if (newValue == 0 || newValue == undefined) {
        $scope.weight_required = true;        
      } else {
        $scope.weight_required = false;        
      }

    })      

    $scope.$watch('vehicleType.model.volume', function(newValue, oldValue) {

      if ($scope.vehicleType.model.capability == 'volume') {
        $scope.vehicleType.model.measure = {
          height: 0,
          width: 0,
          depth: 0
        };
      }

      if (newValue == 0 || newValue == undefined) {
        $scope.volume_required = true;        
      } else {
        $scope.volume_required = false;        
      }

    })        

    $scope.$watch('vehicleType.model.restriction.minWeight', function (newValue, oldValue) {
      if (newValue > $scope.vehicleType.model.restriction.maxWeight) {
        message.show("error", $filter('translate')('vehicleTypes.errorMessage.minWeight>maxWeight'));
        $scope.vehicleType.model.restriction.minWeight = oldValue;
      }
    })

    $scope.$watch('vehicleType.model.restriction.maxWeight', function (newValue, oldValue) {
      if (newValue > $scope.vehicleType.model.weight) {
        message.show("error", $filter('translate')('vehicleTypes.errorMessage.maxWeight>weight'));
        $scope.vehicleType.model.restriction.maxWeight = oldValue;
      } else if (newValue < $scope.vehicleType.model.restriction.minWeight) {
        message.show("error", $filter('translate')('vehicleTypes.errorMessage.maxWeight<minWeight'));
        $scope.vehicleType.model.restriction.maxWeight = oldValue;
      }
    })

    $scope.$watch('vehicleType.model.restriction.minVolume', function (newValue, oldValue) {
      if (newValue > $scope.vehicleType.model.restriction.maxVolume) {
        message.show("error", $filter('translate')('vehicleTypes.errorMessage.minVolume>maxVolume'));
        $scope.vehicleType.model.restriction.minVolume = oldValue;
      }
    })

    $scope.$watch('vehicleType.model.restriction.maxVolume', function (newValue, oldValue) {
      if (newValue > $scope.vehicleType.model.volume) {
        message.show("error", $filter('translate')('vehicleTypes.errorMessage.maxVolume>volume'));
        $scope.vehicleType.model.restriction.maxVolume = oldValue;
      } else if (newValue < $scope.vehicleType.model.restriction.minVolume) {
        message.show("error", $filter('translate')('vehicleTypes.errorMessage.maxVolume<minVolume'));
        $scope.vehicleType.model.restriction.maxVolume = oldValue;
      }
    })

    $scope.$watch('vehicleType.model.name', function() {
      if ($scope.vehicleType.model.name == undefined || $scope.vehicleType.model.name == '') {
        $scope.name_required = true;
        return true;
      } else {
        $scope.name_required = false;
      }
    })



    if ($stateParams.vehicleType) {
      var _vehicleType = $stateParams.vehicleType;
      var vehicleType = {
        id : _vehicleType.id,
        name : _vehicleType.name,
        weight : _vehicleType.weight / 1000,
        volume : _vehicleType.volume,
        capability : _vehicleType.capability,
        measure : {
          height : _vehicleType.measure.height,
          width : _vehicleType.measure.width ,
          depth : _vehicleType.measure.depth
        },
        restriction : {
          minWeight : _vehicleType.restriction.minWeight / 1000,
          minVolume : _vehicleType.restriction.minVolume,
          maxWeight : _vehicleType.restriction.maxWeight / 1000,
          maxVolume : _vehicleType.restriction.maxVolume
        }
      };
      $scope.vehicleType.model = vehicleType;
    } else {
      $scope.vehicleType.model = $scope.vehicleType.model;
    }


  }
]);