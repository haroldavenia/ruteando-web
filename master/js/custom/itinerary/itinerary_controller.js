/**=========================================================
 * Module: Journey_controller.js
 * controllador para el modulo de trajectos
 =========================================================*/
App.controller('ItineraryController', [
    '$scope',
    '$rootScope',
    '$filter',
    '$state',
    '$stateParams',
    'PlacesHttp',
    'message',
    'Itinerary',
    'SettingsHttp',
    'ngDialog',
    'tpl',
    'ROAD_RESTRICTION_TYPE',
    'TYPE_LENGTH_OF_STAY',
    'osrmHttp',
    'resincTknRefresh',
    'tempStorageData',
    function ($scope, $rootScope, $filter, $state, $stateParams, PlacesHttp, message, Itinerary, SettingsHttp, ngDialog, tpl, ROAD_RESTRICTION_TYPE, TYPE_LENGTH_OF_STAY, osrmHttp, resincTknRefresh, tempStorageData) {

        // Disable weekend selection
        $scope.open = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.status.opened = true;
        };

        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };

        $scope.format = 'yyyy/MM/dd';

        $scope.status = {
            opened: false
        };


        $scope.Itinerary = {
            paginations: {
                maxSize: 3,
                itemsPerPage: 10,
                currentPage: 1,
                totalItems: 0
            },
            loading: false,
            selectedAll: false,
            filterText: '',
            dataSource: [],
            selectedItems: [],
            data: [],
            count : { corrects: 0, incorrects: 0, all: 0},
            selectAll: function () {
                $scope.Itinerary.selectedAll = !$scope.Itinerary.selectedAll;
                for (var key in $scope.Itinerary.selectedItems) {
                    $scope.Itinerary.selectedItems[key].check = $scope.Itinerary.selectedAll;
                }
            },
            routing: function () {
            },
            optimize: function () {
                // console.log("Realizando el proceso de optimizacion");
                // console.log("imprimiendo el journey qye sera enviado al servidor");

                $scope.place_required = false;
                $scope.setting_required = false;
                if ($scope.Journey.place.id == undefined && $scope.Journey.setting.id == undefined) {
                    $scope.place_required = true;
                    $scope.setting_required = true;
                } else if ($scope.Journey.place.id == undefined) {
                    $scope.place_required = true;
                } else if ($scope.Journey.setting.id == undefined) {
                    $scope.setting_required = true;
                } else if ($scope.Itinerary.dataSource.length < 1) {
                    message.show("warning", "no se han ingresado registros para optimizar");
                } else {

                    var paramFilter = [{
                        "key": "status",
                        "value": true,
                        "precision": true
                    }];
                    var correctas = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilter);
                    var incorrectas = $scope.Itinerary.dataSource.length - correctas.length;
                    if(incorrectas > 0){
                        ngDialog.openConfirm({
                            template: tpl.optimice,
                            className: 'ngdialog-theme-default',
                            scope: $scope
                        }).then(function (value) {
                            $scope.Journey.itinerary = correctas;
                            console.log("Journey = "+$scope.Journey.itinerary.length);
                            console.log("Datasource = "+$scope.Itinerary.dataSource.length);
                            requestServiceHttp();
                        });
                    }else{
                        $scope.Journey.itinerary = $scope.Itinerary.dataSource;
                        console.log("Journey = "+$scope.Journey.itinerary.length);
                        console.log("Datasource = "+$scope.Itinerary.dataSource.length);
                        requestServiceHttp();
                    }
                }
            },
            cancel: function () {
                $scope.Journey.itinerary = $scope.Itinerary.dataSource;
                $state.go('app.journeys.add', {data: $scope.Journey});
            },
            removePackage: function (package) {
                ngDialog.openConfirm({
                    template: tpl.path,
                    className: 'ngdialog-theme-default',
                    scope: $scope
                }).then(function (value) {

                    for (var i = 0; i < $scope.Itinerary.dataSource.length; i++) {
                        if ($scope.Itinerary.dataSource[i].id == package.id) {
                            $scope.Itinerary.dataSource.splice(i, 1);
                            break;
                        }
                    }
                    $scope.Itinerary.filter();
                });
            },
            removeSelectedPakages: function () {
                var _tmpdata = [];
                for (var i = 0; i < $scope.Itinerary.dataSource.length; i++) {
                    (!$scope.Itinerary.dataSource[i].check) ? _tmpdata.push($scope.Itinerary.dataSource[i]) : null;
                }
                $scope.Itinerary.dataSource = _tmpdata;
                $scope.Itinerary.filter();
            },
            goToMap: function (package) {

                $scope.Journey.itinerary = $scope.Itinerary.dataSource;
                $state.go('app.maps.address', {
                    map_mode_use:'address',
                    address: {
                        x: package.longitude,
                        y: package.latitude
                    }, returnTo: {
                        state: $state.current.name,
                        data: {
                            journey: $scope.Journey
                        }
                    }
                });

            },
            goToAdd: function () {

                $scope.Journey.itinerary = $scope.Itinerary.dataSource;
                $state.go('app.itinerary.add', {
                    returnTo: {
                        state: $state.current.name,
                        data: {
                            journey: $scope.Journey
                        }
                    }
                });
            },
            goToEdit: function (item) {
                $scope.Journey.itinerary = $scope.Itinerary.dataSource;
                $state.go('app.itinerary.edit', {data: {package: item, journey: $scope.Journey}});
            },
            filter: function () {

                if ($scope.statusFilter.current.status == "ALL") {
                    $scope.Itinerary.selectedItems = $scope.Itinerary.dataSource;
                    $scope.Itinerary.paginations.totalItems = $scope.Itinerary.selectedItems.length;
                    $scope.Itinerary.paginations.currentPage = 1;
                    $scope.Itinerary.changePage();
                } else if ($scope.statusFilter.current.status == "MATCH") {
                    var paramFilter = [{
                        "key": "statusGeocoding",
                        "value": "MATCH",
                        "precision": true
                    }];
                    $scope.Itinerary.selectedItems = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilter);
                    $scope.Itinerary.paginations.totalItems = $scope.Itinerary.selectedItems.length;
                    $scope.Itinerary.paginations.currentPage = 1;
                    $scope.Itinerary.changePage();
                } else if ($scope.statusFilter.current.status == "MEAN") {
                    var paramFilter = [{
                        "key": "statusGeocoding",
                        "value": "MEAN",
                        "precision": true
                    }];
                    $scope.Itinerary.selectedItems = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilter);
                    $scope.Itinerary.paginations.totalItems = $scope.Itinerary.selectedItems.length;
                    $scope.Itinerary.paginations.currentPage = 1;
                    $scope.Itinerary.changePage();
                } else if ($scope.statusFilter.current.status == "MANUAL") {
                    var paramFilter = [{
                        "key": "statusGeocoding",
                        "value": "MANUAL",
                        "precision": true
                    }];
                    $scope.Itinerary.selectedItems = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilter);
                    $scope.Itinerary.paginations.totalItems = $scope.Itinerary.selectedItems.length;
                    $scope.Itinerary.paginations.currentPage = 1;
                    $scope.Itinerary.changePage();
                } else if ($scope.statusFilter.current.status == "UNMATCH") {
                    var paramFilter = [{
                        "key": "statusGeocoding",
                        "value": "UNMATCH",
                        "precision": true
                    }];
                    $scope.Itinerary.selectedItems = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilter);
                    $scope.Itinerary.paginations.totalItems = $scope.Itinerary.selectedItems.length;
                    $scope.Itinerary.paginations.currentPage = 1;
                    $scope.Itinerary.changePage();
                }

                total();
            },
            changePage: function () {
                var firstItem = ($scope.Itinerary.paginations.currentPage == 1 ) ? 0 : ($scope.Itinerary.paginations.currentPage * $scope.Itinerary.paginations.itemsPerPage) - $scope.Itinerary.paginations.itemsPerPage;
                $scope.Itinerary.data = $scope.Itinerary.selectedItems.slice(firstItem, $scope.Itinerary.paginations.currentPage * $scope.Itinerary.paginations.itemsPerPage);
            },
            imprimirCsv: function ()
            {
                var data = $scope.Itinerary.dataSource;
                var csvContent = "data:text/csv;charset=utf-8,";
                dataHeadString = 'ID_GUIA;LONGITUD;LATITUD;CIUDAD;PAIS;DIRECCION;DIRECCION ESTANDARIZADA;PRECISION;ESTADO DE GEOCODIFICACION;ESTADIA;VOLUMEN;PESO;ZONA;NUM_PIEZAS;CODIGO_POSTAL;REMITENTE;TEL_REMITENTE;DESTINATARIO;TEL_DESTINATARIO;OBSERVACIONES;'
                csvContent += dataHeadString+ "\n";
                data.forEach(function(infoArray, index){
                   var guide = '';
                   var geoStat = '';
                   if (guide!='null')
                   {
                     guide = infoArray.guideNumber;
                   }
                   if(infoArray.statusGeocoding == 'MATCH')
                   {
                     geoStat = 'UBICADA';
                   }
                   if(infoArray.statusGeocoding == 'MEAN')
                   {
                     geoStat = 'APROXIMADA';
                   }
                   if(infoArray.statusGeocoding == 'MANUAL')
                   {
                     geoStat = 'MANUAL';
                   }
                   if(infoArray.statusGeocoding == 'UNMATCH')
                   {
                     geoStat = 'NO UBICADA';
                   }
                   dataString = guide+';'+
                   infoArray.longitude+';'+
                   infoArray.latitude+';'+
                   infoArray.city+';'+
                   infoArray.country+';'+
                   infoArray.address+';'+
                   infoArray.standarizedAddress+';'+
                   infoArray.score+';'+
                   geoStat+';'+
                   infoArray.timeState+';'+
                   infoArray.volume+';'+
                   infoArray.weigth+';'+
                   infoArray.zone+';'+
                   infoArray.pieceNumber+';'+
                   infoArray.postalCode+';'+
                   infoArray.sender.name+';'+
                   infoArray.sender.phone+';'+
                   infoArray.receiver.name+';'+
                   infoArray.receiver.phone+';'+
                   infoArray.observation+';';

                   var dataString_new = dataString.replace(new RegExp(';null;', 'g'), ';;');
                   csvContent += index < data.length ? dataString_new+ "\n" : dataString_new;
                });

                var encodedUri = encodeURI(csvContent);
                var link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "my_data.csv");

                link.click();
            }
        }

        $scope.settings = {
            add: function () {
                $scope.Journey.itinerary = $scope.Itinerary.dataSource;
                $state.go('app.settings.add', {
                    returnTo: {
                        state: $state.current.name,
                        data: {
                            journey: $scope.Journey
                        }
                    }
                });
            },
            data: []
        };

        var resincTKn = new resincTknRefresh(
          function(){
            //success
            SettingsHttp.getList(function (response) {
              $scope.settings.data = response;
            });

            PlacesHttp.getList(function (response) {
              $scope.places.data = response;
            });
          },
          function(){
            //fail
            $state.go('access.login');
          }
        );

        $scope.places = {
            add: function () {
                $scope.Journey.itinerary = $scope.Itinerary.dataSource;
                $state.go('app.places.add', {
                    returnTo: {
                        state: $state.current.name,
                        data: {
                            journey: $scope.Journey
                        }
                    }
                });
            },
            data: []
        };

        $scope.statusFilter = {
            current: {},
            data: [
                {status: "ALL", name: "TODAS"},
                {status: "MATCH", name: "UBICADAS"},
                {status: "MEAN", name: "APROXIMADAS"},
                {status: "MANUAL", name: "MANUALES"},
                {status: "UNMATCH", name: "NO UBICADAS"}]
        };
        $scope.statusFilter.current = $scope.statusFilter.data[0];

        $scope.$watch('Journey.setting', function () {
          if($scope.Itinerary !== undefined){
            for (var i = 0; i < $scope.Itinerary.dataSource.length; i++) {
              evaluateStatus($scope.Itinerary.dataSource[i]);
            }
          }else {
            if(tempStorageData.data.cachedJourney !== undefined){
              if(tempStorageData.data.cachedJourney.itinerary.length > 0){
                $scope.Itinerary.dataSource = tempStorageData.data.cachedJourney.itinerary;
                for (var i = 0; i < $scope.Itinerary.dataSource.length; i++) {
                  evaluateStatus($scope.Itinerary.dataSource[i]);
                }
              }
            }
          }
        })

        //Ver si hay subidas para setear journey
        if($stateParams.data !== undefined)
        {
          if($stateParams.data !== null){
            if($stateParams.data.journey !== undefined){
              $scope.Journey = $stateParams.data.journey;
            }
          }
        }

        if($scope.Journey !== undefined && $scope.Journey.itinerary !== undefined ){
          $scope.Itinerary.dataSource = $scope.Journey.itinerary;
          ($scope.Journey.date == undefined) ? $scope.Journey.date = new Date() : null;
        }else if(tempStorageData.data.cachedJourney !== undefined ){
          //Setear journey con el cachado si hay
          $scope.Journey = tempStorageData.data.cachedJourney;
          if(tempStorageData.data.cachedJourney.itinerary.length > 0){
            $scope.Itinerary.dataSource = tempStorageData.data.cachedJourney.itinerary;
            ($scope.Journey.date == undefined) ? $scope.Journey.date = new Date() : null;
          }else {
            $state.go('app.journeys.add');
          }
        }else {
          $state.go('app.journeys.add');
        }

        $scope.Itinerary.filter();

        function evaluateStatus(package) {
            package.status = true;
            var errorMessage = '';
            if (!package.latitude || !package.longitude) {
                errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.ADDRESS') + ',';
                package.status = false;
            }

            if ($scope.Journey.setting.evaluateWeight && package.weigth == null) {
                errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.WEIGHT') + ',';
                package.status = false;
            }

            if ($scope.Journey.setting.evaluateVolume && package.volume == null) {
                errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.VOLUME') + ',';
                package.status = false;
            }

            if ($scope.Journey.setting.typeLengthOfStay == TYPE_LENGTH_OF_STAY.DEFINE_ITINERARY && package.timeState == null) {
                errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.TIME_OF_STAY') + ',';
                package.status = false;
            }

            if ($scope.Journey.setting.evaluateItineraryZone && package.zone == null) {
                errorMessage = errorMessage + ' ' + $filter('translate')('package.form.label.ZONE') + ',';
                package.status = false;
            }
            package.errorMessage = errorMessage.substring(0, errorMessage.length - 1);
        }


        function getZones(Journey) {
            var zones = {};
            for (var i = 0; i < Journey.itinerary.length; i++) {
                if (Journey.itinerary[i].zone == undefined || Journey.itinerary[i].zone == null) {
                    (zones[Journey.name + '_DEFAULT_ZONE'] == undefined) ? zones[Journey.itinerary[i].zone] = [] : null;
                    zones[Journey.name + '_DEFAULT_ZONE'].push(Journey.itinerary[i]);
                } else {
                    (zones[Journey.name + '_' + Journey.itinerary[i].zone] == undefined) ? zones[Journey.name + '_' + Journey.itinerary[i].zone] = [] : null;
                    zones[Journey.name + '_' + Journey.itinerary[i].zone].push(Journey.itinerary[i]);
                }
            }
            return zones;
        }

        function requestServiceHttp() {
            console.log("route restriction type");
            console.log($scope.Journey.setting.roadRestrictionType);

            $rootScope.loadingVisible = true;
            if ($scope.Journey.setting.roadRestrictionType == ROAD_RESTRICTION_TYPE.TIME) {
                osrmHttp.optimisationForPackages($scope.Journey).then(osrmHttp_success, osrmHttp_faild);
            } else if ($scope.Journey.setting.roadRestrictionType == ROAD_RESTRICTION_TYPE.RESOURCE_TIME) {
                if ($scope.Journey.setting.evaluateItineraryZone) {
                    var zones = getZones($scope.Journey);

                    for (var zone in zones) {
                        var _Journey = $scope.Journey;
                        _Journey.name = zone;
                        _Journey.itinerary = zones[zone];
                        osrmHttp.optimisationForPackages(_Journey);
                    }

                } else {
                    osrmHttp.optimisationForPackages($scope.Journey).then(osrmHttp_success, osrmHttp_faild);
                }
            } else if ($scope.Journey.setting.roadRestrictionType == ROAD_RESTRICTION_TYPE.FIXED_ROUTES) {
                if ($scope.Journey.setting.fixedRoutes == 1) {
                    osrmHttp.OptimalRouteOfPointCloud($scope.Journey).then(osrmHttp_success, osrmHttp_faild);
                } else {
                    osrmHttp.optimisationForMessenger($scope.Journey).then(osrmHttp_success, osrmHttp_faild);
                }
            }
            //            console.log($scope.Journey);
        }

        function osrmHttp_success(response) {
            $rootScope.loadingVisible = false;
            $state.go('app.routes.list', {journey: response.data});
        }

        function osrmHttp_faild(faild) {
            $rootScope.loadingVisible = false;
            message.show('error', faild.data.message);
            //      message.show('error',faild.data.message );
        }

        function total() {
            var count = {
                unmatch: 0,
                match: 0,
                mean: 0,
                manual: 0,
                all: 0
            }

            var paramFilterMatch = [{
                "key": "statusGeocoding",
                "value": 'MATCH',
                "precision": true
            }];
            var paramFilterMean = [{
                "key": "statusGeocoding",
                "value": 'MEAN',
                "precision": true
            }];
            var paramFilterManual = [{
                "key": "statusGeocoding",
                "value": 'MANUAL',
                "precision": true
            }];
            var paramFilterUnMatch = [{
                "key": "statusGeocoding",
                "value": 'UNMATCH',
                "precision": true
            }];

            count.match = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilterMatch).length;
            count.mean = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilterMean).length;
            count.manual = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilterManual).length;
            count.unmatch = $filter('arrayFilter')($scope.Itinerary.dataSource, paramFilterUnMatch).length;
            count.all = $scope.Itinerary.dataSource.length;

            $scope.statusFilter.data[0].name = "TODAS ("+count.all+")";
            $scope.statusFilter.data[1].name = "UBICADAS ("+count.match+")";
            $scope.statusFilter.data[2].name = "APROXIMADAS ("+count.mean+")";
            $scope.statusFilter.data[3].name = "MANUALES("+count.manual+")";
            $scope.statusFilter.data[4].name = "NO UBICADAS ("+count.unmatch+")";
            $scope.Itinerary.count = count;

            return count;
        }

    }
]);
