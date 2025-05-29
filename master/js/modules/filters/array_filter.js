'use strict';

App.filter('arrayFilter', function () {

   return function (array, expression) {
     var result = [];
     var isValid = true;

    function isValidItem(e, itemArray) {
      var result = false;
            if (e.key.charAt(0) == '$') {
          		for (var objKey in itemArray) {
                  if (e.precision) {
                  	if (itemArray[objKey] == e.value) {
                      result = true;
                      break;
                    }
                  } else {
                    var text = ('' + itemArray[objKey]).toLowerCase();
                    if (('' + text).toLowerCase().indexOf(('' + e.value).toLowerCase()) !== -1) {
                      result = true;
                      break;
                    }
                }
             	}
            } else if (angular.isArray(e.value)) {
              var text = ('' + itemArray[e.key]).toLowerCase();
              for (var i = 0; i < e.value.length; i++) {
              	if (e.precision) {
                  if (itemArray[e.key] == e.value[i]) {
                    result = true;
                    break;
                  }
              	} else {
                  if (('' + text).toLowerCase().indexOf(('' + e.value[i]).toLowerCase()) !== -1) {
                    result = true;
                    break;
                  }
              	}
              }
            } else {
            	if (e.precision) {
                  if (itemArray[e.key] == e.value) {
                    result = true;
                  } 
            	}else {
                 var text = ('' + itemArray[e.key]).toLowerCase();
                 if (('' + text).toLowerCase().indexOf(('' + e.value).toLowerCase()) !== -1) {
                  result = true;
                 }
            	}
            }
           return result;
    }


     for (var i = 0; i < array.length; i++) {
        isValid = true;
        for (var e in expression) {
          (expression[e].value !== undefined && expression[e].value !== '' && isValid) ? 
          	isValid = isValidItem(expression[e], array[i]): null;
        }
        (isValid) ? result.push(array[i]): null;
      }
     	return result; 
    };
  });
