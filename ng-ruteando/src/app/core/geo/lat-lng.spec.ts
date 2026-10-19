import { fromGeoJsonPoint, latLng, toGeoJsonPoint, toOlCoordinate } from './lat-lng';

describe('coordenadas de dominio (LatLng)', () => {
  it('convierte el punto GeoJSON del gateway: [lon, lat] -> latitud y longitud', () => {
    expect(fromGeoJsonPoint([-74.07728, 4.60872])).toEqual({ lat: 4.60872, lng: -74.07728 });
  });

  it('convierte hacia el gateway con el tipo Point y el orden [lon, lat]', () => {
    expect(toGeoJsonPoint({ lat: 4.60872, lng: -74.07728 })).toEqual({
      type: 'Point',
      coordinates: [-74.07728, 4.60872],
    });
  });

  it('la ida y la vuelta no alteran la coordenada', () => {
    const original = { lat: 4.60872, lng: -74.07728 };
    expect(fromGeoJsonPoint(toGeoJsonPoint(original)?.coordinates)).toEqual(original);
  });

  it('entrega la coordenada en el orden del mapa: [longitud, latitud]', () => {
    expect(toOlCoordinate({ lat: 4.60872, lng: -74.07728 })).toEqual([-74.07728, 4.60872]);
  });

  describe('validación de rango', () => {
    it('rechaza una latitud fuera de -90..90 sin lanzar excepción', () => {
      expect(fromGeoJsonPoint([-74, 91])).toBeNull();
      expect(fromGeoJsonPoint([-74, -91])).toBeNull();
      expect(toGeoJsonPoint({ lat: 91, lng: 0 })).toBeNull();
      expect(toOlCoordinate({ lat: -91, lng: 0 })).toBeNull();
    });

    it('rechaza una longitud fuera de -180..180', () => {
      expect(fromGeoJsonPoint([181, 4])).toBeNull();
      expect(fromGeoJsonPoint([-181, 4])).toBeNull();
    });

    it('acepta los extremos del rango', () => {
      expect(latLng(90, 180)).toEqual({ lat: 90, lng: 180 });
      expect(latLng(-90, -180)).toEqual({ lat: -90, lng: -180 });
    });

    it('rechaza valores nulos, texto o con menos de dos elementos', () => {
      expect(fromGeoJsonPoint(null)).toBeNull();
      expect(fromGeoJsonPoint(undefined)).toBeNull();
      expect(fromGeoJsonPoint([])).toBeNull();
      expect(fromGeoJsonPoint([-74])).toBeNull();
      expect(fromGeoJsonPoint(['-74', '4'])).toBeNull();
      expect(fromGeoJsonPoint([null, 4])).toBeNull();
      expect(fromGeoJsonPoint([Number.NaN, 4])).toBeNull();
      expect(fromGeoJsonPoint([Infinity, 4])).toBeNull();
    });
  });
});
