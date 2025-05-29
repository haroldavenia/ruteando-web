
/**=========================================================
 * Module: route_detail_controller.js.js
 * controllador para el detalle de la ruta
 =========================================================*/

App.controller('RouteDetailController', [
  '$scope',
  '$rootScope',
  '$state',
  '$stateParams',
  'PdfExporter',
  'tempStorageData',
  function ($scope, $rootScope, $state, $stateParams, PdfExporter, tempStorageData) {

    if($stateParams.data === null && tempStorageData.data.journeyRoutes === undefined){
      $state.go('app.routes.list');
    }else{

    $scope.routeDetail = {
      model : {
        distance : 100,
        estimatedTime : 30,
        numVisits : 35,
        avgTimeVisit: "05:00 min",
        initTime : "08:00 A.M",
        finalTime : "16:35 P.M",
        weightUse : 95,
        volumeUse : 60,
        cost : 8
      },
      exportPDF : function (argument) {
        var exporter = new PdfExporter();
        exporter.getReportRouteInfo($scope.routeDetail.model);
      },
      goToBack : function () {
        $state.go('app.routes.list', { journey : $stateParams.returnTo.data.journey } );
      }
    };

    $scope.routeDetail.model = $stateParams.data || $scope.routeDetail.model;

    tempStorageData.data.journeyRoutes = $stateParams.returnTo.data.journey;

    var _route = getInfoRoute($stateParams.data);
    $scope.routeDetail.model = _route;

    function getInfoRoute (route) {
      var routeInfo = [];
      var strDiff = '';
      if (route.startRouteDate !== null) {
        var startRouteDate = ''+route.startRouteDate.hour+':'+route.startRouteDate.minute+':'+route.startRouteDate.second;
        var finishRouteDate = ''+route.finishRouteDate.hour+':'+route.finishRouteDate.minute+':'+route.finishRouteDate.second;

        var srd = new Date(0,0,0,
                           route.startRouteDate.hour,
                           route.startRouteDate.minute,
                           route.startRouteDate.second,
                           0
                          );

        var frd = new Date(0,0,((route.startRouteDate.hour > route.finishRouteDate.hour)? 1:0),
                           route.finishRouteDate.hour,
                           route.finishRouteDate.minute,
                           route.finishRouteDate.second,
                           0
                          );

        var diff = parseInt((frd.getTime() - srd.getTime())/1000);
        console.log(diff);
        var total_hour = parseInt(diff/3600)
        var total_min = parseInt((diff - total_hour*3600) / 60);
        strDiff = ''+total_hour+' h '+total_min+' min.';
      }

      var weightUsed = (route.routeRestrictionType == "FIXED_ROUTES")? "No Aplica": ''+(route.weightUsed/1000).toFixed(2)+' Kgr.';
      var volumeUsed = (route.routeRestrictionType == "FIXED_ROUTES")? "No Aplica": ''+(route.volumeUsed/1000000).toFixed(2)+' m3.';

      routeInfo = {
        name : route.name,
        date : route.date,
        distance : ''+(route.distanceTraveled/1000).toFixed(2)+' Km.',
        estimatedTime : strDiff,
        numVisits : route.visitsNumber,
        avgTimeVisit: ''+(route.avgStayTime/60).toFixed(2)+' min.',
        initTime : startRouteDate,
        finalTime : finishRouteDate,
        weightUse : weightUsed,
        volumeUse : volumeUsed,
        cost : route.fuelCost
      }

      return routeInfo;
    };

    }

  }
]);
