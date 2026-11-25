/**=========================================================
 * Module: journeys_form_controller.js
 * controllador del formulario de trayectos
 =========================================================*/

App.controller('JourneyDetailController',[
    '$scope',
    '$rootScope',
    '$state',
    '$stateParams',
    'message',
    function ($scope, $rootScope, $state, $stateParams, message) {
        'use strict';
    
      $scope.journey = {
        model : {
          name : '',
          date : '',
          countRoutes : 0
        }
      }
      console.log($stateParams.data);
      $scope.journey.model = $stateParams.data; 
    }
]);