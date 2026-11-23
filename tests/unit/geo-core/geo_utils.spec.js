describe('GeoUtils y PolylineCodec (FND-004)', function () {
  var GeoUtils, PolylineCodec;

  beforeEach(module('angle'));
  beforeEach(inject(function (_GeoUtils_, _PolylineCodec_) {
    GeoUtils = _GeoUtils_;
    PolylineCodec = _PolylineCodec_;
  }));

  it('[FND-004 CA-1] convierte GeoJSON Point ↔ {lat,lng} y valida rangos', function () {
    var point = GeoUtils.fromGeoJson({ type: 'Point', coordinates: [-74.07728, 4.60872] });
    expect(point).toEqual({ lat: 4.60872, lng: -74.07728 });
    expect(GeoUtils.toGeoJson(point)).toEqual({ type: 'Point', coordinates: [-74.07728, 4.60872] });
    expect(function () { GeoUtils.fromGeoJson({ type: 'Point', coordinates: [-74, 95] }); }).toThrowError(RangeError);
    expect(function () { GeoUtils.fromGeoJson({ type: 'LineString', coordinates: [] }); }).toThrowError(TypeError);
    expect(function () { GeoUtils.fromLonLat([1]); }).toThrowError(TypeError);
    expect(GeoUtils.fromGeoJson(null)).toBeNull();
    expect(GeoUtils.fromPosition({ latitude: 4.6, longitude: -74.1 })).toEqual({ lat: 4.6, lng: -74.1 });
    expect(GeoUtils.isValid('4', 1)).toBe(false);
  });

  it('[FND-004 CA-2] convierte waypoints [lon,lat] de una jornada a {lat,lng} en rango', function () {
    var place = fixtureBody('get__places__id');
    var waypoint = { coordinates: place.location.coordinates };
    var p = GeoUtils.fromWaypoint(waypoint);
    expect(p.lat).toBeGreaterThan(-90);
    expect(p.lat).toBeLessThan(90);
    expect(p.lng).toBeGreaterThan(-180);
    expect(p.lng).toBeLessThan(180);
    expect(p).toEqual({ lat: 4.60872, lng: -74.07728 });
  });

  it('[FND-004 CA-3] decodifica la polilínea de ejemplo de Google con precisión 5 y 6', function () {
    var points = PolylineCodec.decode('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(points).toEqual([{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }]);
    var encoded6 = PolylineCodec.encode(points, 6);
    expect(PolylineCodec.decode(encoded6, 6)).toEqual(points);
    expect(PolylineCodec.encode(points)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(function () { PolylineCodec.decode('_p~iF~ps|U_', 5); }).toThrow();
    expect(PolylineCodec.decode('', 5)).toEqual([]);
    expect(GeoUtils.line('_p~iF~ps|U_ulLnnqC_mqNvxq`@').length).toBe(3);
    expect(GeoUtils.line({ type: 'LineString', coordinates: [[-74, 4], [-74.1, 4.1]] })).toEqual([{ lat: 4, lng: -74 }, { lat: 4.1, lng: -74.1 }]);
    expect(GeoUtils.line(null)).toEqual([]);
    expect(function () { GeoUtils.line({ type: 'Polygon' }); }).toThrowError(TypeError);
  });

  it('[FND-004 CA-5] proyecta a EPSG:3857 igual que ol.proj.fromLonLat', function () {
    // Valores de referencia de ol.proj.fromLonLat([-74.08, 4.65]) (OpenLayers 3).
    var xy = GeoUtils.toWebMercator({ lat: 4.65, lng: -74.08 });
    expect(xy[0]).toBeCloseTo(-8246547.878, 2);
    expect(xy[1]).toBeCloseTo(518204.812, 2);
    expect(GeoUtils.toWebMercator({ lat: 89, lng: 0 })[1]).toBeCloseTo(GeoUtils.toWebMercator({ lat: 85.0511287798, lng: 0 })[1], 3);
    expect(GeoUtils.toLonLat({ lat: 1, lng: 2 })).toEqual([2, 1]);
  });
});
