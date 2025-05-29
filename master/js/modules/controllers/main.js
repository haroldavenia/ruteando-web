/**=========================================================
 * Module: main.js
 * Main Application Controller
 =========================================================*/

App.controller('AppController',
               ['$rootScope',
               '$scope',
               '$state',
               '$translate',
               '$window',
               '$localStorage',
               '$timeout',
               'toggleStateService',
               'colors',
               'browser',
               'cfpLoadingBar',
               'oauthHttp',
               'resincTknRefresh',
               'tokenStorage',
               'loadingStatus',
               'tempStorageData',
                function($rootScope, $scope, $state, $translate, $window, $localStorage, $timeout, toggle, colors, browser, cfpLoadingBar, oauthHttp, resincTknRefresh, tokenStorage, loadingStatus, tempStorageData) {
                  "use strict";

                  if(typeof $rootScope.$stateParams.tknrefresh === "undefined" || typeof $rootScope.$stateParams.tknrefresh === ""){
                    console.log($rootScope.$stateParams.tknrefresh);
                  }else{
                    if((!tokenStorage.get() && !tokenStorage.getRefreshToken()) && ($rootScope.$stateParams.tknrefresh !== undefined || $rootScope.$stateParams.tknrefresh != "" )){
                      tokenStorage.setRefreshToken($rootScope.$stateParams.tknrefresh);
                      $rootScope.$stateParams.tknrefresh = undefined;
                    }
                  }

                  var resincTKn = new resincTknRefresh(
                    //success
                    function(){
                      gestionarFlowResync();
                    },
                    //fail
                    function(){
                      $state.go('access.login');
                    }
                  );

                  function gestionarFlowResync(){
                    var stateToGo = 'app.home';

                    if($rootScope.locationChange.newState !='/access/login'){
                      var new_state = $rootScope.locationChange.newState;

                      if(new_state == '/app/itinerary/list' && tempStorageData.data.cachedJourney === undefined){
                        stateToGo = 'app.journeys.add';
                      }else if(new_state == '/app/maps/route' && tempStorageData.data.journeyRoutes === undefined){
                        stateToGo = 'app.routes.list';
                      }else if(new_state == '/app/assignedServices/add' && tempStorageData.data.journeyRoutes === undefined){
                        stateToGo = 'app.routes.list';
                      }else if(new_state == '/app/routes/detail' && tempStorageData.data.journeyRoutes === undefined){
                        stateToGo = 'app.routes.list';
                      }else if(new_state == '/app/visits/list' && tempStorageData.data.journeyRoutes === undefined){
                        stateToGo = 'app.routes.list';
                      }else {
                        stateToGo = cleanStateToGo(new_state);
                      }
                    }
                    $state.go(stateToGo);
                  }

                  function cleanStateToGo(new_state)
                  {
                    var stateToGo = new_state.split('/').join('.');
                    if(stateToGo.charAt(0)=='.'){
                      stateToGo = stateToGo.slice(1);
                    }
                    if(stateToGo.charAt(stateToGo.length-1)=='.'){
                      stateToGo = stateToGo.slice(0,-1);
                    }
                    return stateToGo;
                  }

                  $rootScope.$on('refresh_token', function(event, param) {
                    var _oauthHttp = new oauthHttp(param);
                    _oauthHttp.$refreshToken(function(token) {
                      tokenStorage.set(token);
                    }, function(faild) {
                      console.log("refresh_token : faild");
                      console.log(faild);
                    });
                  })



                  // Setup the layout mode
                  $rootScope.app.layout.horizontal = ( $rootScope.$stateParams.layout == 'app-h') ;

                  // Loading bar transition
                  // -------------------------v----------
                  var thBar;
                  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
                    if($('.wrapper > section').length) // check if bar container exists
                      thBar = $timeout(function() {
                        cfpLoadingBar.start();
                      }, 0); // sets a latency Threshold
                    console.log("$stateChangeStart");
                    console.log("toState");
                    console.log(toState);
                    console.log("toParams");
                    console.log(toParams);
                    console.log("fromState");
                    console.log(fromState);
                    console.log("fromParams");
                    console.log(fromParams);
                  });
                  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
                    event.targetScope.$watch("$viewContentLoaded", function () {
                      $timeout.cancel(thBar);
                      cfpLoadingBar.complete();
                    });

                    console.log("$stateChangeSuccess");
                    console.log("toState");
                    console.log(toState);
                    console.log("toParams");
                    console.log(toParams);
                    console.log("fromState");
                    console.log(fromState);
                    console.log("fromParams");
                    console.log(fromParams);

                    $rootScope.app.showingMap = (toState.name.indexOf('maps') != -1) ? true : false;
                  });


                  // Hook not found
                  $rootScope.$on('$stateNotFound',
                                 function(event, unfoundState, fromState, fromParams) {
                    console.log(unfoundState.to); // "lazy.state"
                    console.log(unfoundState.toParams); // {a:1, b:2}
                    console.log(unfoundState.options); // {inherit:false} + default options
                  });
                  // Hook error
                  $rootScope.$on('$stateChangeError',
                                 function(event, toState, toParams, fromState, fromParams, error){
                    console.log(error);
                  });
                  // Hook success
                  $rootScope.$on('$stateChangeSuccess',
                                 function(event, toState, toParams, fromState, fromParams) {
                    // display new view from top
                    $window.scrollTo(0, 0);
                    // Save the route title
                    $rootScope.currTitle = $state.current.title;
                  });

                  $rootScope.currTitle = $state.current.title;
                  $rootScope.pageTitle = function() {
                    var title = $rootScope.app.name + ' - ' + ($rootScope.currTitle || $rootScope.app.description);
                    document.title = title;
                    return title;
                  };

                  // iPad may presents ghost click issues
                  // if( ! browser.ipad )
                  // FastClick.attach(document.body);

                  // Close submenu when sidebar change from collapsed to normal
                  $rootScope.$watch('app.layout.isCollapsed', function(newValue, oldValue) {
                    if( newValue === false )
                      $rootScope.$broadcast('closeSidebarMenu');
                  });

                  // Restore layout settings
                  if( angular.isDefined($localStorage.layout) )
                    $scope.app.layout = $localStorage.layout;
                  else
                    $localStorage.layout = $scope.app.layout;

                  $rootScope.$watch("app.layout", function () {
                    $localStorage.layout = $scope.app.layout;
                  }, true);


                  // Allows to use branding color with interpolation
                  // {{ colorByName('primary') }}
                  $scope.colorByName = colors.byName;

                  // Internationalization
                  // ----------------------

                  $scope.language = {
                    // Handles language dropdown
                    listIsOpen: false,
                    // list of available languages
                    available: {
                      'en':       'English',
                      'es':    'Español'
                    },
                    // display always the current ui language
                    init: function () {
                      var proposedLanguage = $translate.proposedLanguage() || $translate.use();
                      var preferredLanguage = $translate.preferredLanguage(); // we know we have set a preferred one in app.config
                      $scope.language.selected = $scope.language.available[ (proposedLanguage || preferredLanguage) ];
                    },
                    set: function (localeId, ev) {
                      // Set the new idiom
                      $translate.use(localeId);
                      // save a reference for the current language
                      $scope.language.selected = $scope.language.available[localeId];
                      // finally toggle dropdown
                      $scope.language.listIsOpen = ! $scope.language.listIsOpen;
                    }
                  };

                  $scope.language.init();

                  // Restore application classes state
                  toggle.restoreState( $(document.body) );

                  // cancel click event easily
                  $rootScope.cancel = function($event) {
                    $event.stopPropagation();
                  };

                }]);
