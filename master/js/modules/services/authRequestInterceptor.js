'use strict';

App.factory('authRequestInterceptor', function (tokenStorage) {
  return {
    request: function (config) {

  //      config.headers.Authorization = 'Basic SEFOT0lULUFQUDoxMjM0NTY=';

      if (config.headers.Authorization == undefined) {
        config.headers = config.headers || {};
        if ( tokenStorage.get() !== undefined || tokenStorage.get() !== null ) {
          config.headers.Authorization = 'Bearer ' + tokenStorage.get();        
        }
      }
      
      //    	console.log(config);

      return config;
    }
  }
});
