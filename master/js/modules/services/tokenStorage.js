


App.service('tokenStorage', function tokenStorage($window, $rootScope) {
   return ({
    set: setToken,
    setRefreshToken: setRefreshToken,
    get: getToken,
    getRefreshToken : getRefreshToken,
    resetToken : resetToken
   });

  var hanoitToken = '';

  	function expirationTime(time) {
      console.log("expirationTime" + time);
		var _time = time - 5;
	   	setTimeout(function() {
   			$rootScope.$broadcast('refresh_token', { refresh_token : $window.localStorage.hanoitToken } );
	   	}, _time * 1000);
	}

   function setToken(token) {
   		console.log("estoy guardando token");
      hanoitToken = token.access_token;
      $window.localStorage.hanoitToken = token.refresh_token;
      var actual_vence_date = new Date();
      actual_vence_date.setSeconds((parseInt(token.expires_in)));
      $window.localStorage.hanoitTokenExpiresDate = actual_vence_date;

      expirationTime(token.expires_in);
   }

   function setRefreshToken(tkn_refresh) {
     $window.localStorage.hanoitToken = tkn_refresh;
   }

   function getToken() {
   	return hanoitToken;
   }

   function getRefreshToken() {
     if($window.localStorage.hanoitTokenExpiresDate < new Date())
     {
       resetToken();
     }
     return $window.localStorage.hanoitToken;
   }

    function resetToken() {
      hanoitToken = '';
      $window.localStorage.removeItem("hanoitToken");
      $window.localStorage.removeItem("hanoitTokenExpiresDate");
     }

/*
  function startClock(time) {
    if ( angular.isDefined(refreshJob) ) return;
    refreshJob = $interval(function() {
      dynamicUpdateLayers();
    },5000);
  }

  startJob();

  function stopJob() {
    if (angular.isDefined(refreshJob)) {
      $interval.cancel(refreshJob);
      refreshJob = undefined;
    }
  };
*/

  });
