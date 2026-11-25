/**=========================================================
 * Module: geocoding_form_controller.js
 * controllador para el modulo geocodificar direcciones
 =========================================================*/
App.controller('GeocodingFormController',[
	'$scope',
	'$rootScope',
	'$state',
	'$stateParams',
	'addressHttp',
	function ($scope, $rootScope, $state, $stateParams, addressHttp) {


		$scope.CORRECT = 1;
		$scope.INCORRECT = 2;

		var defAddress = null;
		var defCity = null;
		var defCountry = null;

		if($stateParams.returnTo !== undefined || $stateParams.returnTo !== null){
			if($stateParams.returnTo.hasOwnProperty('data')){
				if($stateParams.returnTo.data.hasOwnProperty('place')){
					if($stateParams.returnTo.data.place.hasOwnProperty('address')){
						defAddress = $stateParams.returnTo.data.place.address;
					}
				}
				if($stateParams.returnTo.data.hasOwnProperty('package')){
					if($stateParams.returnTo.data.package.hasOwnProperty('address')){
						defAddress = $stateParams.returnTo.data.package.address;
					}
					if($stateParams.returnTo.data.package.hasOwnProperty('city')){
						defCity = $stateParams.returnTo.data.package.city;
					}
					if($stateParams.returnTo.data.package.hasOwnProperty('country')){
						defCountry = $stateParams.returnTo.data.package.country;
					}

				}
			}
		}

		$scope.geocoding = {
			model : {
				id: 0,
				country: defCountry  !== null ?  defCountry : undefined,
				address : defAddress !== null ?  defAddress : undefined,
				city: defCity  !== null ?  defCity : undefined,
				location : {
					x : 0,
					y : 0
				}
			},
			status : 0,
			send : function() {
				$scope.address_required = ($scope.geocoding.model.address === undefined) ? true: false;
				$scope.city_required = ($scope.geocoding.model.city === undefined) ? true: false;
				$scope.country_required = ($scope.geocoding.model.country === undefined) ? true: false;

				if (!$scope.address_required && !$scope.city_required && !$scope.country_required) {
					$scope.geocoding.status =  '';
					$rootScope.loadingVisible = true;
					addressHttp.geoCoding($scope.geocoding.model).then(function(response) {
						$rootScope.loadingVisible = false;
						if (response.data.address == null) {
							$scope.geocoding.status = $scope.INCORRECT;
							$scope.geocoding.model.location = {x : 0, y: 0 };
						} else {
							$scope.geocoding.status = $scope.CORRECT;
							//$scope.geocoding.model.address = response.data.address;
							$scope.geocoding.model.address = response.data.standarizedAddress;
							$scope.geocoding.model.location = {x : response.data.location.y, y: response.data.location.x };
							//$scope.geocoding.model.location = response.data.location;
							$scope.geocoding.model.score = response.data.score;
							if ($stateParams.returnTo.state) {
								setTimeout(function() {
									$stateParams.returnTo.data.address = $scope.geocoding.model;
									$state.go($stateParams.returnTo.state,{ data: $stateParams.returnTo.data } );
								}, 2000);
							}
						}
					}, function(error) {
						$rootScope.loadingVisible = false;
						$scope.geocoding.status = $scope.INCORRECT;
						console.log(error);
					});
				}
			},
			cancel : function() {
				if ($stateParams.returnTo == undefined) {
					$state.go('default');
				} else if ($stateParams.returnTo.state) {
					$state.go($stateParams.returnTo.state, { data: $stateParams.returnTo.data } );
				} else {
					$state.go('default');
				}

			}
		}


	}
]);
