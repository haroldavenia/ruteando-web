/**=========================================================
 * Module: config.js
 * App routes and resources configuration
 =========================================================*/

App.config(['$stateProvider', '$locationProvider', '$urlRouterProvider', 'RouteHelpersProvider',
            function ($stateProvider, $locationProvider, $urlRouterProvider, helper) {
              'use strict';

              // Set the following to true to enable the HTML5 Mode
              // You may have to set <base> tag in index and a routing configuration in your server
              $locationProvider.html5Mode(false);

              // default route
              $urlRouterProvider.otherwise('/access/login');

              //
              // Application Routes
              // -----------------------------------
              $stateProvider

              //estados para el modulo de acceso de aplicacion
                .state('access',  {
                url: '^/access',
                templateUrl: 'app/views/pages/access.html',
                resolve: helper.resolveFor('bootstrap','modernizr', 'icons'),
                controller: ["$rootScope", function($rootScope) {
                  $rootScope.app.layout.isBoxed = false;
                }]
              })
              /*
                .state('access.login', {
                url: '/login',
                templateUrl: 'app/views/pages/login.html',
                controller : "LoginController"
              })
*/

                .state('access.login', {
                url: '/login',
                templateUrl: 'app/views/pages/login2.html',
                controller : "LoginController"
              })
                .state('access.register', {
                url : '/register',
                templateUrl : 'app/views/pages/register.html',
                //        resolve: angular.extend(helper.resolveFor('ngDialog'),{
                //          tpl: function() { return { path: helper.basepath('templates/register_dialog.html') }; }
                //        }),
                controller : 'RegisterController'
              })
                .state('access.registerTwo',{
                url : '/registerTwo',
                templateUrl :  helper.basepath('pages/access/register_two.html'),
                resolve: helper.resolveFor('parsley')
              })
                .state('access.recovery', {
                url: '/recovery',
                templateUrl: 'app/views/pages/recover.html',
                controller : "RecoveryController"
              })
                .state('access.reset', {
                url: '/reset/:token',
                templateUrl: 'app/views/pages/reset.html',
                controller : "ResetController"
              })
                .state('access.activate', {
                url: '/activate/:token',
                templateUrl: 'app/views/pages/access/activate.html',
                controller : "ActivateController"
              })

              // estados de la aplicacion
                .state('app', {
                url: '/app',
                abstract: true,
                templateUrl: helper.basepath('app.html'),
                controller: 'AppController',
                resolve: helper.resolveFor('bootstrap','fastclick', 'modernizr', 'icons', 'screenfull', 'animo', 'slimscroll', 'classyloader', 'toaster', 'whirl','openLayer','openLayerSwitcher','jsPDF', 'jsPDF.plugins', 'alasql_excel', 'ngDialog', 'ui.select')
              })
                .state('app.home', {
                url: '/home/:tknrefresh',
                templateUrl: helper.basepath('home.html')
              })
                .state('app.submenu', {
                url: '/submenu',
                templateUrl: helper.basepath('submenu.html')
              })
                .state('app.maps', {
                url: '/maps',
                templateUrl: 'app/views/pages/maps.html',
                resolve: helper.resolveFor('openLayer','openLayerSwitcher')
              })
                .state('app.maps.index', {
                url: '/index',
                templateUrl: helper.basepath('pages/maps/map_index.html'),
                controller: 'MapsController'
              })
                .state('app.maps.address', {
                url : '/editAddress',
                templateUrl: helper.basepath('pages/maps/map_address.html'),
                controller : 'MapGenLatLongController',
                params : { map_mode_use:'address', address : null, returnTo : { state: null, data : {} }}
              })
                .state('app.maps.geocoding', {
                url : '/geocoding',
                templateUrl: helper.basepath('pages/maps/map_geocoding.html'),
                controller : 'MapGenLatLongController',
                params : { map_mode_use:'geocoding', geocoding : null, returnTo : { state: null, data : {} }}
              }).
              state('app.maps.journey',{
                url : '/journey',
                templateUrl : helper.basepath('pages/maps/map_journey.html'),
                controller : 'MapGenLatLongController',
                params : { map_mode_use:'journey', journey : {}, options : {}, returnTo : { state : null, data : {} }}
              })
                .state('app.maps.route',{
                url :'/route',
                templateUrl : helper.basepath('pages/maps/map_route.html'),
                controller : 'MapGenLatLongController',
                params : { map_mode_use: 'route', geoJson : null, routeId : null, place: null, packages: null, returnTo : { state : null, data : {} }}
              })
                .state('app.maps.assigned',{
                url :'/assigned',
                templateUrl : helper.basepath('pages/maps/map_assigned.html'),
                controller : 'MapGenLatLongController',
                params : {map_mode_use:'assigned', address : null, returnTo : { state : null, data : {} }}
              })                // estados para el modulo de visitas
                .state('app.visits',{
                url : '/visits',
                abstract : true,
                templateUrl :  helper.basepath('pages/visits/visits.html')
              })
                .state('app.visits.detail',{
                url : '/detail',
                templateUrl : helper.basepath('pages/visits/visit_detail.html')
              })
                .state('app.visits.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/visits/visits_list.html'),
                params : { packages : null, journey: null, returnTo : { state : null, data : {} }},
                controller : 'VisitsController'
              })

              // estados para el modulo de trajectos
                .state('app.journeys',{
                url : '/journeys',
                abstract : true,
                templateUrl : helper.basepath('pages/journeys/journeys.html')
              })
                .state('app.journeys.add',{
                url : '/add',
                templateUrl : helper.basepath('pages/journeys/form.html'),
                controller : 'JourneysFormController',
                resolve: helper.resolveFor('angularFileUpload', 'filestyle'),
                params : { data : null , returnTo: {state: null , data : null}}
              })
                .state('app.journeys.detail',{
                url : '/detail',
                templateUrl : helper.basepath('pages/journeys/journey_detail.html'),
                controller : 'JourneyDetailController',
                params : { data : null , returnTo: {state: null , data : null}}
              })
                .state('app.journeys.help',{
                url : '/help',
                templateUrl : helper.basepath('pages/journeys/journey_fileHelpUpload.html'),
                controller : 'JourneyFileHelpController',
                params : { data : null , returnTo: {state: null , data : null}}
              })
                .state('app.journeys.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/journeys/journeys_list.html'),
                controller : 'JourneysController',
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })

              })
                .state('app.journeys.chart',{
                url : '/chart',
                templateUrl : helper.basepath('pages/journeys/journeys_chart.html'),
                controller : 'JourneysChartController',
                resolve: helper.resolveFor('flot-chart','flot-chart-plugins')
              })
              // estados para el modulo de trajectos
                .state('app.itinerary', {
                url : '/itinerary',
                abstract : true,
                templateUrl : helper.basepath('pages/itinerary/itinerary.html')
              })
                .state('app.itinerary.list', {
                url : '/list',
                controller : 'ItineraryController',
                templateUrl : helper.basepath('pages/itinerary/itinerary_list.html'),
                params : { data:null, returnTo : { state : null, data : {} } },
                resolve: angular.extend(helper.resolveFor('ngDialog', 'localytics.directives'), {
                  tpl: function() { return {
                    path: helper.basepath('templates/delete_confirmation.html'),
                    optimice: helper.basepath('templates/optimice_confirmation.html'),
                  }; }
                })
              })
                .state('app.itinerary.add',{
                url : '/add',
                controller : 'ItineraryFormController',
                templateUrl : helper.basepath('pages/itinerary/form.html'),
                resolve : helper.resolveFor('localytics.directives'),
                params : { data:null, returnTo : { state : null, data : {} } }
              })
                .state('app.itinerary.edit',{
                url : '/edit',
                controller : 'ItineraryFormController',
                templateUrl : helper.basepath('pages/itinerary/form.html'),
                resolve : helper.resolveFor('localytics.directives'),
                params : { data:null, returnTo : { state : null, data : {} } }
              })
              // estados del modulo de ajustes
                .state('app.settings',{
                url : '/settings',
                abstract : true,
                templateUrl : helper.basepath('pages/settings/settings.html')
              })
                .state('app.settings.add',{
                url : '/add',
                templateUrl : helper.basepath('pages/settings/form.html'),
                controller : 'SettingsFormController',
                params : { data : null , returnTo: {state: null , data : null}},
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })
                .state('app.settings.edit',{
                url : '/edit',
                templateUrl : helper.basepath('pages/settings/form.html'),
                controller : 'SettingsFormController',
                params : { data : null , returnTo: {state: null , data : null}},
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })
                .state('app.settings.list', {
                url : '/list',
                templateUrl : helper.basepath('pages/settings/settings_list.html'),
                controller : 'SettingsController',
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })

              // estados del modulo de tipos de vehiculos
                .state('app.vehicleTypes',{
                url : '/vehicleTypes',
                abstract : true,
                templateUrl : helper.basepath('pages/vehicle_types/vehicle_types.html')
              })
                .state('app.vehicleTypes.add',{
                url : '/add',
                templateUrl : helper.basepath('pages/vehicle_types/form.html'),
                controller : "VehicleTypeController",
                params : { vehicleType : null , returnTo : { state : null, data : {} } }
              })
                .state('app.vehicleTypes.edit',{
                url : '/edit',
                templateUrl : helper.basepath('pages/vehicle_types/form.html'),
                //params: { mode : "edit", vehicleType : null },
                controller : "VehicleTypeController",
                params : { vehicleType : null , returnTo : { state : null, data : {} } }
              })
                .state('app.vehicleTypes.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/vehicle_types/vehicle_types_list.html'),
                controller : 'VehicleTypesController',
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })

              // estados del modulo Lugares
                .state('app.places',{
                url : '/places',
                abstract : true,
                templateUrl : helper.basepath('pages/places/places.html')
              })
                .state('app.places.add',{
                url : '/add',
                templateUrl : helper.basepath('pages/places/form.html'),
                controller : 'PlacesFormController',
                params : {data:null, returnTo : { state : null, data : {} } }
              })
                .state('app.places.edit',{
                url : '/edit',
                templateUrl : helper.basepath('pages/places/form.html'),
                controller : 'PlacesFormController',
                params : {data:null, returnTo : { state : null, data : {} } }
              })
                .state('app.places.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/places/places_list.html'),
                controller : 'PlacesController',
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })

              // estados del modulo Rutas
                .state('app.routes',{
                url : '/routes',
                abstract : true,
                templateUrl : helper.basepath('pages/routes/routes.html'),
                params : {data:null, returnTo : { state : null, data : {} } },
                resolve: helper.resolveFor('openLayer','openLayerSwitcher')
              })
                .state('app.routes.detail',{
                url : '/detail',
                templateUrl : helper.basepath('pages/routes/route_detail.html'),
                controller : 'RouteDetailController',
                params : { data : null , returnTo: {state: null , data : null}}
              })
                .state('app.routes.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/routes/routes_list.html'),
                params : {journey : null, returnTo : { state : null, data : {} } },
                controller : 'RoutesController'
              })

              // estados del modulo Servicios Asignados
                .state('app.assignedServices', {
                url : '/assignedServices',
                abstract : true,
                templateUrl : helper.basepath('pages/assigned_services/assigned_services.html')
              })
                .state('app.assignedServices.add',{
                url : '/add',
                templateUrl : helper.basepath('pages/assigned_services/form.html'),
                controller : 'AssignedServicesFormController',
                params : {route : null, returnTo : { state : null, data : {} } },
                resolve : helper.resolveFor('localytics.directives')
              })
                .state('app.assignedServices.edit',{
                url : '/edit',
                templateUrl : helper.basepath('pages/assigned_services/form.html'),
                controller : 'AssignedServicesFormController',
                resolve : helper.resolveFor('localytics.directives')
              })
                .state('app.assignedServices.list', {
                url : '/list',
                templateUrl : helper.basepath('pages/assigned_services/assigned_services_list.html'),
                controller : 'AssignedServicesController'
              })

              // estados del modulo Vehiculos
                .state('app.vehicles',{
                url : '/vehicles',
                abstract : true,
                templateUrl : helper.basepath('pages/vehicles/vehicles.html')
              })
                .state('app.vehicles.add', {
                url : '/add',
                templateUrl : helper.basepath('pages/vehicles/form.html'),
                controller : 'VehicleController',
                params : { vehicle : null , returnTo : { state : null, data : {} } }
              })
                .state('app.vehicles.edit',{
                url : '/edit',
                templateUrl : helper.basepath('pages/vehicles/form.html'),
                controller : 'VehicleController',
                params : { vehicle : null , returnTo : { state : null, data : {} } }
              })
                .state('app.vehicles.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/vehicles/vehicles_list.html'),
                controller : 'VehiclesController',
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })

              // estados del modulo Visitas sin atender
                .state('app.visitsUnattended',{
                url : '/visitsUnattended',
                templateUrl : helper.basepath('pages/visits_unattended/visits_unattended.html'),
                controller : 'VisitsUnattendedController'
              })
              // estados del modulo de conductores
                .state('app.drivers',{
                url : '/drivers',
                templateUrl : helper.basepath('pages/drivers/drivers.html')
              })
                .state('app.drivers.add',{
                url : '/add',
                templateUrl : helper.basepath('pages/drivers/form.html'),
                params: { driver: null },
                controller : 'driverController'
              })
                .state('app.drivers.edit',{
                url : '/edit',
                templateUrl : helper.basepath('pages/drivers/form.html'),
                params: { driver: null },
                controller : 'driverController'
              })
                .state('app.drivers.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/drivers/drivers_list.html'),
                controller : 'driversController',
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })
              // estados del modulo de conductores
                .state('app.catalogs',{
                url : '/catalogs',
                templateUrl : helper.basepath('pages/catalogs/catalogs.html')
              })
                .state('app.catalogs.add',{
                url : '/add',
                templateUrl : helper.basepath('pages/catalogs/form.html'),
                params : { catalog : null , returnTo : { state : null, data : {} } },
                resolve: helper.resolveFor('ui.select'),
                controller : 'catalogController'
              })
                .state('app.catalogs.edit',{
                url : '/edit',
                templateUrl : helper.basepath('pages/catalogs/form.html'),
                params : { catalog : null , returnTo : { state : null, data : {} } },
                resolve : helper.resolveFor('localytics.directives'),
                controller : 'catalogController'
              })
                .state('app.catalogs.list',{
                url : '/list',
                templateUrl : helper.basepath('pages/catalogs/catalogs_list.html'),
                controller : 'catalogsController',
                resolve: angular.extend(helper.resolveFor('ngDialog'), {
                  tpl: function() { return { path: helper.basepath('templates/delete_confirmation.html') }; }
                })
              })


              //estados para modulo de direcciones
                .state('app.address',{
                url : '/address',
                abstract : true,
                templateUrl : helper.basepath('pages/address/address.html'),
                controller : 'AddressController'
              })
                .state('app.address.geocoding',{
                url : '/geocoding',
                templateUrl : helper.basepath('pages/address/geocoding_form.html'),
                controller : 'GeocodingFormController',
                resolve : helper.resolveFor('localytics.directives'),
                params : { data : null , returnTo : { state : null, data : {} } }
              })

                .state('app.test', {
                url : '/test',
                templateUrl : helper.basepath('test.html'),
                controller : 'TestController',
                resolve : helper.resolveFor('openLayer','openLayerSwitcher','jsPDF', 'jsPDF.plugins','fakerJS')
              })

            }]).config(['$ocLazyLoadProvider', 'APP_REQUIRES', function ($ocLazyLoadProvider, APP_REQUIRES) {
  'use strict';

  // Lazy Load modules configuration
  $ocLazyLoadProvider.config({
    debug: true,
    events: true,
    modules: APP_REQUIRES.modules
  });

}]).config(['$controllerProvider', '$compileProvider', '$filterProvider', '$provide',
            function ( $controllerProvider, $compileProvider, $filterProvider, $provide) {
              'use strict';
              // registering components after bootstrap
              App.controller = $controllerProvider.register;
              App.directive  = $compileProvider.directive;
              App.filter     = $filterProvider.register;
              App.factory    = $provide.factory;
              App.service    = $provide.service;
              App.constant   = $provide.constant;
              App.value      = $provide.value;

            }]).config(['$translateProvider', function ($translateProvider) {

  $translateProvider.useStaticFilesLoader({
    prefix : 'app/i18n/',
    suffix : '.json'
  });
  $translateProvider.preferredLanguage('es');
  $translateProvider.useLocalStorage();
  $translateProvider.usePostCompiling(true);

}]).config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
  cfpLoadingBarProvider.includeBar = true;
  cfpLoadingBarProvider.includeSpinner = false;
  cfpLoadingBarProvider.latencyThreshold = 500;
  cfpLoadingBarProvider.parentSelector = '.wrapper > section';
}]).config(['$tooltipProvider', function ($tooltipProvider) {

  $tooltipProvider.options({appendToBody: true});

}]).config(['$httpProvider', function ($httpProvider) {

  $httpProvider.interceptors.push('authRequestInterceptor');
  $httpProvider.interceptors.push('authResponseInterceptor');

  //    $httpProvider.defaults.useXDomain = true;
  //  	delete $httpProvider.defaults.headers.common['x-requested-with'];
  //	$httpProvider.defaults.headers['Content-Type'] = 'application/json; charset=UTF-8';

}]).config(['$authProvider','config', function ($authProvider, config) {

  $authProvider.facebook({
    clientId: config().AppFaceId
  });

  $authProvider.google({
    clientId: config().AppGoogleId
  });

}]);
