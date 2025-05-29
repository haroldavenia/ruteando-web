App.directive('keyboardPoster', function($parse) {

  var DELAY_TIME_BEFORE_POSTING = 2000;

  return function(scope, elem, attrs) {
    var element = angular.element(elem)[0];
    var currentTimeout = null;
    
    element.onsearch = function() {
      var model = $parse(attrs.postFunction);
      var poster = model(scope);
    }
  }
})