
/**=========================================================
 * Module: register_controller.js
 * App routes and resources configuration
 =========================================================*/
App.controller('RegisterController', [
    '$scope',
    '$http',
    '$state',
    '$translate',
    'config',
    'message',
    'oauthHttp',
    function($scope, $http, $state, $translate, config, message, oauthHttp) {
        'user strict';

        var en_proceso_registro = false;

        $scope.authMsg = '';
        $scope.account = {
          model : {
              username : '',
              password : '',
              password_repeat : ''
            },
          agreed : true,
          register : function(){

            if($scope.account.model.username =='' &&  $scope.account.model.password == '' && $scope.account.model.password_repeat == '')
            {
              message.show("warning",$translate.instant('access.register.messages_status.empty_account'));
              return false;
            }

            if(en_proceso_registro == true){
              message.show("warning",$translate.instant('access.register.messages_status.login_process_sctive'));
              return false;
            }

            var _oauthHttp = new oauthHttp($scope.account.model);
              en_proceso_registro = true;
              _oauthHttp.$signup(function(response) {
              message.show("warning",$translate.instant('access.register.messages_status.success'));
              en_proceso_registro = false;
              //alert("success");
            }, function(response) {
              if(response.exception == 'com.hanoit.oauth.exception.UserDuplicateException'){
                message.show("warning",response.message);
              }else{
                message.show("warning",$translate.instant('access.register.messages_status.default_error'));
              }
              en_proceso_registro = false;
            });


          },
          cancel : function (){
          }
        }

    }
]);
