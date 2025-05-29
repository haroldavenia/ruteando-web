
/**=========================================================
 * Module: reset_controller.js
 * access acount
 =========================================================*/
App.controller('ResetController',[
    "$rootScope",
    "$scope",
    "$location",
    "$state",
    '$stateParams',
    "message",
    "oauthHttp",
    function($rootScope, $scope, $location, $state, $stateParams, message, oauthHttp) {

    var activate_token = $stateParams.token;

    	$scope.account = {
    		model: {
    			password: '',
    			password_repeat : '',
    			token : ''
    		},
    		send : function() {
        		var _oauthHttp = new oauthHttp($scope.account.model);
        		_oauthHttp.$resetPassword(function(response) {
        			$state.go('access.login');
              message.show("check","contraseña cambiada exitosamente");
        		}, function(response) {
              message.show("error","ocurrio un error");
        			$state.go('access.login');
        		})
    		}
    	}

      $scope.account.model.token = activate_token;
    }
]);
