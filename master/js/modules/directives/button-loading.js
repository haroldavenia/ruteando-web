'use strict';

App.directive('buttonLoading', function () {
    return {
      restrict: 'C',
      scope : {
        loading : '=loadingStatus'
      },
      link: function postLink(scope, element, attrs) {
        
        element.bind('click', function() {
          (scope.loading) ? element.button('loading') : element.button('reset') ;
        })

        scope.$watch('loading', function() {
          (scope.loading) ? element.button('loading') : element.button('reset') ;
        });
      }
    };
  });
