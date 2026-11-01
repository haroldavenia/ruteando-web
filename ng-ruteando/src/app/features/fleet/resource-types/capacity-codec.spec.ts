import { CapacityValues, EMPTY_CAPACITY, WEIGHT_UNITS_PER_KG, decodeCapacity, effectiveVolume, encodeCapacity, mergeOpaque, volumeOfMeasures } from './capacity-codec';

// Estas pruebas fijan la HIPÓTESIS de almacenamiento (peso en kg, volumen en cm³, medidas en cm; ver capacity-codec.ts): el gateway real
// nunca devolvió valores. Si la comprobación con el gateway dice otra cosa, se corrige la constante y estas cifras.
describe('capacity-codec', () => {
  const volumeMode: CapacityValues = { ...EMPTY_CAPACITY, weight: 500, volume: 12_000_000, minWeight: 20, maxWeight: 480, minVolume: 1_000, maxVolume: 11_000_000 };
  const measureMode: CapacityValues = { ...EMPTY_CAPACITY, mode: 'measure', weight: 1200, width: 180, height: 170, depth: 260 };

  it('la hipótesis de partida guarda el peso en kg', () => {
    expect(WEIGHT_UNITS_PER_KG).toBe(1);
  });

  describe('mergeOpaque', () => {
    it('conserva las claves que no conoce y sobrescribe las editadas', () => {
      expect(mergeOpaque({ weight: 1, cooled: true }, { weight: 2000, volume: 5 })).toEqual({ weight: 2000, volume: 5, cooled: true });
    });

    it('quita solo la clave de un valor vacío', () => {
      expect(mergeOpaque({ weight: 1, volume: 2, cooled: true }, { weight: null })).toEqual({ volume: 2, cooled: true });
    });

    it('devuelve null si se queda sin claves', () => {
      expect(mergeOpaque({ weight: 1 }, { weight: null })).toBeNull();
      expect(mergeOpaque(null, { weight: null, volume: null })).toBeNull();
    });

    it('no modifica el objeto actual', () => {
      const current = { weight: 1 };
      mergeOpaque(current, { weight: 9 });
      expect(current).toEqual({ weight: 1 });
    });

    it('un valor 0 se guarda: no es «sin dato»', () => {
      expect(mergeOpaque(null, { minWeight: 0 })).toEqual({ minWeight: 0 });
    });
  });

  describe('decodeCapacity', () => {
    it('sin tipo o con estructuras nulas da una capacidad vacía en modo volumen', () => {
      expect(decodeCapacity(null)).toEqual(EMPTY_CAPACITY);
      expect(decodeCapacity({ capacity: null, measure: null, restriction: null })).toEqual(EMPTY_CAPACITY);
    });

    it('lee el peso en kg y el volumen en cm³ tal como vienen', () => {
      const values = decodeCapacity({
        capacity: { weight: 500, volume: 12_000_000 },
        measure: null,
        restriction: { minWeight: 20, maxWeight: 480, minVolume: 1_000, maxVolume: 11_000_000 },
      });
      expect(values).toEqual(volumeMode);
    });

    it('deduce el modo medidas si hay alto, ancho y profundidad mayores que 0', () => {
      const values = decodeCapacity({ capacity: { weight: 1200, volume: 7_956_000 }, measure: { width: 180, height: 170, depth: 260 }, restriction: null });
      expect(values.mode).toBe('measure');
      expect(values).toEqual({ ...measureMode, volume: 7_956_000 });
    });

    it('con medidas a 0 (como las guardaba la app anterior) el modo es volumen', () => {
      const values = decodeCapacity({ capacity: { weight: 1, volume: 90 }, measure: { width: 0, height: 0, depth: 0 }, restriction: null });
      expect(values.mode).toBe('volume');
      expect(values.width).toBeNull();
    });

    it('ignora valores que no son números', () => {
      const values = decodeCapacity({ capacity: { weight: '500', volume: null }, measure: null, restriction: { minWeight: NaN } });
      expect(values.weight).toBeNull();
      expect(values.volume).toBeNull();
      expect(values.minWeight).toBeNull();
    });

    it('redondea los kg a tres decimales', () => {
      expect(decodeCapacity({ capacity: { weight: 500.5551 }, measure: null, restriction: null }).weight).toBe(500.555);
    });
  });

  describe('encodeCapacity', () => {
    it('envía el peso en kg y el volumen en cm³', () => {
      expect(encodeCapacity(volumeMode, null)).toEqual({
        capacity: { weight: 500, volume: 12_000_000 },
        measure: null,
        restriction: { minWeight: 20, maxWeight: 480, minVolume: 1_000, maxVolume: 11_000_000 },
      });
    });

    it('en modo medidas el volumen es el producto de las tres medidas', () => {
      const encoded = encodeCapacity(measureMode, null);
      expect(encoded.measure).toEqual({ width: 180, height: 170, depth: 260 });
      expect(encoded.capacity).toEqual({ weight: 1200, volume: 7_956_000 });
    });

    it('conserva los decimales del peso', () => {
      expect(encodeCapacity({ ...volumeMode, weight: 25.5 }, null).capacity).toEqual({ weight: 25.5, volume: 12_000_000 });
    });

    it('al pasar a modo volumen quita las medidas pero conserva las claves ajenas', () => {
      const current = { capacity: null, measure: { width: 1, height: 2, depth: 3, unit: 'cm' }, restriction: null };
      expect(encodeCapacity(volumeMode, current).measure).toEqual({ unit: 'cm' });
    });

    it('conserva las claves desconocidas de las tres estructuras', () => {
      const current = { capacity: { weight: 1, volume: 2, cooled: true }, measure: null, restriction: { note: 'x' } };
      const encoded = encodeCapacity(volumeMode, current);
      expect(encoded.capacity).toEqual({ weight: 500, volume: 12_000_000, cooled: true });
      expect(encoded.restriction).toEqual({ note: 'x', minWeight: 20, maxWeight: 480, minVolume: 1_000, maxVolume: 11_000_000 });
    });

    it('una capacidad vacía quita las claves conocidas y deja el resto', () => {
      const current = { capacity: { weight: 1, volume: 2, cooled: true }, measure: { width: 1, height: 1, depth: 1 }, restriction: { minWeight: 1 } };
      expect(encodeCapacity(EMPTY_CAPACITY, current)).toEqual({ capacity: { cooled: true }, measure: null, restriction: null });
    });

    it('ida y vuelta conserva los valores', () => {
      const encoded = encodeCapacity(volumeMode, null);
      expect(decodeCapacity({ capacity: encoded.capacity, measure: encoded.measure, restriction: encoded.restriction })).toEqual(volumeMode);
    });
  });

  describe('volumen', () => {
    it('volumeOfMeasures es null si falta una medida o es 0', () => {
      expect(volumeOfMeasures({ width: 2, height: 3, depth: 4 })).toBe(24);
      expect(volumeOfMeasures({ width: 2, height: null, depth: 4 })).toBeNull();
      expect(volumeOfMeasures({ width: 2, height: 0, depth: 4 })).toBeNull();
    });

    it('effectiveVolume usa el producto en modo medidas y el escrito en modo volumen', () => {
      expect(effectiveVolume({ ...measureMode, volume: 1 })).toBe(7_956_000);
      expect(effectiveVolume(volumeMode)).toBe(12_000_000);
    });
  });
});
