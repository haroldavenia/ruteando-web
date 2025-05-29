

App.controller('LogoutController',[
 '$scope',
 '$state',
 'tokenStorage',
 'ngDialog',
 function($scope,$state, tokenStorage, ngDialog) {

  $scope.logout = function() {
   ngDialog.openConfirm({
    template: 'app/views/templates/logout_confirmation.html',
    className: 'ngdialog-theme-default',
    scope: $scope
   }).then(function (value) {
    tokenStorage.resetToken();
    $state.go('access.login');
   });

  }


 }
]);