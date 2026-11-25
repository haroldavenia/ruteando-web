/**=========================================================
 * Module: Routes_controller.js
 * controllador para el modulo lugares
 =========================================================*/
App.controller('RoutesController', [
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  '$stateParams',
  'RoutesHttp',
  'JourneyHttp',
  'resincTknRefresh',
  'RouteTabService',
  '$http',
  'PdfExporter',
  'XlsxExporter',
  'tempStorageData',
  function ($scope, $rootScope, $filter, $state, $stateParams, RoutesHttp, JourneyHttp, resincTknRefresh, RouteTabService, $http, PdfExporter, XlsxExporter, tempStorageData) {

    $scope.Routes = {
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
      noData : true,
      selectAll : function() {
        $scope.Routes.selectedAll = !$scope.Routes.selectedAll;
        for (var key in $scope.Routes.selectedItems) {
          $scope.Routes.selectedItems[key].check = $scope.Routes.selectedAll;
        }
      },
      info : function(item) {
        var _route = item;
        _route.date = $scope.journeys.current.date;
        _route.routeRestrictionType = $scope.journeys.current.routeRestrictionType;
        $state.go('app.routes.detail', {
          data : _route,
          returnTo : {
            state: $state.current.name,
            data: {
              journey : $scope.journeys.current
            }
          }
        });
      },
      goToMap : function(item) {
        this.showRoutesInMap();
        RouteTabService.open();
        $state.go('app.maps.route', { map_mode_use: 'route', geoJson : item.geoJson, routeId : null, place: $scope.journey_current.place, packages: item.packages, returnTo : {state : $state.current , data: { journey : $scope.journeys.current }}});
      },
      share : function() {
      },
      listVists : function(item) {
        $state.go('app.visits.list', {
          packages : item.packages,
          returnTo : {
            state : $state.current,
            data: {
              journey : $scope.journeys.current
            }
          }
        });
      },
      addService : function(route) {
        $state.go('app.assignedServices.add', {
          route : route,
          returnTo : {
            state: $state.current.name,
            data: {
              journey : $scope.journeys.current
            }
          }
        });
      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.Routes.filterText,
          "precision": false
        }];
        $scope.Routes.selectedItems = $filter('arrayFilter')($scope.Routes.dataSource, paramFilter);
        $scope.Routes.paginations.totalItems = $scope.Routes.selectedItems.length;
        $scope.Routes.paginations.currentPage = 1;
        $scope.Routes.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.Routes.paginations.currentPage == 1 ) ? 0 : ($scope.Routes.paginations.currentPage * $scope.Routes.paginations.itemsPerPage) - $scope.Routes.paginations.itemsPerPage;
        $scope.Routes.data = $scope.Routes.selectedItems.slice(firstItem , $scope.Routes.paginations.currentPage * $scope.Routes.paginations.itemsPerPage);
      },
      setData : function(routes) {
        if (routes !== undefined && routes.length > 0) {
          var tmp_routes = routes;
          for (var i = 0; i < tmp_routes.length; i++) {
            tmp_routes[i].name = "Ruta-" + i;
          }
          $scope.Routes.dataSource = tmp_routes;
          $scope.Routes.selectedItems = tmp_routes;
          $scope.Routes.paginations.totalItems = $scope.Routes.selectedItems.length;
          $scope.Routes.paginations.currentPage = 1;
          $scope.Routes.changePage();
        } else {
          $scope.Routes.noData = true;
          $scope.Routes.clearData();
        }
      },
      clearData : function() {
        $scope.Routes.dataSource = [];
        $scope.Routes.selectedItems = [];
        $scope.Routes.paginations.totalItems = 0;
        $scope.Routes.paginations.currentPage = 1;
        $scope.Routes.changePage();
      },
      showRoutesInMap : function () {
        var journey = $scope.journey_current;
        var routesList = [];
        angular.forEach(journey.routes, function(route, key){
          this.push({
            id: route.id || (''+key),
            name : route.name || ("Ruta-"+key),
            geoJson : route.geoJson,
            packages : route.packages
          });
        }, routesList);
        RouteTabService.update($scope.journey_current.name, $scope.journey_current.place, routesList);
      },
      exportPDf : function (route) {
        var pdf = new PdfExporter('l');
        var _route = route;
        _route.date = $scope.journeys.current.date;
        _route.routeRestrictionType = $scope.journeys.current.routeRestrictionType;
        // processRoute(_route);
        pdf.getReportVisitList(_route);
      },
      exportXLSX : function (route) {
        processRoute(route);
        XlsxExporter.getReportVisitList(route);
      }
    }


    var processRoute = function(route) {

      var timeNextPoint = 0;
      var distNextPoint = 0;
      var pointIndex = 0;

      for (var index = 0; index <  route.instructions.length - 1 ; index++) {
        //console.log(route.instructions[index]);
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
//            directionFrom = pdfMessenger.cargo[pointIndex-1]._desc;
//            directionTo = pdfMessenger.cargo[pointIndex]._desc;
//            unloadTime=pdfMessenger.cargo[pointIndex].unloadingTime;
            route.packages[pointIndex].distanceArrival = parseInt(distNextPoint);
            route.packages[pointIndex].timeArrival = (timeNextPoint / 60).toFixed(1);
            /**
            * End point
            **/
          } else if (type == 15) {
            route.packages[pointIndex].distanceArrival = parseInt(distNextPoint);
            route.packages[pointIndex].timeArrival = (timeNextPoint / 60).toFixed(1);
/*
            directionFrom = pdfMessenger.cargo[pointIndex-1]._desc;
            if(Ext.getCmp('returnToDepotID').checked) {
              directionTo = "Deposito";
            } else {
              directionTo=pdfMessenger.cargo[pointIndex]._desc;
              unloadTime=pdfMessenger.cargo[pointIndex].unloadingTime;
            }
*/
          }

//          gloablUnloadTime=gloablUnloadTime+unloadTime;

          var nextPointIndex = pointIndex + 1;
          //                doc.text(15, startPosPDF, 'Visita ' + nextPointIndex + ": ");
          //  doc.text(35, startPosPDF, directionFrom + ' a ' + directionTo);
          //              doc.text(25, startPosPDF, 'Resumen');
          //                doc.text(40, startPosPDF, 'Distancia: ' + (distNextPoint / 1000).toFixed(2) + ' km');
          //                var timeDist=Math.round(timeNextPoint / 60);
          //                doc.text(70, startPosPDF, 'Duración: ' + timeDist + ' min');
          //                startTime=startTime+timeNextPoint;
          //                doc.text(100, startPosPDF, 'Hora Llegada: ' +  gcApi.formatHour(startTime).substring(0,5));
          //                startTime=startTime + unloadTime;
          //                doc.text(135, startPosPDF, 'Hora Salida: ' +  gcApi.formatHour(startTime).substring(0,5) );
          //                doc.text(165, startPosPDF, 'Estadia: ' +  Math.round(unloadTime/60)+" min" );
          //                startPosPDF = startPosPDF + 7;
          timeNextPoint = 0;
          distNextPoint = 0;
          pointIndex++;
        } else {
          distNextPoint = distNextPoint + parseInt(route.instructions[index][2]);
          timeNextPoint = timeNextPoint + parseInt(route.instructions[index][4]);
        }
      } // end for
    }

    $scope.journeys = {
      current: {},
      add : function() {
        $state.go('app.journeys.add');
      },
      data : []
    };

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        JourneyHttp.getList(function(response) {
          $scope.journeys.data = response;
          for (var i = 0; i < $scope.journeys.data.length; i++) {
            if ($scope.journeys.data[i].id == $scope.journeys.current.id) {
              $scope.journeys.current = $scope.journeys.data[i];
              break;
            }
          }
        });

      },
      function(){
        //fail
        $state.go('access.login');
      }
    );


    $scope.$watch('journeys.current', function() {
      if ($scope.journeys.current.id) {
        $scope.Routes.noData = false;
        $scope.Routes.loading = true;
        $scope.Routes.clearData();
        var _JourneyHttp = new JourneyHttp({ id : $scope.journeys.current.id });
        _JourneyHttp.$detail(function (journey) {
          $scope.journey_current = journey;
          $scope.Routes.loading = false;
          $scope.Routes.setData(journey.routes);
          $scope.Routes.showRoutesInMap();
        }, function(faild) {
          $scope.Routes.loading = false;
        });
      }
    })

    if ($stateParams.journey) {
      ($stateParams.journey !== undefined) ? $scope.journeys.current = $stateParams.journey : null;
      defineCurrentJourney();

    }else if(tempStorageData.data.journeyRoutes !== undefined){
      var journeyCached = tempStorageData.data.journeyRoutes;
      (journeyCached !== undefined) ? $scope.journeys.current = journeyCached : null;
      defineCurrentJourney();
    }

    function defineCurrentJourney(){
      for (var i = 0; i < $scope.journeys.data.lenght; i++) {
        if ($scope.journeys.data[i].id == $scope.journeys.current.id) {
          $scope.journeys.current = $scope.journeys.data[i];
          break;
        }
      }
    }



  }
]);
