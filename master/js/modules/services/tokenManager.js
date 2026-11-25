

App.service('TokenManager', function($window, $rootScope) {
	return {
		expirationTime : function(time, refresh_token) {
			var _time = time - 5000;
		    $window.localStorage.hanoitToken = refresh_token;

	   		setTimeout(function() {
	   			$rootScope.$broadcast('refresh_token', {refresh_Token : $window.localStorage.hanoitToken } );
//	   			console.log($window.localStorage.hanoitToken );
	   		}, _time);
		}
	}


})