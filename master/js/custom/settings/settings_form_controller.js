/**=========================================================
 * Module: settings_form_controller.js
 * controllador del formulario de ajustes
 =========================================================*/
/**
 * TODO: falta agregar la plantilla para los vehiculos agregados
 *      agregar el comportamiento de agregar vehiculos
 *      agregar el comportamiento del submit
 **/

App.controller('SettingsFormController',[
  '$scope',
  '$rootScope',
  '$compile',
  '$state',
  '$stateParams',
  '$filter',
  'config',
  'VehicleTypesHttp',
  'SettingsHttp',
  'ngDialog',
  'tpl',
  'ROAD_RESTRICTION_TYPE',
  'TYPE_LENGTH_OF_STAY',
  'message',
  'resincTknRefresh',
  function ($scope, $rootScope, $compile, $state, $stateParams, $filter, config, VehicleTypesHttp, SettingsHttp, ngDialog, tpl, ROAD_RESTRICTION_TYPE,TYPE_LENGTH_OF_STAY, message, resincTknRefresh) {

    'use strict';

    $scope.RESTRICTION_TIME = ROAD_RESTRICTION_TYPE.TIME;
    $scope.RESTRICTION_RESOURCE_TIME = ROAD_RESTRICTION_TYPE.RESOURCE_TIME;
    $scope.RESTRICTION_FIXED_ROUTES = ROAD_RESTRICTION_TYPE.FIXED_ROUTES;

    $scope.TYPE_LENGTH_OF_STAY = {
      FIXED : TYPE_LENGTH_OF_STAY.FIXED,
      DEFINE_ITINERARY : TYPE_LENGTH_OF_STAY.DEFINE_ITINERARY
    };

    console.log($scope.TYPE_LENGTH_OF_STAY);

    $scope.travelsMode = ["Vehiculo", "Bicicleta", "Caminata"];



    Date.prototype.addHours= function(h) {
      this.setHours(this.getHours()+h);
      return this;
    }

    var initTime =  new Date();
    var finishTime =  new Date().addHours(6);


    $scope.$watch('setting.model.initTime', function(newValue, oldValue) {
      if ($scope.setting.model.roadRestrictionType !== ROAD_RESTRICTION_TYPE.FIXED_ROUTES) {
        if (angular.isDate(newValue)) {
          if (newValue.getHours() == $scope.setting.model.finishTime.getHours() && $scope.setting.model.finishTime.getMinutes() >= newValue.getMinutes()) {
            message.show("error", "Minímo una hora de diferencia");
            $scope.setting.model.initTime = oldValue;
          } else if (newValue.getHours() == $scope.setting.model.finishTime.getHours() - 1 && $scope.setting.model.finishTime.getMinutes() < newValue.getMinutes()) {
            message.show("error", "Minímo una hora de diferencia");
            $scope.setting.model.initTime = oldValue;
          }
        }
      }
    })

    $scope.$watch('setting.model.finishTime', function(newValue, oldValue) {
      if ($scope.setting.model.roadRestrictionType !== ROAD_RESTRICTION_TYPE.FIXED_ROUTES) {
        if (angular.isDate(newValue)) {
          if (newValue.getHours() == $scope.setting.model.initTime.getHours() &&  newValue.getMinutes() >= $scope.setting.model.initTime.getMinutes()) {
            message.show("error", "Minímo una hora de diferencia");
            $scope.setting.model.finishTime = oldValue;
          } else if (newValue.getHours() - 1 == $scope.setting.model.initTime.getHours() && newValue.getMinutes() < $scope.setting.model.initTime.getMinutes()) {
            message.show("error", "Minímo una hora de diferencia");
            $scope.setting.model.finishTime = oldValue;
          }
        }
      }
    })

    $scope.setting = {
      model : {
        description : '',
        travelMode : '',
        backToStartPoint : false,
        evaluateWeight: false,
        evaluateVolume: false,
        evaluateItineraryZone: false,
        evaluateRestrictionPackage : false,
        fixedRoutes : null,
        lengthOfStay : null,
        typeLengthOfStay : $scope.TYPE_LENGTH_OF_STAY.FIXED,
        roadRestrictionType : ROAD_RESTRICTION_TYPE.FIXED_ROUTES,
        settingResource : [],
        initTime: initTime,
        finishTime: finishTime
      },
      resources : {
        model : {
          id : '',
          typeVehicle : {},
          quantity : 1
        },
        data : [],
        error : false,
        errorMessage : '',
        add : function() {
          if (!$scope.setting.model.evaluateWeight && !$scope.setting.model.evaluateVolume) {
            this.error = true;
            this.errorMessage = 'Debe indicar un tipo de evaluación por peso y/o volumen';
          } else {
            var _item = {};
            _item.id = new Date().getTime();
            _item.typeVehicle =  $scope.setting.resources.model.typeVehicle;
            _item.quantity =  $scope.setting.resources.model.quantity;
            if (_item.quantity < 1) {
              this.error = true;
              this.errorMessage = 'Cantidad no puede ser menor que uno';
              return;
            }
            if (_item.typeVehicle.name == undefined) {
              this.error = true;
              this.errorMessage = 'Debe indicar un tipo de vehículo';
              return;
            }
            this.evaluateVehicleType(_item);
            var found = false;
            for (var i = 0 ; i < this.data.length ; i++) {
              if (this.data[i].typeVehicle.id == _item.typeVehicle.id) {
                this.data[i].quantity = this.data[i].quantity + _item.quantity;
                found = true;
              }
            }
            (found == false) ? this.data.push(_item) : null ;
            this.model.typeVehicle = {};
            this.model.quantity = 1;
            this.error = false;
          }
        },
        evaluateVehicleType : function(item) {
          item.status = true;
          var errorMessage = '';
          if (!$scope.setting.model.evaluateWeight && !$scope.setting.model.evaluateVolume) {
            item.status = false;
            return;
          }

          if ($scope.setting.model.evaluateWeight && item.typeVehicle.weight == 0) {
            item.status = false;
            errorMessage = errorMessage + ' ' + $filter('translate')('settings.form.label.EVALUATE_WEIGHT') + ',';
          }
          if ($scope.setting.model.evaluateVolume && item.typeVehicle.volume == 0) {
            item.status = false;
            errorMessage = errorMessage + ' ' + $filter('translate')('settings.form.label.EVALUATE_VOLUME') + ',';
          }
          if ($scope.setting.model.evaluateRestrictionPackage) {
            if ($scope.setting.model.evaluateVolume && item.typeVehicle.restriction.maxVolume == 0) {
              item.status = false;
              errorMessage = errorMessage + ' MAXVOLUME,';
            }
            if ($scope.setting.model.evaluateWeight && item.typeVehicle.restriction.maxWeight == 0) {
              item.status = false;
              errorMessage = errorMessage + ' MAXWEIGTH,';
            }
          }
          item.errorMessage = errorMessage.substring(0, errorMessage.length - 1);
          return item.status;
        },
        remove : function(item) {

          ngDialog.openConfirm({
            template: tpl.path,
            className: 'ngdialog-theme-default',
            scope: $scope
          }).then(function (value) {

            var _tmp = [];
            for (var i = 0; i < $scope.setting.resources.data.length;i++) {
              if ($scope.setting.resources.data[i].id !== item.id) {
                _tmp.push($scope.setting.resources.data[i]);
              }
            }
            $scope.setting.resources.data = _tmp;

          });

        }
      },
      save : function() {
        var parameters = {};
        if (validateSetting()) {
          parameters = $scope.setting.model;
          parameters.initTime = ($scope.setting.model.initTime == undefined) ? $filter('date')( currentDate, 'HH:mm') : $filter('date')($scope.setting.model.initTime, 'HH:mm');
          if ($scope.setting.model.roadRestrictionType == ROAD_RESTRICTION_TYPE.FIXED_ROUTES) {
            parameters.finishTime = '';
          } else {
            parameters.finishTime = ($scope.setting.model.finishTime == undefined) ? $filter('date')(currentDate, 'HH:mm'): $filter('date')($scope.setting.model.finishTime, 'HH:mm');
          }
          var _SettingsHttp = new SettingsHttp(parameters);

          if ($state.is('app.settings.add')) {
            _SettingsHttp.$save( function(response) {
              $scope.setting.cancel();
            });
          } else if ($state.is('app.settings.edit')) {
            _SettingsHttp.$update( function(response) {
              $scope.setting.cancel();
            });
          }
        }
      },
      cancel : function() {
        if ($stateParams.returnTo == undefined) {
          $state.go('app.settings.list');
        } else if ($stateParams.returnTo.state) {
          $state.go($stateParams.returnTo.state,{ data: $stateParams.returnTo.data } );
        } else {
          $state.go('app.settings.list');
        }
      }
    }



    var validateSetting = function() {
      $scope.travelMode_required = false;
      $scope.description_required = false;
      $scope.lengthOfStay_required = false;
      $scope.fixedRoutes_required = false;
      $scope.evaluateWeight_required = false;
      $scope.evaluateVolume_required = false;

      var valid = true;

      if ($scope.setting.model.travelMode == '') {
        $scope.travelMode_required = true;
        valid = false;
      }

      if ($scope.setting.model.description == '') {
        $scope.description_required = true;
        valid = false;
      }

      if ($scope.setting.model.typeLengthOfStay == TYPE_LENGTH_OF_STAY.FIXED && $scope.setting.model.lengthOfStay == null) {
        $scope.lengthOfStay_required = true;
        valid = false;
      }

      if  ($scope.setting.model.roadRestrictionType == ROAD_RESTRICTION_TYPE.FIXED_ROUTES) {
        if ($scope.setting.model.fixedRoutes == null) {
          $scope.fixedRoutes_required = true;
          valid = false;
        }
        $scope.setting.model.settingResource = [];
      }

      if ($scope.setting.model.roadRestrictionType == ROAD_RESTRICTION_TYPE.TIME) {
        $scope.setting.model.settingResource = [];
      }

      if ($scope.setting.model.roadRestrictionType == ROAD_RESTRICTION_TYPE.RESOURCE_TIME) {
        if (!$scope.setting.model.evaluateWeight && !$scope.setting.model.evaluateVolume) {
          $scope.evaluateWeight_required = true;
          $scope.evaluateVolume_required = true;
          valid = false;
        }
        if ($scope.setting.resources.data.length == 0) {
          valid = false;
          message.show("error", "debe tener minímo un recurso");
        }
        $scope.setting.model.settingResource = $scope.setting.resources.data;
      }

      return valid;
    }

    $scope.resources = [];

    $scope.vehicleTypes = {
      data : [],
      add : function() {
        $state.go('app.vehicleTypes.add', { returnTo : { state: $state.current.name, data: $scope.setting.model }});
      }
    }

    var resincTKn = new resincTknRefresh(
      function(){
        //success
        VehicleTypesHttp.getList( function(response) {
          $scope.vehicleTypes.data = response;
        })
      },
      function(){
        //fail
        $state.go('access.login');
      }
    );

    if ($stateParams.data) {
      var _settingModel = $stateParams.data;
      if (_settingModel.initTime && angular.isString($stateParams.data.initTime) ) {
        _settingModel.initTime = parseTime($stateParams.data.initTime);
//        _settingModel.initTime = parseTime($stateParams.data.initTime).getTime();
      }
      if (_settingModel.finishTime && angular.isString($stateParams.data.finishTime) ) {
        _settingModel.finishTime = parseTime($stateParams.data.finishTime);
//        _settingModel.finishTime = parseTime($stateParams.data.finishTime).getTime();
      }
      $scope.setting.model = _settingModel;
      $scope.setting.resources.data = $scope.setting.model.settingResource;
    }


    $scope.$watch('setting.model.evaluateWeight', function() {
      ($scope.setting.model.evaluateWeight) ? $scope.setting.resources.error = false : null;
      for (var i = 0; i < $scope.setting.resources.data.length; i++) {
        $scope.setting.resources.evaluateVehicleType($scope.setting.resources.data[i]);
      }
    })

    $scope.$watch('setting.model.evaluateVolume', function() {
      ($scope.setting.model.evaluateVolume) ? $scope.setting.resources.error = false : null;
      for (var i = 0; i < $scope.setting.resources.data.length; i++) {
        $scope.setting.resources.evaluateVehicleType($scope.setting.resources.data[i]);
      }
    })

    $scope.$watch('setting.model.evaluateRestrictionPackage', function() {
      for (var i = 0; i < $scope.setting.resources.data.length; i++) {
        $scope.setting.resources.evaluateVehicleType($scope.setting.resources.data[i]);
      }
    })



    function parseTime(date) {
      var HH_mm = date.split(":");
      var time = new Date();
      time.setHours(HH_mm[0]);
      time.setMinutes(HH_mm[1]);
      return time;
    }


  }
]);
