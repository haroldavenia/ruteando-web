/**=========================================================
 * Module: vehicle_type_controller.js
 * controllador para el modulo de tipos de vehiculos
 =========================================================*/
App.controller('catalogsController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  'CatalogsHttp',
  'resincTknRefresh',
  'ngDialog',
  'tpl',
  function ($scope, $rootScope, $filter, $state, CatalogsHttp, resincTknRefresh, ngDialog, tpl ) {

    $scope.catalogs = {
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
      loading: false,
      selectAll : function() {
        $scope.catalogs.selectedAll = !$scope.catalogs.selectedAll;
        for (var key in $scope.catalogs.selectedItems) {
          $scope.catalogs.selectedItems[key].check = $scope.catalogs.selectedAll;
        }
      },
      add : function() {
        $state.go('app.catalogs.add');
      },
      edit : function(item) {
        $state.go('app.catalogs.edit', { catalog: item });
      },
      removeItem : function(item) {
        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {

          var _CatalogsHttp = new CatalogsHttp(item);
          _CatalogsHttp.$delete(function (data) {
            $scope.catalogs.getData();
          })

        });

      },
      remove : function() {
        var paramFilter = [{
          "key": "check",
          "value": true,
          "precision": true
        }];

        var removeElements = $filter('arrayFilter')($scope.catalogs.selectedItems, paramFilter);
        alert("remove " + removeElements.length + " Items" );
        console.log(removeElements);
      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.catalogs.filterText,
          "precision": false
        }];
        $scope.catalogs.selectedItems = $filter('arrayFilter')($scope.catalogs.dataSource, paramFilter);
        $scope.catalogs.paginations.totalItems = $scope.catalogs.selectedItems.length;
        $scope.catalogs.paginations.currentPage = 1;
        $scope.catalogs.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.catalogs.paginations.currentPage == 1 ) ? 0 : ($scope.catalogs.paginations.currentPage * $scope.catalogs.paginations.itemsPerPage) - $scope.catalogs.paginations.itemsPerPage;
        $scope.catalogs.data = $scope.catalogs.selectedItems.slice(firstItem , $scope.catalogs.paginations.currentPage * $scope.catalogs.paginations.itemsPerPage);
      },
      getData : function() {
        $scope.catalogs.loading = true;
        $scope.catalogs.noData = false;
        CatalogsHttp.getList(function(result) {
          $scope.catalogs.selectedItems = result;
          $scope.catalogs.dataSource = result;
          $scope.catalogs.paginations.totalItems = $scope.catalogs.selectedItems.length;
          $scope.catalogs.paginations.currentPage = 1;
          $scope.catalogs.changePage();
          $scope.catalogs.loading = false;
          ($scope.catalogs.dataSource.length < 1) ? $scope.catalogs.noData = true : null;
        })
      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        $scope.catalogs.getData();
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

  }
]);
