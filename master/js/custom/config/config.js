
App.config([
    '$routeProvider',
    '$urlRouterProvider',
    '$httpProvider',
    '$authProvider',
    'config', 
    function($routeProvider, $urlRouterProvider, $httpProvider, $authProvider,config ) {
        //$routeProvider.otherwise({redirectTo: '/login'});
        //$urlRouterProvider.otherwise('/login');
        
        $httpProvider.defaults.useXDomain = true;
        //delete $httpProvider.defaults.headers.common['X-Requested-With'];
        $authProvider.facebook({
            clientId: config().AppFaceId
        });

        $authProvider.google({
            clientId: config().AppGoogleId
        });

    }
]);