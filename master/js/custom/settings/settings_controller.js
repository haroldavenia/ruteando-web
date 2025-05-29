/**=========================================================
 * Module: settings_controller.js
 * controllador para el modulo de ajustes
 =========================================================*/
App.controller('SettingsController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  'SettingsHttp',
  'resincTknRefresh',
  'ngDialog',
  'tpl',
  'message',
  function ($scope, $rootScope, $filter, $state, SettingsHttp, resincTknRefresh, ngDialog, tpl, message) {

    $scope.Settings = {
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
      loading: false,
      noData : false,
      selectAll : function() {
        $scope.Settings.selectedAll = !$scope.Settings.selectedAll;
        for (var key in $scope.Settings.selectedItems) {
          $scope.Settings.selectedItems[key].check = $scope.Settings.selectedAll;
        }
      },
      add : function() {
        $state.go('app.settings.add');
      },
      edit : function(item) {
        $state.go('app.settings.edit', { data : item } );
      },
      removeItem : function(item) {

        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {

          var _SettingsHttp = new SettingsHttp(item);
          _SettingsHttp.$delete(function (data) {
            $scope.Settings.getData();
          })

        });

      },
      remove : function() {
        var paramFilter = [{
          "key": "check",
          "value": true,
          "precision": true
        }];

        var removeElements = $filter('arrayFilter')($scope.Settings.selectedItems, paramFilter);
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
          var _SettingsHttp = new SettingsHttp({ ids : ids });
          _SettingsHttp.$deleteIds(function (data) {
            message.show("success", $filter('translate')('settings.message.deleteConfirm'));
            $scope.Settings.getData();
          })

        });

      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.Settings.filterText,
          "precision": false
        }];
        $scope.Settings.selectedItems = $filter('arrayFilter')($scope.Settings.dataSource, paramFilter);
        $scope.Settings.paginations.totalItems = $scope.Settings.selectedItems.length;
        $scope.Settings.paginations.currentPage = 1;
        $scope.Settings.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.Settings.paginations.currentPage == 1 ) ? 0 : ($scope.Settings.paginations.currentPage * $scope.Settings.paginations.itemsPerPage) - $scope.Settings.paginations.itemsPerPage;
        $scope.Settings.data = $scope.Settings.selectedItems.slice(firstItem , $scope.Settings.paginations.currentPage * $scope.Settings.paginations.itemsPerPage);
      },
      getData : function() {
        $scope.Settings.loading = true;
        $scope.Settings.noData = false;
        $scope.Settings.data = [];
        SettingsHttp.getList( function(response) {
          var data =response.reverse();
          $scope.Settings.selectedItems = data;
          $scope.Settings.dataSource = data;
          $scope.Settings.paginations.totalItems = $scope.Settings.selectedItems.length;
          $scope.Settings.paginations.currentPage = 1;
          $scope.Settings.changePage();
          $scope.Settings.loading = false;
          ($scope.Settings.dataSource.length < 1) ? $scope.Settings.noData = true : null;
        });
      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        $scope.Settings.getData();
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

  }
]);
