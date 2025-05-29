/**=========================================================
 * Module: places_controller.js
 * controllador para el modulo lugares
 =========================================================*/
App.controller('PlacesController', [
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  'PlacesHttp',
  'resincTknRefresh',
  'ngDialog',
  'tpl',
  'message',
  function ($scope, $rootScope, $filter, $state, PlacesHttp, resincTknRefresh, ngDialog, tpl, message) {

    $scope.places = {
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
        $scope.places.selectedAll = !$scope.places.selectedAll;
        for (var key in $scope.places.selectedItems) {
          $scope.places.selectedItems[key].check = $scope.places.selectedAll;
        }
      },
      add : function() {
        $state.go('app.places.add');
      },
      edit : function(item) {
        $state.go('app.places.edit', { data : { place : item } } );
      },
      removeItem : function(item) {

        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {

          var _PlacesHttp = new PlacesHttp(item);
          _PlacesHttp.$delete(function (data) {
            $scope.places.getData();
          })

        });

      },
      remove : function() {
        var paramFilter = [{
          "key": "check",
          "value": true,
          "precision": false
        }];
        var removeElements = $filter('arrayFilter')($scope.places.selectedItems, paramFilter);

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
          var _PlacesHttp = new PlacesHttp({ ids : ids });
          _PlacesHttp.$deleteIds(function (data) {
            message.show("success", $filter('translate')('places.message.deleteConfirm'));
            $scope.places.getData();
          })
        });
      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.places.filterText,
          "precision": false
        }];
        $scope.places.selectedItems = $filter('arrayFilter')($scope.places.dataSource, paramFilter);
        $scope.places.paginations.totalItems = $scope.places.selectedItems.length;
        $scope.places.paginations.currentPage = 1;
        $scope.places.changePage();
        //            $scope.$apply();
      },
      changePage : function() {
        var firstItem = ($scope.places.paginations.currentPage == 1 ) ? 0 : ($scope.places.paginations.currentPage * $scope.places.paginations.itemsPerPage) - $scope.places.paginations.itemsPerPage;
        $scope.places.data = $scope.places.selectedItems.slice(firstItem , $scope.places.paginations.currentPage * $scope.places.paginations.itemsPerPage);
      },
      getData : function() {
        $scope.places.data = [];
        $scope.places.loading = true;
        $scope.places.noData = false;
        PlacesHttp.getList( function(response) {
          var data = response.reverse();
          $scope.places.dataSource = data;
          $scope.places.selectedItems = data;
          $scope.places.paginations.totalItems = $scope.places.selectedItems.length;
          $scope.places.paginations.currentPage = 1;
          $scope.places.changePage();
          $scope.places.loading = false;
          ($scope.places.dataSource.length < 1) ? $scope.places.noData = true : null;
        })
      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        $scope.places.getData();
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );


  }
]);
