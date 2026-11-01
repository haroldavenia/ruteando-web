import { CapacityValues, EMPTY_CAPACITY } from './capacity-codec';
import { CAPACITY_MESSAGES, capacityIssues } from './capacity-rules';

describe('capacity-rules', () => {
  const valid: CapacityValues = { ...EMPTY_CAPACITY, weight: 500, volume: 12_000_000, minWeight: 20, maxWeight: 500, minVolume: 1_000, maxVolume: 12_000_000 };

  it('una capacidad vacía es válida: es opcional', () => {
    expect(capacityIssues(EMPTY_CAPACITY)).toEqual({});
    expect(capacityIssues({ ...EMPTY_CAPACITY, mode: 'measure' })).toEqual({});
  });

  it('una capacidad completa con restricciones coherentes es válida, también en los límites (igualdad)', () => {
    expect(capacityIssues(valid)).toEqual({});
  });

  it('un peso sin volumen pide el volumen', () => {
    expect(capacityIssues({ ...EMPTY_CAPACITY, weight: 10 })).toEqual({ volume: CAPACITY_MESSAGES.volume });
  });

  it('un volumen sin peso pide el peso', () => {
    expect(capacityIssues({ ...EMPTY_CAPACITY, volume: 10 })).toEqual({ weight: CAPACITY_MESSAGES.weight });
  });

  it('un peso o un volumen de 0 no valen', () => {
    expect(capacityIssues({ ...EMPTY_CAPACITY, weight: 0, volume: 0 })).toEqual({ weight: CAPACITY_MESSAGES.weight, volume: CAPACITY_MESSAGES.volume });
  });

  it('en modo medidas cada medida que falta o es 0 se señala', () => {
    const issues = capacityIssues({ ...EMPTY_CAPACITY, mode: 'measure', weight: 10, width: 5, height: null, depth: 0 });
    expect(issues).toEqual({ height: CAPACITY_MESSAGES.measure, depth: CAPACITY_MESSAGES.measure });
  });

  it('en modo medidas no se pide el volumen escrito', () => {
    expect(capacityIssues({ ...EMPTY_CAPACITY, mode: 'measure', weight: 10, width: 5, height: 5, depth: 5 })).toEqual({});
  });

  it('los valores negativos se señalan en su campo', () => {
    const issues = capacityIssues({ ...valid, minWeight: -1, maxVolume: -5 });
    expect(issues.minWeight).toBe(CAPACITY_MESSAGES.negative);
    expect(issues.maxVolume).toBe(CAPACITY_MESSAGES.negative);
  });

  describe('restricciones', () => {
    it('un peso máximo menor que el mínimo se señala en el máximo', () => {
      expect(capacityIssues({ ...valid, minWeight: 400, maxWeight: 300 })).toEqual({ maxWeight: CAPACITY_MESSAGES.maxBelowMin });
    });

    it('un volumen máximo menor que el mínimo se señala en el máximo', () => {
      expect(capacityIssues({ ...valid, minVolume: 5_000, maxVolume: 4_000 })).toEqual({ maxVolume: CAPACITY_MESSAGES.maxBelowMin });
    });

    it('un peso máximo mayor que el peso del vehículo se señala', () => {
      expect(capacityIssues({ ...valid, maxWeight: 501 })).toEqual({ maxWeight: CAPACITY_MESSAGES.maxWeightAbove });
    });

    it('un volumen máximo mayor que el volumen se señala, también en modo medidas con el volumen calculado', () => {
      expect(capacityIssues({ ...valid, maxVolume: 12_000_001 })).toEqual({ maxVolume: CAPACITY_MESSAGES.maxVolumeAbove });
      const measured: CapacityValues = { ...EMPTY_CAPACITY, mode: 'measure', weight: 10, width: 10, height: 10, depth: 10, maxVolume: 1_001 };
      expect(capacityIssues(measured)).toEqual({ maxVolume: CAPACITY_MESSAGES.maxVolumeAbove });
    });

    it('sin capacidad no se compara el máximo con nada', () => {
      expect(capacityIssues({ ...EMPTY_CAPACITY, maxWeight: 9_999, maxVolume: 9_999_999 })).toEqual({});
    });
  });
});
