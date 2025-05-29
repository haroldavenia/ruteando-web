/**=========================================================
 * Module: visits_controller.js
 * controllador para el modulo de visitas
 =========================================================*/
App.controller('VisitsController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  '$stateParams',
  'VisitsHttp',
  'RoutesHttp',
  'config',
  'tempStorageData',
  function ($scope, $rootScope, $filter, $state, $stateParams, VisitsHttp, RoutesHttp, config, tempStorageData) {

    if($stateParams.returnTo.data.journey === null && $stateParams.journey === undefined && tempStorageData.data.journeyRoutes === undefined){
      $state.go('app.routes.list');
    }else{

    $scope.VISITED = 0;
    $scope.VISIT_PENDING = 1;
    $scope.VISIT_FINISHED = 2;

    $scope.Visits = {
      paginations : {
        maxSize : 3,
        itemsPerPage : 20,
        currentPage : 0,
        totalItems : 0
      },
      selectedAll : false,
      filterText : '',
      dataSource : [],
      selectedItems : [],
      data : [],
      loading : false,
      selectAll : function() {
        $scope.Visits.selectedAll = !$scope.Visits.selectedAll;
        for (var key in $scope.Visits.selectedItems) {
          $scope.Visits.selectedItems[key].check = $scope.Visits.selectedAll;
        }
      },
      goToMap : function(item) {
        $state.go('app.maps.assigned', {
          map_mode_use:'assigned',
          address : item,
          returnTo : {
            state : $state.current,
            data: {
              journey : $scope.journey,
              packages : $scope.Visits.data
            }
          }
        });
      },
      detail : function(item) {
        $state.go('app.visits.detail');
      },
      removeItem : function(item) {
        console.log(item);
      },
      add : function() {
        $state.go('app.visits.add');
      },
      goToBack : function() {
          $state.go('app.routes.list', { journey : $scope.journey } );
/*        if ($stateParams.returnTo.state.name == 'app.routes.list') {
        }*/
      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.Visits.filterText,
          "precision": false
        }];
        if(angular.isDefined($scope.statusFilter.current) && $scope.statusFilter.current != null){
          paramFilter.push({
            "key": "status",
            "value": $scope.statusFilter.current.value,
            "precision": false
          });
        }
        $scope.Visits.selectedItems = $filter('arrayFilter')($scope.Visits.dataSource, paramFilter);
        $scope.Visits.paginations.totalItems = $scope.Visits.selectedItems.length;
        $scope.Visits.paginations.currentPage = 1;
        $scope.Visits.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.Visits.paginations.currentPage == 1 ) ? 0 : ($scope.Visits.paginations.currentPage * $scope.Visits.paginations.itemsPerPage) - $scope.Visits.paginations.itemsPerPage;
        $scope.Visits.data = $scope.Visits.selectedItems.slice(firstItem , $scope.Visits.paginations.currentPage * $scope.Visits.paginations.itemsPerPage);
      },
      setData : function(data) {
          $scope.Visits.selectedItems = data;
          $scope.Visits.dataSource = data;
          $scope.Visits.paginations.totalItems = $scope.Visits.selectedItems.length;
          $scope.Visits.paginations.currentPage = 1;
          $scope.Visits.changePage();
    /*
        $scope.Visits.loading = true;
        VisitsHttp.getVisits().then(function(result) {
          $scope.Visits.selectedItems = result.visits;
          $scope.Visits.dataSource = result.visits;
          $scope.Visits.paginations.totalItems = $scope.Visits.selectedItems.length;
          $scope.Visits.paginations.currentPage = 1;
          $scope.Visits.changePage();
          $scope.Visits.loading = false;
        })
    */
      }
    };

    /*
    $scope.routes = {
      current: {},
      add : function() {
        $state.go('app.routes.add');
      },
      data : []
    };

    RoutesHttp.getList(function(response) {
      $scope.routes.data = response;
    })
    */

    $scope.statusFilter = {
      current : {},
      data : config().visits.status
    };

    ($stateParams.returnTo.data.journey !== undefined) ? $scope.journey = $stateParams.returnTo.data.journey : null ;
    ($stateParams.journey !== null) ? $scope.journey = $stateParams.journey : null ;
    ($stateParams.packages !== undefined ) ? $scope.Visits.setData($stateParams.packages) : null;
    tempStorageData.data.journeyRoutes = $scope.journey;

    }

  }
]);
