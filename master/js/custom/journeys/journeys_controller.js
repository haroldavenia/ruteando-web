/**=========================================================
 * Module: journeys_controller.js
 * controllador para el modulo de trajectos
 =========================================================*/
App.controller('JourneysController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  'JourneyHttp',
  'resincTknRefresh',
  'ngDialog',
  'tpl',
  'RouteTabService',
  'message',
  'PdfExporter',
  'XlsxExporter',
  function ($scope, $rootScope, $filter, $state, JourneyHttp, resincTknRefresh, ngDialog, tpl, RouteTabService, message, PdfExporter, XlsxExporter) {

    $scope.journeys = {
      paginations : {
        maxSize : 3,
        itemsPerPage : 10,
        currentPage : 0,
        totalItems : 0
      },
      selectedAll : false,
      filterText : '',
      dataSource : [],
      selectedItems : [],
      data : [],
      selectAll : function() {
        $scope.journeys.selectedAll = !$scope.journeys.selectedAll;
        for (var key in $scope.journeys.selectedItems) {
          $scope.journeys.selectedItems[key].check = $scope.journeys.selectedAll;
        }
      },
      goToChart: function() {
        $state.go("app.journeys.chart");
      },
      goToDetail: function(journey) {
          console.log("aqui toy");
          console.log(journey);
        $state.go("app.journeys.detail", { data : journey });
      },
      goToMap : function(item) {
        $rootScope.loadingVisible = true;
        var _JourneyHttp = new JourneyHttp({ id : item.id });
        _JourneyHttp.$detail(function (journey) {
          $rootScope.loadingVisible = false;
          var routesList = [];
          angular.forEach(journey.routes, function(route, key){
            this.push({
              id: route.id || (''+key),
              name : route.name || ("Ruta-"+key),
              geoJson : route.geoJson,
              packages : route.packages
            });
          }, routesList);
          RouteTabService.update(journey.name, journey.place, routesList);
          RouteTabService.open();
          $state.go('app.maps.route', { map_mode_use: 'route', geoJson : routesList[0].geoJson, routeId : null, place : journey.place, packages: routesList[0].packages, returnTo : {state : $state.current , data: {}}});

        }, function(faild) {
          message.show("error", "Error intentando ir al mapa");
          $rootScope.loadingVisible = false;
        });
      },
      goToRoute : function(journey) {
        $state.go('app.routes.list',{ journey : journey });
        //          $state.go("app.routes.list");
      },
      add : function() {
        $state.go('app.journeys.add');
      },
      removeItem : function(journey) {
        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {

          var _JourneyHttp = new JourneyHttp(journey);
          _JourneyHttp.$delete(function (data) {
            $scope.journeys.getData();
          })

        });
      },
      exportPDf : function (item) {
        //var pdf = new PdfExporter('l');
        //var _route = route;
        //_route.date = $scope.journeys.current.date;
        //_route.routeRestrictionType = $scope.journeys.current.routeRestrictionType;
        // processRoute(_route);
        //pdf.getReportVisitList(_route);
      },
      exportXLSX : function (item) {
        console.log(item);
        $rootScope.loadingVisible = true;
        var _JourneyHttp = new JourneyHttp({ id : item.id });
        _JourneyHttp.$detail(function (journey) {
          $rootScope.loadingVisible = false;
          var routesList = [];
          angular.forEach(journey.routes, function(route, key){
            var ruta = route;
            processRoute(ruta);
            routesList.push(ruta);
          });

          XlsxExporter.getReportJourneyVisitList(routesList);

        }, function(faild) {
          message.show("error", "Error intentando traer rutas");
          $rootScope.loadingVisible = false;
        });
        //processRoute(route);
        //XlsxExporter.getReportVisitList(route);
      },
      remove : function() {

        var paramFilter = [{
          "key": "check",
          "value": true,
          "precision": true
        }];

        var removeElements = $filter('arrayFilter')($scope.journeys.selectedItems, paramFilter);
        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {

          var ids = '';
          for (var i = 0; i < removeElements.length; i++) {
            ids += removeElements[i].id + ',';
          }
          (ids !== '') ? ids = ids.substring(0, ids.length -1) : null;
          var _JourneyHttp = new JourneyHttp({ ids : ids });
          _JourneyHttp.$deleteIds(function (data) {
            message.show("success", $filter('translate')('journeys.message.deleteConfirm'));
            $scope.journeys.getData();
          })

        });

      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.journeys.filterText,
          "precision": false
        }];
        $scope.journeys.selectedItems = $filter('arrayFilter')($scope.journeys.dataSource, paramFilter);
        $scope.journeys.paginations.totalItems = $scope.journeys.selectedItems.length;
        $scope.journeys.paginations.currentPage = 1;
        $scope.journeys.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.journeys.paginations.currentPage == 1 ) ? 0 : ($scope.journeys.paginations.currentPage * $scope.journeys.paginations.itemsPerPage) - $scope.journeys.paginations.itemsPerPage;
        $scope.journeys.data = $scope.journeys.selectedItems.slice(firstItem , $scope.journeys.paginations.currentPage * $scope.journeys.paginations.itemsPerPage);
      },
      getData : function() {
        $scope.journeys.data = [];
        $scope.journeys.loading = true;
        $scope.journeys.noData = false;
        JourneyHttp.getList(function(result) {
          var data = result.reverse();
          $scope.journeys.selectedItems = data;
          $scope.journeys.dataSource = data;
          $scope.journeys.paginations.totalItems = $scope.journeys.selectedItems.length;
          $scope.journeys.paginations.currentPage = 1;
          $scope.journeys.changePage();
          $scope.journeys.loading = false;
          ($scope.journeys.dataSource.length < 1) ? $scope.journeys.noData = true : null;
        })

      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        $scope.journeys.getData();
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

    var processRoute = function(route) {
      var timeNextPoint = 0;
      var distNextPoint = 0;
      var pointIndex = 0;

      for (var index = 0; index <  route.instructions.length - 1 ; index++) {
        var type = route.instructions[index][0];

        if (type == 9 || type == 15) {
          var directionFrom = "";
          var directionTo = "";
          var unloadTime;
          /**
                 * Start point
                */
          if (pointIndex == 0) {
            route.packages[pointIndex].distanceArrival = parseInt(distNextPoint);
            route.packages[pointIndex].timeArrival = (timeNextPoint / 60).toFixed(1);
            /**
            *  Internedien points
            */
          } else if (type == 9) {
            route.packages[pointIndex].distanceArrival = parseInt(distNextPoint);
            route.packages[pointIndex].timeArrival = (timeNextPoint / 60).toFixed(1);
            /**
            * End point
            **/
          } else if (type == 15) {
            route.packages[pointIndex].distanceArrival = parseInt(distNextPoint);
            route.packages[pointIndex].timeArrival = (timeNextPoint / 60).toFixed(1);
          }

          var nextPointIndex = pointIndex + 1;
          timeNextPoint = 0;
          distNextPoint = 0;
          pointIndex++;
        } else {
          distNextPoint = distNextPoint + parseInt(route.instructions[index][2]);
          timeNextPoint = timeNextPoint + parseInt(route.instructions[index][4]);
        }
      } // end for
    }


    /*
    	JourneyHttp.getJourneys().then(function(result) {

		      $scope.journeys.selectedItems = result.journeys;
		      $scope.journeys.dataSource = result.journeys;
		      $scope.journeys.paginations.totalItems = $scope.journeys.selectedItems.length;
		      $scope.journeys.paginations.currentPage = 1;
		      $scope.journeys.changePage();
    	})
*/


  }
]);
