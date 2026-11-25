/**=========================================================
 * Module: vehicle_type_controller.js
 * controllador para el modulo de tipos de vehiculos
 =========================================================*/
App.controller('driverController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  '$stateParams',
  'message',
  'DriversHttp',
  function ($scope, $rootScope, $filter, $state, $stateParams, message, DriversHttp) {

    $scope.ADD_STATE = 'app.drivers.add';
    $scope.EDIT_STATE = 'app.drivers.edit';
    
    $scope.currentState = $state.current.name;
    
    $scope.driver = {
      model : {
        licenceNumber : "",
        identificationNumber : "",
        phoneNumber : "",
        active : true,
        user : {
          firstName : "",
          lastName : "",
          login : "",
          password : "",
          active : true
        },
      },
      save : function() {

        if ( !validateForm() ) {
          return;
        }
        
        if ($state.is('app.drivers.add') && ($scope.driver.model.user.password !== $scope.driver.model.user.repeatPassword) ) {
          message.show("error", "Las contraseñas no son iguales");
          $scope.driver.model.user.password = "";
          $scope.driver.model.user.repeatPassword = "";
          return;
        }

        var _DriversHttp = new DriversHttp($scope.driver.model);
        if ($state.is('app.drivers.add')) {
          _DriversHttp.$save(function(response) {
            $state.go('app.drivers.list');
          }, function (faild) {
            console.log(faild);
            message.show("error", faild.message); 
          })
        }else if ($state.is('app.drivers.edit')) {
          _DriversHttp.$update(function(response) {
            $state.go('app.drivers.list');
          }, function (faild) {
            console.log(faild);
            message.show("error", faild.message); 
          });
        }
      },
      cancel : function() {
        if ($stateParams.returnTo == undefined) {
          $state.go('app.drivers.list');
        } else if ($stateParams.returnTo.state) {
          $state.go($stateParams.returnTo.state, $stateParams.returnTo.data );
        } else {
          $state.go('app.drivers.list');
        }
      }
    }

    $scope.driver.model = $stateParams.driver || $scope.driver.model;

    $scope.$watch('driver.model.licenceNumber', function(newValue, oldValue) {
      if (newValue == undefined || newValue == '') {
        $scope.licenceNumber_required = true;
      } else {
        $scope.licenceNumber_required = false;
      }
    })


    $scope.$watch('driver.model.user.firstName', function(newValue, oldValue) {
      if (newValue == undefined || newValue == '') {
        $scope.firstName_required = true;
      } else {
        $scope.firstName_required = false;
      }
    })

    $scope.$watch('driver.model.user.lastName', function(newValue, oldValue) {
      if (newValue == undefined || newValue == '') {
        $scope.lastName_required = true;
      } else {
        $scope.lastName_required = false;
      }
    })    

    $scope.$watch('driver.model.identificationNumber', function(newValue, oldValue) {
      if (newValue == undefined || newValue == '') {
        $scope.identificationNumber_required = true;
      } else {
        $scope.identificationNumber_required = false;
      }
    })

    $scope.$watch('driver.model.user.password', function(newValue, oldValue) {
      if ($state.is('app.drivers.add')) {
        if (newValue == undefined || newValue == '') {
          $scope.password_required = true;
        } else {
          $scope.password_required = false;
        }      
      }
    })
    
    $scope.$watch('driver.model.user.login', function(newValue, oldValue) {
      if ($state.is('app.drivers.add')) {
        if (newValue == undefined || newValue == '') {
          $scope.login_required = true;
        } else {
          $scope.login_required = false;
        }
      }
    })
    
    $scope.$watch('driver.model.user.repeatPassword', function(newValue, oldValue) {
      if ($state.is('app.drivers.add')) {
        if (newValue == undefined || newValue == '') {
          $scope.repeatPassword_required = true;
        } else {
          $scope.repeatPassword_required = false;
        }      
      }
    })
    
    
    var validateForm = function() {
      var response = true;
      if ($scope.driver.model.licenceNumber == undefined || $scope.driver.model.licenceNumber == "" ) {
        $scope.licenceNumber_required = true;
        response = false;
      }

      if ($scope.driver.model.user.firstName == undefined || $scope.driver.model.user.firstName == "" ) {
        $scope.firstName_required = true;
        response = false;
      }

      if ($scope.driver.model.user.lastName == undefined || $scope.driver.model.user.lastName == "" ) {
        $scope.lastName_required = true;
        response = false;
      }

      if ($scope.driver.model.identificationNumber == undefined || $scope.driver.model.identificationNumber == "" ) {
        $scope.identificationNumber_required = true;
        response = false;
      }      

      if ($state.is('app.drivers.add')) {
        if ($scope.driver.model.user.password == undefined || $scope.driver.model.user.password == "" ) {
          $scope.password_required = true;
          response = false;
        }      

        if ($scope.driver.model.user.repeatPassword == undefined || $scope.driver.model.user.repeatPassword == "" ) {
          $scope.repeatPassword_required = true;
          response = false;
        }      
      }
      return response;
    }


  }
]);