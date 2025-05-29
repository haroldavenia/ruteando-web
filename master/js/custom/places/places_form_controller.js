/**=========================================================
 * Module: address_form_controller.js
 * controllador para el modulo de lugares
 =========================================================*/
App.controller('PlacesFormController',[
    '$scope',
    '$rootScope',
    '$state',
    '$stateParams',
    'PlacesHttp',
    'Geocoding',
    'message',
    function ($scope, $rootScope, $state, $stateParams, PlacesHttp, Geocoding, message) {


        $scope.locationChange = $rootScope.locationChange;

        $scope.$watch('locationChange.newState', function() {
            console.log($scope.locationChange);
        });

        $scope.place = {
            model : {
                id : '',
                name : '',
                address : '',
                phoneNumber : '',
                latitude : 0,
                longitude : 0
            },
            geocoding : function() {
                var returnTo = {
                    state: $state.current.name,
                    data: {
                        place : $scope.place.model,
                        returnTo : $stateParams.returnTo,
                        address: {}
                    }
                };
                $state.go('app.address.geocoding', { returnTo : returnTo });
            },
            save : function() {
                var _PlacesHttp = new PlacesHttp($scope.place.model);
                if ($state.is('app.places.add') && $scope.placeForm.$valid) {
                    delete _PlacesHttp.id;
                    _PlacesHttp.$save( function(response) {
                        $scope.place.cancel();
                    });
                }else if ($state.is('app.places.edit') && $scope.placeForm.$valid) {
                    _PlacesHttp.$update( function(response) {
                        $scope.place.cancel();
                    });
                } else {
                    message.show("warning","Formulario invalido");
                }
            },
            cancel : function() {
                if ($stateParams.returnTo !== undefined && $stateParams.returnTo.state) {
                    $state.go($stateParams.returnTo.state,{ data : $stateParams.returnTo.data } );
                } else if ($stateParams.data && $stateParams.data.returnTo !== undefined &&  $stateParams.data.returnTo.state) {
                    $state.go($stateParams.data.returnTo.state, { data : $stateParams.data.returnTo.data } );
                } else {
                    $state.go('app.places.list');
                }
            },
            goToMap : function() {
                var geocoding = new Geocoding({
                    result : $scope.place.model,
                    address : "address",
                    latitude : "latitude",
                    longitude : "longitude",
                    status : "status"
                });

                var returnTo = {
                    state: $state.current.name,
                    data: {
                        place : $scope.place.model,
                        returnTo : $stateParams.returnTo,
                        address: {}
                    }
                };
                $state.go('app.maps.geocoding', {map_mode_use: 'geocoding', geocoding : geocoding, returnTo : returnTo });
            }
        }

        console.log($stateParams);

        if ($stateParams.data) {
            ($stateParams.data.place !== undefined) ? $scope.place.model = $stateParams.data.place : null;

            if ($stateParams.data.address !== undefined && $stateParams.data.address.address !== undefined) {
                $scope.place.model.address = ($stateParams.data.address.address) ? $stateParams.data.address.address : $scope.place.model.address;
                $scope.place.model.longitude = ($stateParams.data.address.location.x) ? $stateParams.data.address.location.x : $scope.place.model.longitude;
                $scope.place.model.latitude = ($stateParams.data.address.location.y) ? $stateParams.data.address.location.y : $scope.place.model.latitude;
            }
        }
    }
]);
