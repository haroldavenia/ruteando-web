/**=========================================================
 * Module: vehicle_type_controller.js
 * controllador para el modulo de tipos de vehiculos
 =========================================================*/
App.controller('catalogController',[
  '$scope',
  '$rootScope',
  '$filter',
  '$state',
  '$stateParams',
  'message',
  'CatalogsHttp',
  'resincTknRefresh',
  function ($scope, $rootScope, $filter, $state, $stateParams, message, CatalogsHttp, resincTknRefresh) {

    $scope.catalog = {
      model : {
        id: "",
        name : "",
        parent : "",
        ancestors : []
      },
      save : function() {
        var _CatalogsHttp = new CatalogsHttp($scope.catalog.model);
        if ($state.is('app.catalogs.add') && $scope.catalogForm.$valid ) {
          _CatalogsHttp.$save(function(response) {
            $state.go('app.catalogs.list');
          })
        }else if ($state.is('app.catalogs.edit') && $scope.catalogForm.$valid) {
          _CatalogsHttp.$update(function(response) {
            $state.go('app.catalogs.list');
          });
        } else {
          message.show("warning", "formulario invalido");
        }
      },
      cancel : function() {
        if ($stateParams.returnTo == undefined) {
          $state.go('app.catalogs.list');
        } else if ($stateParams.returnTo.state) {
          $state.go($stateParams.returnTo.state, $stateParams.returnTo.data );
        } else {
          $state.go('app.catalogs.list');
        }
      }
    }

    $scope.ancestors = {
      current : '',
      add : function() {
        $scope.catalog.model.ancestors.push($scope.ancestors.current);
      }
    }

    $scope.catalogs = {
      data : [],
      getData : function() {
        CatalogsHttp.getList( function(result) {
          for (var i = 0; i < result.length; i ++) {
            $scope.catalogs.data.push(result[i].name);
          }
          $scope.catalog.model = $stateParams.catalog || $scope.catalog.model;
        });
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
