
/**=========================================================
 * Module: offsidebar_controller.js
 * controllador para el offsidebar derecho
 =========================================================*/

 App.controller('OffsidebarController', [
  '$scope',
  '$rootScope',
  function ($scope, $rootScope) {

    $body = $('body');
    var classname = "offsidebar-open";
    $scope.tabs = {
      route : {
        active : false,
        name : 'route'
      },

      other : {
        active : false,
        name : 'other'
      }
    }

    function openTab (tab) {
      if( !$body.hasClass(classname) ) {
        $body.addClass(classname);
      }

      for(k in $scope.tabs){
        $scope.tabs[k].active = false;
      }

      $scope.tabs[tab].active = true;
    }

    $scope.$on('offsidebar.route.open', function (evt) {
      openTab('route');
    });

    $scope.$on('offsidebar.other.open', function (evt) {
      openTab('other');
    });

    $scope.$on('offsidebar.close', function (evt) {
      if( $body.hasClass(classname) ) {
        $body.removeClass(classname);
      }
    });
    
    $rootScope.$watch('app.showingMap', function() {
      if (!$rootScope.app.showingMap && $body.hasClass(classname) ) {
        $body.removeClass(classname);
      }
    });
   
 }])