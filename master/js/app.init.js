/*!
 *
 * Angle - Bootstrap Admin App + AngularJS
 *
 * Author: @themicon_co
 * Website: http://themicon.co
 * License: http://support.wrapbootstrap.com/knowledge_base/topics/usage-licenses
 *
 */

if (typeof $ === 'undefined') { throw new Error('This application\'s JavaScript requires jQuery'); }

// APP START
// -----------------------------------

var App = angular.module('angle', [
  'ngRoute',
  'ngAnimate',
  'ngStorage',
  'ngCookies',
  'pascalprecht.translate',
  'ui.bootstrap',
  'ui.router',
  'oc.lazyLoad',
  'cfp.loadingBar',
  'ngSanitize',
  'ngResource',
  'ui.utils',
  'tmh.dynamicLocale',
  'satellizer',
  'ui.sortable',
  'ui.select',
  'ct.ui.router.extras.core',
  'ct.ui.router.extras.sticky',
  'ct.ui.router.extras.dsr',
  'ct.ui.router.extras.future',
  'ct.ui.router.extras.previous',
  'ct.ui.router.extras.statevis',
  'ct.ui.router.extras.transition'
]);

App.run(["$rootScope", "$state", "$stateParams",  '$window', '$templateCache','$location', function ($rootScope, $state, $stateParams, $window, $templateCache, $location) {
  // Set reference to access them from any scope
  $rootScope.$state = $state;
  $rootScope.$stateParams = $stateParams;
  $rootScope.$storage = $window.localStorage;

  // Uncomment this to disable template cache
  /*$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        if (typeof(toState) !== 'undefined'){
          $templateCache.remove(toState.templateUrl);
        }
    });*/

  // Scope Globals
  // -----------------------------------
  $rootScope.app = {
    name: 'Ruteando',
    description: '',
    year: ((new Date()).getFullYear()),
    layout: {
      isFixed: true,
      isCollapsed: false,
      isBoxed: false,
      isRTL: false,
      horizontal: false,
      isFloat: false,
      asideHover: false,
      theme: null
    },
    useFullLayout: false,
    hiddenFooter: false,
    viewAnimation: 'ng-fadeInUp'
  };

  $rootScope.user = {
    name:     'John',
    job:      'ng-developer',
    picture:  'app/img/user/02.jpg'
  };

  $rootScope.$on('$locationChangeSuccess', function() {
    $rootScope.actualLocation = $location.path();
  });

  $rootScope.$watch(function () {return $location.path()}, function (newLocation, oldLocation) {
    $rootScope.locationChange = {
      newState : newLocation,
      oldState : oldLocation
    };

    /*
     console.log("newLocation " + newLocation);
     console.log("oldLocation " + oldLocation);
      if($rootScope.actualLocation === newLocation) {
        alert('Why did you use history back?');
      }*/

  });

}]);
