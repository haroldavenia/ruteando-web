import { LatLng, latLng } from './lat-lng';

/**
 * Decodifica una polilínea codificada de precisión 5 (orden latitud, longitud), que es el formato del
 * campo `geoJson` de las rutas del gateway (no es GeoJSON). Es tolerante: una cadena vacía o nula
 * da una lista vacía y una cadena truncada o corrupta devuelve los puntos completos hasta ese momento.
 */
export function decodePolyline5(encoded: string | null | undefined): LatLng[] {
  const points: LatLng[] = [];
  if (!encoded) {
    return points;
  }
  let index = 0;
  let lat = 0;
  let lng = 0;

  // Lee un valor con signo; devuelve `null` si la cadena termina a mitad de valor o hay un carácter inválido
  const readValue = (): number | null => {
    let result = 0;
    let shift = 0;
    let chunk: number;
    do {
      if (index >= encoded.length) {
        return null;
      }
      chunk = encoded.charCodeAt(index++) - 63;
      if (chunk < 0 || chunk > 63) {
        return null;
      }
      result += (chunk & 0x1f) * 2 ** shift; // multiplicación en lugar de << para no desbordar 32 bits
      shift += 5;
    } while (chunk >= 0x20);
    return result % 2 === 1 ? -(result + 1) / 2 : result / 2;
  };

  while (index < encoded.length) {
    const dLat = readValue();
    const dLng = dLat === null ? null : readValue();
    if (dLat === null || dLng === null) {
      break;
    }
    lat += dLat;
    lng += dLng;
    const point = latLng(lat / 1e5, lng / 1e5);
    if (!point) {
      break; // fuera de rango: la cadena está corrupta
    }
    points.push(point);
  }
  return points;
}
