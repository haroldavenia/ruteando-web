/**=========================================================
 * Module: vehicle_controller.js
 * controllador para el modulo vehiculos
 =========================================================*/
App.controller('VehiclesController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  'VehiclesHttp',
  'resincTknRefresh',
  'VehicleService',
  'ngDialog',
  'tpl',
  'message',
  function ($scope, $rootScope, $filter, $state, VehiclesHttp, resincTknRefresh, VehicleService, ngDialog, tpl, message) {

    $scope.vehicles = {
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
      noData: false,
      loading : false,
      selectAll : function() {
        $scope.vehicles.selectedAll = !$scope.vehicles.selectedAll;
        for (var key in $scope.vehicles.selectedItems) {
          $scope.vehicles.selectedItems[key].check = $scope.vehicles.selectedAll;
        }
      },
      add : function() {
        $state.go('app.vehicles.add', {next : $state.current, back : $state.current});
      },
      edit : function(item) {
        $state.go('app.vehicles.edit', { vehicle : item, next: $state.current, back : $state.current });
      },
      removeItem : function(item) {
        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {

          var _VehiclesHttp = new VehiclesHttp(item);
          _VehiclesHttp.$delete(function (data) {
            $scope.vehicles.getData();
          })

        });

      },
      remove : function() {
        var paramFilter = [{
          "key": "check",
          "value": true,
          "precision": true
        }];

        var removeElements = $filter('arrayFilter')($scope.vehicles.selectedItems, paramFilter);

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
          var _VehiclesHttp = new VehiclesHttp({ ids : ids });
          _VehiclesHttp.$deleteIds(function (data) {
            message.show("success", $filter('translate')('vehicles.message.deleteConfirm'));
            $scope.vehicles.getData();
          })

        });


      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.vehicles.filterText,
          "precision": false
        }];
        $scope.vehicles.selectedItems = $filter('arrayFilter')($scope.vehicles.dataSource, paramFilter);
        $scope.vehicles.paginations.totalItems = $scope.vehicles.selectedItems.length;
        $scope.vehicles.paginations.currentPage = 1;
        $scope.vehicles.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.vehicles.paginations.currentPage == 1 ) ? 0 : ($scope.vehicles.paginations.currentPage * $scope.vehicles.paginations.itemsPerPage) - $scope.vehicles.paginations.itemsPerPage;
        $scope.vehicles.data = $scope.vehicles.selectedItems.slice(firstItem , $scope.vehicles.paginations.currentPage * $scope.vehicles.paginations.itemsPerPage);
      },
      getData : function() {
        $scope.vehicles.data = [];
        $scope.vehicles.loading = true;
        $scope.vehicles.noData = false;
        VehiclesHttp.getList(function(response) {
          var data = response.reverse();
          $scope.vehicles.selectedItems = data;
          $scope.vehicles.dataSource = data;
          $scope.vehicles.paginations.totalItems = $scope.vehicles.selectedItems.length;
          $scope.vehicles.paginations.currentPage = 1;
          $scope.vehicles.changePage();
          $scope.vehicles.loading = false;
          ($scope.vehicles.dataSource.length < 1) ? $scope.vehicles.noData = true : null;
        })
      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        $scope.vehicles.getData();
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

  }
]);
