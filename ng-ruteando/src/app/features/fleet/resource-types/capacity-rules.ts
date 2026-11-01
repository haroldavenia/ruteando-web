import { CapacityValues, effectiveVolume } from './capacity-codec';

export type CapacityField = 'weight' | 'volume' | 'width' | 'height' | 'depth' | 'minWeight' | 'maxWeight' | 'minVolume' | 'maxVolume';
export type CapacityIssues = Partial<Record<CapacityField, string>>;

const FIELDS: readonly CapacityField[] = ['weight', 'volume', 'width', 'height', 'depth', 'minWeight', 'maxWeight', 'minVolume', 'maxVolume'];

export const CAPACITY_MESSAGES = {
  negative: 'No puede ser negativo',
  weight: 'Indica un peso mayor que 0',
  volume: 'Indica un volumen mayor que 0',
  measure: 'Indica una medida mayor que 0',
  maxBelowMin: 'El máximo no puede ser menor que el mínimo',
  maxWeightAbove: 'El peso máximo no puede superar el peso del vehículo',
  maxVolumeAbove: 'El volumen máximo no puede superar el volumen',
} as const;

/** Si la persona ha escrito algo de la capacidad (peso, volumen o medidas): en ese caso hace falta completarla. */
function hasCapacityData(values: CapacityValues): boolean {
  const volumeData = values.mode === 'measure' ? [values.width, values.height, values.depth].some((v) => v !== null) : values.volume !== null;
  return values.weight !== null || volumeData;
}

/**
 * Errores de la capacidad por campo, con las reglas de la aplicación anterior: peso y volumen (o las tres medidas) mayores que 0
 * cuando se indica alguno, y en las restricciones mínimo ≤ máximo ≤ capacidad. La capacidad entera es opcional.
 */
export function capacityIssues(values: CapacityValues): CapacityIssues {
  const issues: CapacityIssues = {};
  for (const field of FIELDS) {
    const value = values[field];
    if (value !== null && value < 0) {
      issues[field] = CAPACITY_MESSAGES.negative;
    }
  }

  if (hasCapacityData(values)) {
    if (!issues.weight && (values.weight === null || values.weight <= 0)) {
      issues.weight = CAPACITY_MESSAGES.weight;
    }
    if (values.mode === 'volume') {
      if (!issues.volume && (values.volume === null || values.volume <= 0)) {
        issues.volume = CAPACITY_MESSAGES.volume;
      }
    } else {
      for (const field of ['width', 'height', 'depth'] as const) {
        const value = values[field];
        if (!issues[field] && (value === null || value <= 0)) {
          issues[field] = CAPACITY_MESSAGES.measure;
        }
      }
    }
  }

  const volume = effectiveVolume(values);
  if (!issues.maxWeight && values.minWeight !== null && values.maxWeight !== null && values.maxWeight < values.minWeight) {
    issues.maxWeight = CAPACITY_MESSAGES.maxBelowMin;
  }
  if (!issues.maxWeight && values.weight !== null && values.weight > 0 && values.maxWeight !== null && values.maxWeight > values.weight) {
    issues.maxWeight = CAPACITY_MESSAGES.maxWeightAbove;
  }
  if (!issues.maxVolume && values.minVolume !== null && values.maxVolume !== null && values.maxVolume < values.minVolume) {
    issues.maxVolume = CAPACITY_MESSAGES.maxBelowMin;
  }
  if (!issues.maxVolume && volume !== null && volume > 0 && values.maxVolume !== null && values.maxVolume > volume) {
    issues.maxVolume = CAPACITY_MESSAGES.maxVolumeAbove;
  }
  return issues;
}
