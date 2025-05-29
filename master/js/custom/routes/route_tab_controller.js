
/**=========================================================
 * Module: route_tab_controller.js
 * controllador para la pestaña de mostrar rutas
 =========================================================*/

App.controller('RouteTabController', [
  '$scope',
  '$rootScope',
  '$state',
  '$stateParams',
  'RouteTabService',
  'Notify',
  function ($scope, $rootScope, $state, $stateParams, RouteTabService, Notify) {

    $scope.routeTab = {
      name : '',
      geojson : null,
      routeList : []
    };

    $scope.closeTab = function() {
      $rootScope.$broadcast('closeTab', {});
    }

    $scope.routeTab.routeList = RouteTabService.data.routeList;
    $scope.routeTab.name = RouteTabService.data.name;

    $scope.$on('routeTab.update', function () {
      $scope.routeTab = RouteTabService.data;
    });

    $scope.showRoute = function (item) {
      if(!($scope.routeTab.routeList.length > 0)) {
        Notify.alert({
          message: "Seleccione un trajecto",
          status: "warning",
          timeout: 2000
        });
        return;
      }

      //console.log(item);
      $state.go('app.maps.route', {
        map_mode_use: 'route',
        geoJson : item.geoJson,
        routeId : item.id,
        place : $scope.routeTab.place,
        packages : item.packages,
        returnTo : {
          state : 'app.routes.list',
          data : {}
        }
      });
    }


    $scope.goToBack = function() {
      if ($stateParams.returnTo.state.name == 'app.routes.list') {
        $state.go('app.routes.list', { journey : $stateParams.returnTo.data.journey } );
      } else if ($stateParams.returnTo.state.name == 'app.journeys.list') {
        $state.go('app.journeys.list');
      }
    }


}]);
