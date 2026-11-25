/**

*servicio para cargar los parciales desde jsono2html

*/

App.factory('PartialLoader', ['$http','$log','$auth','config',function($http,$log,$auth,config) {
    // body...
    var path = config().path;
    var templateCache = {};

    // solo para prueba momentaneas
    // esto deberia ir a un endpoint con el nombre del template y el UserToken
    // http://localhost:port/endPointName/UserToken?partialName=name
    var partialsPath = {
        'settingsBasic' : path.partials+'settings_basic.json',
        'settingsEnterprise' : path.partials+'settings_enterprise.json',
        'settingsTime' : path.partials+'settings_time.json',
        'settingsResourceEnterprice' : path.partials+'settings_resource_enterprise.json',
        'settingsResourceBasic' : path.partials+'settings_resource_basic.json'
    };

    function loadPartial(partialName, callback) {
        
        if (templateCache[partialName]) {
            callback(templateCache[partialName]);
        }

        if (partialsPath[partialName] === undefined){
            $log.error("partial: \""+partialName+"\" no existe!!!")
            return;
        }

        $http.get(partialsPath[partialName],{partial:partialName, })
            .success( function(data, status) {
                $log.debug(data);
                $log.debug(status);
                templateCache[partialName] = data;
                callback(templateCache[partialName]);
            })
            .error( function(data,status) {
                $log.error(data);
                $log.error(status);
            });
    };

    return { loadPartial: loadPartial };
}])
;