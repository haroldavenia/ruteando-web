
/**=========================================================
 * Module: access_controller.js
 * access acount 
 =========================================================*/
App.controller('AccessController',[
    "$rootScope",
    "$scope",
    function($rootScope, $scope) {
        $rootScope.app.layout.isBoxed = false;
        $scope.hola = "Decir Holas";
    }
]);

