/**=========================================================
 * Module: vehicle_controller.js
 * controllador para el modulo vehiculos
 =========================================================*/
App.controller('VehicleController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  '$stateParams',
  'VehicleTypesHttp',
  'VehiclesHttp',
  'resincTknRefresh',
  function ($scope, $rootScope, $filter, $state, $stateParams, VehicleTypesHttp, VehiclesHttp, resincTknRefresh) {

    var next = $stateParams.next || 'app.vehicles.list';
    var back = $stateParams.back || 'app.vehicles.list';

    $scope.vehicleType_required = false;

    $scope.$watch('vehicle.model.name', function() {
      if ($scope.vehicle.model.name == undefined || $scope.vehicle.model.name == '') {
        $scope.name_required = true;
      } else {
        $scope.name_required = false;
      }
    })

    $scope.$watch('vehicle.model.licencePlate', function() {
      if ($scope.vehicle.model.licencePlate == undefined || $scope.vehicle.model.licencePlate == '') {
        $scope.licencePlate_required = true;
      } else {
        $scope.licencePlate_required = false;
      }
    })

    $scope.$watch('vehicleTypes.current', function() {
      if ($scope.vehicleTypes.current.name == undefined) {
        $scope.vehicleType_required = true;
      } else {
        $scope.vehicleType_required = false;
      }
    })

    $scope.vehicle = {
      model : {
        licencePlate : '',
        name : '',
        typeResource : {
          id : ''
        }
      },
      save : function() {
        if (!$scope.name_required && !$scope.licencePlate_required && !$scope.vehicleType_required) {
          var vehicle = new VehiclesHttp($scope.vehicle.model);
          if ($state.is('app.vehicles.add')) {
            vehicle.$save(function(result) {
              if ($stateParams.returnTo.state) {
                $state.go($stateParams.returnTo.state, {data : $stateParams.returnTo.data } );
              } else {
                $state.go('app.vehicles.list');
              }
            });
          } else if ($state.is('app.vehicles.edit')) {
            vehicle.$update(function(result) {
              if ($stateParams.returnTo.state) {
                $state.go($stateParams.returnTo.state, {data : $stateParams.returnTo.data } );
              } else {
                $state.go('app.vehicles.list');
              }
            });
          }

        }
      },
      setTypeResource : function(typeResource) {
        $scope.vehicle.model.typeResource.id  = typeResource.id;
      }
    }

    $scope.vehicleTypes = {
      current: {},
      add : function() {
        $state.go('app.vehicleTypes.add');
      },
      data : []
    };

    (function() {
      console.log($stateParams.vehicle);
      var vehicle = $stateParams.vehicle || {};
      $scope.vehicle.model.id = vehicle.id;
      $scope.vehicle.model.licencePlate = (!angular.isUndefined(vehicle.licencePlate))? vehicle.licencePlate:'';
      $scope.vehicle.model.name = (!angular.isUndefined(vehicle.name))? vehicle.name:'';
      if(vehicle.typeResource){
        $scope.vehicle.model.typeResource.id = (!angular.isUndefined(vehicle.typeResource.id))? vehicle.typeResource.id:'';
      }
    })();

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        VehicleTypesHttp.getList( function(response) {
          $scope.vehicleTypes.data = response;
          $scope.vehicleTypes.current  = getVehicleType($scope.vehicleTypes.data, $scope.vehicle.model.typeResource.id);
        });
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

    function getVehicleType(vector, ID) {
      var i;
      if(!ID) return {};
      for(i = 0; i < vector.length; i++){
        if (vector[i].id == ID) {
          return vector[i];
        }
      }
      return {};
    };

    $scope.cancelForm = function() {
      $state.go(back);
    };


  }]);
