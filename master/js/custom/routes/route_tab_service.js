/**=========================================================
 * Module: route_tab_controller.js
 * controllador para la pestaña de mostrar rutas
 =========================================================*/

App.factory('RouteTabService', [
  '$rootScope',
  'MapsServices',
  function ($rootScope, MapsServices) {
    var data = {
      name : '',
      geojson : null,
      routeList : []
    };

    var broadcast = function (data) {
      $rootScope.$broadcast('routeTab.update', data);
    };

    var open = function () {
      $rootScope.$broadcast('offsidebar.route.open', {});
    }

    var update = function (journeyName, place, routeList) {
      //data.geojson = newGeojson;
      data.name = journeyName;
      data.routeList = routeList;
      data.place = place;
      broadcast(data);
    };

    return {
      data : data,
      update : update,
      open : open
    };
  }]);