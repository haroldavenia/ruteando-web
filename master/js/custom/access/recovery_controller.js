
/**=========================================================
 * Module: recovery_controller.js
 * access acount
 =========================================================*/
App.controller('RecoveryController',[
    "$rootScope",
    "$scope",
    "$state",
    "oauthHttp",
    "message",
    function($rootScope, $scope, $state, oauthHttp, message) {

        $scope.account = {
            model: {
                email: ''
            },
            send : function() {
                $rootScope.loadingVisible = true;
                var _oauthHttp = new oauthHttp($scope.account.model);
                _oauthHttp.$forgotPassword(function(response) {
                    $rootScope.loadingVisible = false;
                    message.show("success", "Le enviamos al correo electronico información para restablecer su contraseña.");
                    $state.go('access.login');
                }, function(response) {
                    $rootScope.loadingVisible = false;
                    message.show("error", response.error_description);
                    $state.go('access.login');
                })

            }
        }


    }
]);
