/**=========================================================
 * Module: geo_utils.js (FND-004)
 * GeoJSON [lon,lat] ↔ dominio {lat,lng} ↔ EPSG:3857 (OpenLayers 3).
 =========================================================*/
(function () {
  'use strict';

  var EARTH_RADIUS = 6378137;

  App.factory('GeoUtils', ['PolylineCodec', function (PolylineCodec) {

    function valid(lat, lng) {
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    function latLng(lat, lng) {
      if (!valid(lat, lng)) { throw new RangeError('Coordenadas fuera de rango: ' + lat + ', ' + lng); }
      return { lat: lat, lng: lng };
    }

    /** [lon,lat] (GeoJSON, waypoints) → {lat,lng}. */
    function fromLonLat(coordinates) {
      if (!coordinates || coordinates.length < 2) { throw new TypeError('Se esperaba [lon, lat]'); }
      return latLng(coordinates[1], coordinates[0]);
    }

    function toLonLat(point) {
      latLng(point.lat, point.lng);
      return [point.lng, point.lat];
    }

    /** { type:'Point', coordinates:[lon,lat] } → {lat,lng}; null si no hay geometría. */
    function fromGeoJson(geometry) {
      if (geometry === null || geometry === undefined) { return null; }
      if (geometry.type !== 'Point') { throw new TypeError('Se esperaba un GeoJSON Point'); }
      return fromLonLat(geometry.coordinates);
    }

    function toGeoJson(point) {
      return { type: 'Point', coordinates: toLonLat(point) };
    }

    /** Waypoint de jornada: `coordinates` es [lon,lat] sin wrapper. */
    function fromWaypoint(waypoint) {
      return fromLonLat(waypoint.coordinates);
    }

    /** Posición de flota: `longitude`/`latitude` planos. */
    function fromPosition(position) {
      return latLng(position.latitude, position.longitude);
    }

    /** LineString GeoJSON o polilínea codificada → {lat,lng}[]. */
    function line(geometry, precision) {
      if (!geometry) { return []; }
      if (typeof geometry === 'string') { return PolylineCodec.decode(geometry, precision || 5); }
      if (geometry.type === 'LineString') { return geometry.coordinates.map(fromLonLat); }
      throw new TypeError('Geometría de línea no soportada: ' + geometry.type);
    }

    /** {lat,lng} → [x,y] en EPSG:3857, igual que ol.proj.fromLonLat. */
    function toWebMercator(point) {
      latLng(point.lat, point.lng);
      var x = EARTH_RADIUS * point.lng * Math.PI / 180;
      var lat = Math.max(Math.min(point.lat, 85.0511287798), -85.0511287798);
      var y = EARTH_RADIUS * Math.log(Math.tan(Math.PI * (lat + 90) / 360));
      return [x, y];
    }

    return {
      isValid: valid,
      fromLonLat: fromLonLat,
      toLonLat: toLonLat,
      fromGeoJson: fromGeoJson,
      toGeoJson: toGeoJson,
      fromWaypoint: fromWaypoint,
      fromPosition: fromPosition,
      line: line,
      toWebMercator: toWebMercator
    };
  }]);
})();
