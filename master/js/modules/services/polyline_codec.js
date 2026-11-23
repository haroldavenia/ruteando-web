/**=========================================================
 * Module: polyline_codec.js (FND-004)
 * Polilíneas codificadas (precisión 5 de Google/OSRM o 6 de OSRM polyline6) ↔ {lat,lng}[].
 =========================================================*/
(function () {
  'use strict';

  App.factory('PolylineCodec', [function () {

    function decode(str, precision) {
      var factor = Math.pow(10, precision || 5);
      var points = [];
      var index = 0;
      var lat = 0;
      var lng = 0;

      function next() {
        var result = 0;
        var shift = 0;
        var byte;
        do {
          if (index >= str.length) { throw new Error('Polilínea truncada'); }
          byte = str.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);
        return (result & 1) ? ~(result >> 1) : (result >> 1);
      }

      while (index < str.length) {
        lat += next();
        lng += next();
        points.push({ lat: lat / factor, lng: lng / factor });
      }
      return points;
    }

    function encodeValue(value) {
      value = value < 0 ? ~(value << 1) : (value << 1);
      var out = '';
      while (value >= 0x20) {
        out += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
        value >>= 5;
      }
      return out + String.fromCharCode(value + 63);
    }

    function encode(points, precision) {
      var factor = Math.pow(10, precision || 5);
      var lastLat = 0;
      var lastLng = 0;
      return points.map(function (p) {
        var lat = Math.round(p.lat * factor);
        var lng = Math.round(p.lng * factor);
        var chunk = encodeValue(lat - lastLat) + encodeValue(lng - lastLng);
        lastLat = lat;
        lastLng = lng;
        return chunk;
      }).join('');
    }

    return { decode: decode, encode: encode };
  }]);
})();
