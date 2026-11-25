
/**=========================================================
 * Module: address_form_controller.js
 * controllador para el modulo formulario de Direcciones
 =========================================================*/
App.controller('AddressFormController',[
    '$scope',
    '$rootScope',
    '$state',
    '$stateParams',
    'message',
    'Address',
    'Geocoding',
    function ($scope, $rootScope, $state, $stateParams, message, Address, Geocoding) {
        "use strict"

        console.log($stateParams.address);

        $scope.address = {
            model : {
                /*id : '',
                address : '',
                lengthOfStay : '',
                weight : '',
                volume : '',
                recipientGuide: '',
                alias : '',
                zone : '',
                observations : '',
                deliveryTime : '',
                x :0,
                y : 0*/
            },
            save : function() {
                if($scope.returnTo.state) {
                    $scope.returnTo.data.addAddress(this.model);
                    $state.go($scope.returnTo.state, { data : $scope.returnTo.data });
                }
            },
            update : function() {
                if($scope.returnTo.state){
                    $scope.returnTo.data.addAddress(this.model);
                    $state.go($scope.returnTo.state, { data : $scope.returnTo.data });
                }
            },
            cancel : function() {
                if($scope.returnTo.state){
                    $state.go($scope.returnTo.state, { data : $scope.returnTo.data });
                }
            },
            geocoding : function() {
            	var returnTo = {
            		state: $state.current.name,
            		data: {
            		 item : $scope.address.model,
            		 address: {}
            		}
            	};
		        $state.go('app.address.geocoding', { returnTo : returnTo });
            },
            goToMap : function() {
                var returnTo = {};
                returnTo.state = $state.current;
                returnTo.data = $scope.returnTo;
                //returnTo.data.returnTo = $scope.returnTo;
                var geocoding = new Geocoding({
                    result : $scope.address.model,
                    address : "address",
                    latitude : "y",
                    longitude : "x",
                    status : "status"
                });
                console.log(geocoding.getLongitude());
                console.log(geocoding.getLatitude());
                console.log(geocoding.getAddress());
                console.log(geocoding.result);
                $state.go('app.maps.geocoding',{ map_mode_use: 'geocoding', geocoding : geocoding, returnTo : returnTo });
            }
        };

        $scope.submitForm = function() {
            if($scope.addressForm.$valid || true){
                if ($state.is('app.address.edit')){
                    $scope.address.update();
                } else if ($state.is('app.address.add')){
                    $scope.address.save();
                }
            } else{
                message.show("warning", "Campos erroneos");
            }

        };


        $scope.returnTo = (function() {
            //var returnTo;

            /*if($stateParams.data && $stateParams.data.returnTo){
                returnTo = $stateParams.data.returnTo;
            }else{
                returnTo = $stateParams.returnTo || {};
            }*/

            return $stateParams.returnTo;
        })()

        $scope.address.model  = ($stateParams.data || (new Address()));

    }
]);
