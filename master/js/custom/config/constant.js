/**=========================================================
 * Module: custom/config/constant.js
 * App default url path for api and other configurations
 =========================================================*/

App.constant('config',function () {
    // body...
    'use strict';
    // id de aplicaciones
   	var CLIENT_SECRECT = '123456';
   	var CLIENT_ID = 'HANOIT-APP';

    var APP_FACE_ID = '760244197414824';
    var APP_GOOGLE_CLIENT_ID = "299346955747-0q7jel6iaok2g36a1hginqta56i7fm08.apps.googleusercontent.com";

    var MAP_BOX_MAP_ID = 'direct.cif4495oq30swsum3eems1dkf',    // cambiar la aplicaion MapBox aqui
        MAP_BOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGlyZWN0IiwiYSI6ImNpZjQ0OTcyZTMxZnJ0aW01dzU5bW9xd2sifQ.aYjmmG1QKi4VYM6ya0kL4Q',  // cambiar el access token de MapBox aqui
        MAP_BOX_URL = 'http://api.tiles.mapbox.com/v4/'+MAP_BOX_MAP_ID+'/{z}/{x}/{y}.png?access_token='+MAP_BOX_ACCESS_TOKEN;

    var protocol = "http://",
        host = "localhost",
        port = "3000",
        url = protocol+host+":"+port,
        path = {
            api : {}
        },
        areas = {},
        API_PROTOCOL = 'http://',
        API_HOST = 'hanoit',
        API_PORT = '9000',
        API_PATH = '/hanoit/api',
        API_VERSION = '/v1',
        API_URL = API_PROTOCOL+API_HOST+':'+API_PORT+API_PATH+API_VERSION;

    // configuracion de las rutas
    path.login =        API_PROTOCOL + API_HOST + ':' + API_PORT + "/oauth/token";
    path.signup =        API_PROTOCOL + API_HOST + ':' + API_PORT + "/singup";
    path.forgotPassword =        API_PROTOCOL + API_HOST + ':' + API_PORT + "/forgotPassword";

//    path.login =        url+"/login";
//    path.signup =       url+"/signup";
    path.register =     url+"/register";
    path.account =      url+"/api/account";
    path.partials =     url+"/server/partials/";
    //path.uploadFile =   url+"/server/upload/"; 
//    path.uploadFile =   "http://52.26.129.237:9000/hanoit/api/v1/journey/upload"; 
        
    //url de los recurso del API
    //    path.api.typeResources =     API_URL+"/typeresources";
    path.api.typeResources =     API_URL+"/typevehicle/:id";
    path.api.assignedServices = API_URL+"/assignedservice/:id";
    path.api.places =            API_URL+"/places/:id";
    path.api.drivers =            API_URL+"/driver/:id";
    path.api.catalogs =            API_URL+"/catalogs/:id";
    path.api.geocoding =            API_URL+"/geocoding";
    path.api.reverse_geocoding =    API_URL+"/reverse_geocoding";
    path.api.optimalRouteOfPointCloud = API_URL+"/optimalRouteOfPointCloud";
    path.api.optimisationForMessenger = API_URL+"/optimisationForMessenger";
    path.api.journeys =         API_URL+"/journeys/:id";
    path.api.journeyUploadFile =         API_URL+"/journey/upload";
    path.api.routes =           API_URL+"/routes";
    path.api.settings =         API_URL+"/settings/:id";
    path.api.vehicles =         API_URL+"/vehicles/:id";
    path.api.visits =           API_URL+"/visits/:id";

    // areas o div para elemetos espesificos
    areas.mapaGoogle = 'mapaGoogle';
    areas.mapaStreetView = 'mapaStreetView';

    // TODO: esto deberia venir desde el servidor
    var user = {
        type : {
            ANONIMUS : 0,
            BASIC : 1,
            PREMIER : 2,
            ENTERPRISE : 3
        }
    };

    var visits = {
        status : [
            {key : 'VISITED',           value : 0, name : 'VISITADOS'},
            {key : 'VISIT_PENDING',     value : 1, name : 'PENDIENTE'},
            {key : 'VISIT_FINISHED',    value : 2, name : 'FINALIZADO'}
        ]
    };


    return { 
        path : path,
        areas : areas,
        AppFaceId : APP_FACE_ID,
        AppGoogleId : APP_GOOGLE_CLIENT_ID,
        clientSecret : CLIENT_SECRECT,
        clientId : CLIENT_ID,
        user : user,
        visits : visits,
        mapBoxURL : MAP_BOX_URL
    };
});
