App.factory('Decoder', [function () {
  
  function decode(encoded) {
    // array that holds the points
      encoded = encoded.replace(/\\\\/g, '\\');
      var browser = window.navigator.vendor;
      /*if (browser.search("Google") == 0 || browser.search("Opera") == 0)
       {
       encoded = encoded.replace(/\\\\/g, '\\');
       } 
       else if(window.navigator.appCodeName==="Mozilla")
       {
       encoded = encoded.replace(/\\\\/g, '\\');
       }*/

      var points = [];
      var index = 0, len = encoded.length;
      var lat = 0, lng = 0;
      while (index < len) {
          var b, shift = 0, result = 0;
          do {

              b = encoded.charAt(index++).charCodeAt(0) - 63; //finds ascii and substract it by 63
              result |= (b & 0x1f) << shift;
              shift += 5;
          } while (b >= 0x20);
          var dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
          lat += dlat;
          shift = 0;
          result = 0;
          do {
              b = encoded.charAt(index++).charCodeAt(0) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
          } while (b >= 0x20);
          var dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
          lng += dlng;
          //change here 1E5 --> 1E6
          points.push({latitude: (lat / 1E6), longitude: (lng / 1E6)})
      }
      return points;
  };

  function decodePaths (arrayPath) {
    var pathDecodes = [];
    if(angular.isArray(arrayPath)){
      angular.forEach(arrayPath, function(path){
        this.push(decode(path));
      }, pathDecodes);
    }

    return pathDecodes;
  }

  return {
    decodePoints : decode,
    decodePaths : decodePaths
  };
}])