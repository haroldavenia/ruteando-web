/**=========================================================
 * Module: vehicle_type_controller.js
 * controllador para el modulo de tipos de vehiculos
 =========================================================*/
App.controller('VehicleTypesController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  'VehicleTypesHttp',
  'resincTknRefresh',
  'ngDialog',
  'tpl',
  'PdfExporter',
  'message',
  function ($scope, $rootScope, $filter, $state, VehicleTypesHttp, resincTknRefresh, ngDialog, tpl, PdfExporter, message) {

    $scope.vehicleTypes = {
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
        $scope.vehicleTypes.selectedAll = !$scope.vehicleTypes.selectedAll;
        for (var key in $scope.vehicleTypes.selectedItems) {
          $scope.vehicleTypes.selectedItems[key].check = $scope.vehicleTypes.selectedAll;
        }
      },
      add : function() {
        $state.go('app.vehicleTypes.add');
      },
      edit : function(item) {
        $state.go('app.vehicleTypes.edit', { vehicleType : item });
      },
      removeItem : function(item) {
        ngDialog.openConfirm({
          template: tpl.path,
          className: 'ngdialog-theme-default',
          scope: $scope
        }).then(function (value) {

          var _VehicleTypesHttp = new VehicleTypesHttp(item);
          _VehicleTypesHttp.$delete(function (data) {
            $scope.vehicleTypes.getData();
          })

        });

      },
      remove : function() {
        var paramFilter = [{
          "key": "check",
          "value": true,
          "precision": true
        }];

        var removeElements = $filter('arrayFilter')($scope.vehicleTypes.selectedItems, paramFilter);

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
          var _VehicleTypesHttp = new VehicleTypesHttp({ ids : ids });
          _VehicleTypesHttp.$deleteIds(function (data) {
            message.show("success", $filter('translate')('vehicleTypes.message.deleteConfirm'));
            $scope.vehicleTypes.getData();
          })

        });


      },
      filter : function() {
        var paramFilter = [{
          "key": "$",
          "value": $scope.vehicleTypes.filterText,
          "precision": false
        }];
        $scope.vehicleTypes.selectedItems = $filter('arrayFilter')($scope.vehicleTypes.dataSource, paramFilter);
        $scope.vehicleTypes.paginations.totalItems = $scope.vehicleTypes.selectedItems.length;
        $scope.vehicleTypes.paginations.currentPage = 1;
        $scope.vehicleTypes.changePage();
      },
      changePage : function() {
        var firstItem = ($scope.vehicleTypes.paginations.currentPage == 1 ) ? 0 : ($scope.vehicleTypes.paginations.currentPage * $scope.vehicleTypes.paginations.itemsPerPage) - $scope.vehicleTypes.paginations.itemsPerPage;
        $scope.vehicleTypes.data = $scope.vehicleTypes.selectedItems.slice(firstItem , $scope.vehicleTypes.paginations.currentPage * $scope.vehicleTypes.paginations.itemsPerPage);
      },
      getData : function() {
        $scope.vehicleTypes.data = [];
        $scope.vehicleTypes.loading = true;
        $scope.vehicleTypes.noData = false;
        VehicleTypesHttp.getList( function(response) {
          var data = response.reverse();
          $scope.vehicleTypes.selectedItems = data;
          $scope.vehicleTypes.dataSource = data;
          $scope.vehicleTypes.paginations.totalItems = $scope.vehicleTypes.selectedItems.length;
          $scope.vehicleTypes.paginations.currentPage = 1;
          $scope.vehicleTypes.changePage();
          $scope.vehicleTypes.loading = false;
          ($scope.vehicleTypes.dataSource.length < 1) ? $scope.vehicleTypes.noData = true : null;
        });
      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        $scope.vehicleTypes.getData();
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

    $scope.exportPDf = function () {
      var pdf = new PdfExporter();
      pdf.getReportVehicleTypeList($scope.vehicleTypes.dataSource);
    };


  }
]);
