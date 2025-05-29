/**=========================================================
 * Module: vehicle_type_controller.js
 * controllador para el modulo de tipos de vehiculos
 =========================================================*/
App.controller('driversController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  'DriversHttp',
  'resincTknRefresh',
  'ngDialog',
  'tpl',
  'message',
  function ($scope, $rootScope, $filter, $state, DriversHttp, resincTknRefresh, ngDialog, tpl, message ) {



    $scope.openConfirm = function () {

    };

    $scope.drivers = {
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
      noData : false,
      loading : false,
      selectAll : function() {
        $scope.drivers.selectedAll = !$scope.drivers.selectedAll;
        for (var key in $scope.drivers.selectedItems) {
          $scope.drivers.selectedItems[key].check = $scope.drivers.selectedAll;
        }
      },
      add : function() {
        $state.go('app.drivers.add');
      },
      edit : function(item) {
        $state.go('app.drivers.edit', { driver: item });
      },
      removeItem : function(item) {
        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {
          var _DriversHttp = new DriversHttp(item);
          _DriversHttp.$delete(function (data) {
            $scope.drivers.getData();
          })
        });
      },
      remove : function() {
        var paramFilter = [{
          "key": "check",
          "value": true,
          "precision": true
        }];

        var removeElements = $filter('arrayFilter')($scope.drivers.selectedItems, paramFilter);

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
          var _DriversHttp = new DriversHttp({ ids : ids });
          _DriversHttp.$deleteIds(function (data) {
            message.show("success", $filter('translate')('drivers.message.deleteConfirm'));
            $scope.drivers.getData();
          })

        });

      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.drivers.filterText,
          "precision": false
        }];
        $scope.drivers.selectedItems = $filter('arrayFilter')($scope.drivers.dataSource, paramFilter);
        $scope.drivers.paginations.totalItems = $scope.drivers.selectedItems.length;
        $scope.drivers.paginations.currentPage = 1;
        $scope.drivers.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.drivers.paginations.currentPage == 1 ) ? 0 : ($scope.drivers.paginations.currentPage * $scope.drivers.paginations.itemsPerPage) - $scope.drivers.paginations.itemsPerPage;
        $scope.drivers.data = $scope.drivers.selectedItems.slice(firstItem , $scope.drivers.paginations.currentPage * $scope.drivers.paginations.itemsPerPage);
      },
      getData : function() {
        $scope.drivers.data = [];
        $scope.drivers.loading = true;
        $scope.drivers.noData = false;
        DriversHttp.getList(function(response) {
          var data = response.reverse();
          $scope.drivers.selectedItems = data;
          $scope.drivers.dataSource = data;
          $scope.drivers.paginations.totalItems = $scope.drivers.selectedItems.length;
          $scope.drivers.paginations.currentPage = 1;
          $scope.drivers.changePage();
          $scope.drivers.loading = false;
          ($scope.drivers.dataSource.length < 1) ? $scope.drivers.noData = true : null;
        })

      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        $scope.drivers.getData();
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

  }
]);
