/**=========================================================
 * Module: journeys_form_controller.js
 * controllador del formulario de trayectos
 =========================================================*/

App.controller('JourneyFileHelpController',[
    '$scope',
    '$rootScope',
    '$state',
    '$stateParams',
    'message',
    function ($scope, $rootScope, $state, $stateParams, message) {
        'use strict';
    
      $scope.journey = {
        goToBack : function() {
          $state.go('app.journeys.add', { data: journeyModel } );
        }
      }
      
      var journeyModel = $stateParams.data;
      
    }
]);