import { decodePolyline5 } from './polyline';

// Primeros puntos de la geometría real de una ruta planificada en Bogotá (campo `geoJson` del gateway)
const BOGOTA = 'olc[tedcMfBtAy@rA'; // 3 puntos completos

describe('decodePolyline5', () => {
  it('decodifica el tramo real de Bogotá: el primer punto está cerca de 4.61, -74.08', () => {
    const points = decodePolyline5(BOGOTA);

    expect(points.length).toBe(3);
    expect(points[0].lat).toBeCloseTo(4.61016, 5);
    expect(points[0].lng).toBeCloseTo(-74.08235, 5);
    expect(points[1].lat).toBeCloseTo(4.60964, 5);
    expect(points[1].lng).toBeCloseTo(-74.08278, 5);
    expect(points[2].lat).toBeCloseTo(4.60993, 5);
    expect(points[2].lng).toBeCloseTo(-74.0832, 5);
  });

  it('el orden es latitud, longitud (con precisión 6 caería fuera de Colombia)', () => {
    for (const point of decodePolyline5(BOGOTA)) {
      expect(point.lat).toBeGreaterThan(4);
      expect(point.lat).toBeLessThan(5);
      expect(point.lng).toBeGreaterThan(-75);
      expect(point.lng).toBeLessThan(-74);
    }
  });

  it('decodifica el ejemplo clásico de la documentación de polilíneas', () => {
    const points = decodePolyline5('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    expect(points.length).toBe(3);
    expect(points[0]).toEqual({ lat: 38.5, lng: -120.2 });
    expect(points[1]).toEqual({ lat: 40.7, lng: -120.95 });
    expect(points[2]).toEqual({ lat: 43.252, lng: -126.453 });
  });

  it('una geometría vacía o nula da una lista vacía sin lanzar excepción', () => {
    expect(decodePolyline5('')).toEqual([]);
    expect(decodePolyline5(null)).toEqual([]);
    expect(decodePolyline5(undefined)).toEqual([]);
  });

  it('una cadena truncada a mitad de un valor devuelve los puntos completos anteriores', () => {
    const completos = decodePolyline5(BOGOTA);
    const truncada = decodePolyline5(BOGOTA.slice(0, 16)); // el tercer punto queda cortado a mitad de valor

    expect(truncada).toEqual(completos.slice(0, 2));
    expect(decodePolyline5('olc[tedc')).toEqual([]); // ni siquiera completa el primer punto
  });

  it('un carácter inválido detiene la decodificación sin lanzar excepción', () => {
    const puntos = decodePolyline5(BOGOTA.slice(0, 12) + ' ' + BOGOTA.slice(12)); // el espacio cae dentro del segundo punto

    expect(puntos.length).toBe(1);
  });

  it('decodifica una ruta larga sin desbordar (miles de puntos)', () => {
    // Genera una polilínea de 5000 puntos con un codificador mínimo y comprueba la ida y vuelta
    const encodeValue = (value: number): string => {
      let v = value < 0 ? ~(value << 1) : value << 1;
      let out = '';
      while (v >= 0x20) {
        out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
      }
      return out + String.fromCharCode(v + 63);
    };
    let encoded = '';
    let prevLat = 0;
    let prevLng = 0;
    const expected: { lat: number; lng: number }[] = [];
    for (let i = 0; i < 5000; i++) {
      const lat = Math.round((4.5 + i * 0.00002) * 1e5);
      const lng = Math.round((-74.2 + i * 0.00003) * 1e5);
      encoded += encodeValue(lat - prevLat) + encodeValue(lng - prevLng);
      prevLat = lat;
      prevLng = lng;
      expected.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    expect(decodePolyline5(encoded)).toEqual(expected);
  });
});
