/**=========================================================
 * Module: assigned_services_form_controller.js
 * controllador para el modulo agregar un servicio
 =========================================================*/
App.controller('AssignedServicesFormController',[
  '$scope',
  '$rootScope',
  '$state',
  '$stateParams',
  'DriversHttp',
  'VehiclesHttp',
  'AssignedServicesHttp',
  '$timeout',
  'tempStorageData',
  function ($scope, $rootScope, $state, $stateParams, DriversHttp, VehiclesHttp, AssignedServicesHttp, $timeout, tempStorageData) {

    if($stateParams.route === null && tempStorageData.data.journeyRoutes === undefined){
      $state.go('app.routes.list');
    }else{

      $scope.route = $stateParams.route;

      $scope.assignedService = {
        model : {
          route : {
            id : ''
          },
          vehicle : {
            id : ''
          },
          driver : {
            id : ''
          },
          executionDate: "2015-12-13",
          state : "ACTIVO"
        },
        save : function() {
          $scope.assignedService.model.route.id = $scope.route.id;
          $scope.assignedService.model.vehicle.id = $scope.vehicles.selected.id;
          $scope.assignedService.model.driver.id = $scope.drivers.selected.id;
          var _AssignedServicesHttp = new AssignedServicesHttp($scope.assignedService.model);
          _AssignedServicesHttp.$save( function(response) {
            alert("aqui toy");
            console.log(response);
          });
        },
        goToBack : function () {
          $state.go('app.routes.list', { journey : $stateParams.returnTo.data.journey } );
        }
      }


      $scope.vehicles = {
        selected: {},
        add : function() {
          $state.go('app.vehicles.add');
        },
        data : [],
        getData : function() {
          VehiclesHttp.getList(function(response) {
            $scope.vehicles.data = response;
          });
        }
      };

      $scope.vehicles.getData();

      $scope.drivers = {
        selected: {},
        add : function() {
          $state.go('app.vehicles.add');
        },
        data : [],
        getData : function() {
          DriversHttp.getList(function(response) {
            var data = [];
            for (var i = 0; i < response.length ; i++) {
              data.push(response[i]);
              data[i].name = response[i].user.firstName + " " + response[i].user.lastName;
              data[i].login= response[i].user.login;
              $scope.drivers.data.push(data[i]);
            }
            $scope.drivers.data = data;
          });
        }
      };

      $scope.drivers.getData();


      tempStorageData.data.journeyRoutes = $stateParams.returnTo.data.journey;
  }

  }
]);
