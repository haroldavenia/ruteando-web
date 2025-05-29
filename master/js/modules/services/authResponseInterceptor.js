'use strict';

App.service('authResponseInterceptor', function($q, $timeout, $location, tokenStorage, message, $rootScope, $window) {
  return {
    response: function(response) {
      return response;
    },
    responseError: function(response) {
      var INVALID_TOKEN = 'invalid_token';

      if (response.status == 0) {
        alert("Verifique su conexión a Internet");
        //        messageStorage.add("warning", "Verifique su conexión a Internet");
        console.info("==== error 1");
        return $q.reject(response.status);
      } else if (response.data.error !== undefined) {
        console.info("==== error 2");
        if (response.data.error === INVALID_TOKEN && !$rootScope.updatingToken) {
          tokenStorage.resetToken();
          message.show("error", "acceso denegado");
          $location.path('access/login');
          console.info("==== error 2.1");
          return $q.reject(null);
        } else {
          console.info("==== error 2.2");
          console.dir(response);
          //return $q.reject(response.data);
          return $q.reject(response);
        }
      } else if (response.data !== undefined) {
        console.info("==== error 3");
        return $q.resolve(response.data);
      } else {
        console.info("==== error 4");
        return $q.resolve(response);
      }
    }
  }
});