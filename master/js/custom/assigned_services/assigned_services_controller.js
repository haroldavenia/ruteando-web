/**=========================================================
 * Module: assigned_services_controller.js
 * controllador para el modulo Servicios Asignados
 =========================================================*/
App.controller('AssignedServicesController',[
    '$scope',
    '$rootScope',
    '$filter',
    '$state',
    'AssignedServicesHttp',
    'message',
    function ($scope, $rootScope, $filter, $state, AssignedServicesHttp, message) {

      $scope.VISIT_CANCELED = 0;
      $scope.VISIT_FINISHED = 1;
      $scope.VISIT_ASSIGNED = 2;
      $scope.VISIT_IN_ROUTE = 3;


      $scope.assignedServices = {
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
        selectAll : function() {
          $scope.assignedServices.selectedAll = !$scope.assignedServices.selectedAll; 
          for (var key in $scope.assignedServices.selectedItems) {
            $scope.assignedServices.selectedItems[key].check = $scope.assignedServices.selectedAll;
          }
        },
        add : function() {
          $state.go('app.assignedServices.add');
        },
        edit: function() {
        },
        listView : function(item) {
          $state.go('app.visits.list');
        },
        goToMap : function(item) {
          $state.go('app.maps.assigned',{ address : item, returnTo : {state : $state.current , data: {}}});
        },
        removeItem : function(item) {
          message.show("error", "form remove item");
          console.log(item);
        },
        remove : function() {
            var paramFilter = [{
              "key": "check",
              "value": true,
              "precision": true
            }];

            var removeElements = $filter('arrayFilter')($scope.assignedServices.selectedItems, paramFilter);
            alert("remove " + removeElements.length + " Items" );
            console.log(removeElements);
        },
        filter : function() {
            var paramFilter = [{
              "key": "$",
              "value": $scope.assignedServices.filterText,
              "precision": false
            }];
            $scope.assignedServices.selectedItems = $filter('arrayFilter')($scope.assignedServices.dataSource, paramFilter);
            $scope.assignedServices.paginations.totalItems = $scope.assignedServices.selectedItems.length;
            $scope.assignedServices.paginations.currentPage = 1;
            $scope.assignedServices.changePage();
        },
        changePage : function() {
          var firstItem = ($scope.assignedServices.paginations.currentPage == 1 ) ? 0 : ($scope.assignedServices.paginations.currentPage * $scope.assignedServices.paginations.itemsPerPage) - $scope.assignedServices.paginations.itemsPerPage;
          $scope.assignedServices.data = $scope.assignedServices.selectedItems.slice(firstItem , $scope.assignedServices.paginations.currentPage * $scope.assignedServices.paginations.itemsPerPage);
        }
      }

    	AssignedServicesHttp.getAssignedServices().then(function(result) {
    		
		      $scope.assignedServices.selectedItems = result.assignedServices;
		      $scope.assignedServices.dataSource = result.assignedServices;
		      $scope.assignedServices.paginations.totalItems = $scope.assignedServices.selectedItems.length;
		      $scope.assignedServices.paginations.currentPage = 1;
		      $scope.assignedServices.changePage();
    	})



    }
]);