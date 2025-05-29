
/**=========================================================
 * Module: access_controller.js
 * access acount
 =========================================================*/
App.controller('ActivateController',[
 '$scope',
 '$state',
 '$location',
 '$stateParams',
 'oauthHttp',
 'message',
 function($scope,$state,$location, $stateParams, oauthHttp,message) {

  //var activate_token = $location.search();
  var activate_token = $stateParams.token;

  if (activate_token) {
   var _oauthHttp = new oauthHttp( {token : activate_token } );
   _oauthHttp.$activate(function(response) {
    message.show("success", "usuario confirmado correctamente, ingrese su usuario y contraseña");
    $state.go('access.login');
   }, function(faild) {
    message.show("error", "ocurrió un error al intentar confirmar su usuario");
    $state.go('access.login');
   });
  }
 }
]);
