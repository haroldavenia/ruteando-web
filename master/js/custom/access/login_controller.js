
/**=========================================================
 * Module: access_controller.js
 * access acount
 =========================================================*/
 App.controller('LoginController',[
    '$scope',
    '$auth',
    '$state',
    '$translate',
    'config',
    'oauthHttp',
    'tokenStorage',
    'message',
    function($scope, $auth, $state, $translate, config, oauthHttp, tokenStorage, message) {

	    (tokenStorage.getRefreshToken()) ? $state.go('app.home') : null;

        $scope.account = {
          username : 'enterprise@gmail.com',
          password : '123456'
        }
        $scope.login = function() {
          if($scope.account.loading != true){
              //No hay logueo activo
              $scope.account.loading = true;
              var parameters = {
                username : $scope.account.username,
                password : $scope.account.password };

                var _oauthHttp = new oauthHttp(parameters);
                _oauthHttp.$validateUser(function(response){
                  tokenStorage.set(response);
                  //message.show("success", "Bienvenido, inicio de sesión exitoso");
                  message.show("success", $translate.instant('access.login.messages_status.success'));
                  $scope.account.loading = false;
                  $state.go('app.home');
                }, function(faild){
                  $scope.account.loading = false;
                  if(faild.data.error_description == 'Bad credentials'){
                    //message.show('error','Lo sentimos, Usuario o contraseña incorrecto');
                    message.show('error',$translate.instant('access.login.messages_status.bad_credentials'));
                  }else{
                    message.show('error',faild.data.error_description);
                  }
                })
          }else{
            //hay logueo activo
            //message.show("warning","Ya hay proceso de inicio de sesión activo");
            message.show("warning",$translate.instant('access.login.messages_status.login_process_sctive'));
          }

        }

    }
]);
