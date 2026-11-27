import type { TFunction } from '@/lib/i18n/core';

import { type CapacityValues, effectiveVolume } from './capacity-codec';

export type CapacityField =
  'weight' | 'volume' | 'width' | 'height' | 'depth' | 'minWeight' | 'maxWeight' | 'minVolume' | 'maxVolume';
export type CapacityIssues = Partial<Record<CapacityField, string>>;

const FIELDS: readonly CapacityField[] = [
  'weight',
  'volume',
  'width',
  'height',
  'depth',
  'minWeight',
  'maxWeight',
  'minVolume',
  'maxVolume',
];

/** Si la persona ha escrito algo de la capacidad (peso, volumen o medidas): en ese caso hace falta completarla. */
function hasCapacityData(values: CapacityValues): boolean {
  const volumeData =
    values.mode === 'measure'
      ? [values.width, values.height, values.depth].some((v) => v !== null)
      : values.volume !== null;
  return values.weight !== null || volumeData;
}

/**
 * Errores de la capacidad por campo, con las reglas de la aplicación anterior: peso y volumen (o las tres medidas) mayores que 0
 * cuando se indica alguno, y en las restricciones mínimo ≤ máximo ≤ capacidad. La capacidad entera es opcional.
 */
export function capacityIssues(values: CapacityValues, t: TFunction): CapacityIssues {
  const issues: CapacityIssues = {};
  for (const field of FIELDS) {
    const value = values[field];
    if (value !== null && value < 0) issues[field] = t('No puede ser negativo');
  }

  if (hasCapacityData(values)) {
    if (!issues.weight && (values.weight === null || values.weight <= 0))
      issues.weight = t('Indica un peso mayor que 0');
    if (values.mode === 'volume') {
      if (!issues.volume && (values.volume === null || values.volume <= 0)) {
        issues.volume = t('Indica un volumen mayor que 0');
      }
    } else {
      for (const field of ['width', 'height', 'depth'] as const) {
        const value = values[field];
        if (!issues[field] && (value === null || value <= 0)) issues[field] = t('Indica una medida mayor que 0');
      }
    }
  }

  const volume = effectiveVolume(values);
  const { minWeight, maxWeight, minVolume, maxVolume, weight } = values;
  if (!issues.maxWeight && minWeight !== null && maxWeight !== null && maxWeight < minWeight) {
    issues.maxWeight = t('El máximo no puede ser menor que el mínimo');
  }
  if (!issues.maxWeight && weight !== null && weight > 0 && maxWeight !== null && maxWeight > weight) {
    issues.maxWeight = t('El peso máximo no puede superar el peso del vehículo');
  }
  if (!issues.maxVolume && minVolume !== null && maxVolume !== null && maxVolume < minVolume) {
    issues.maxVolume = t('El máximo no puede ser menor que el mínimo');
  }
  if (!issues.maxVolume && volume !== null && volume > 0 && maxVolume !== null && maxVolume > volume) {
    issues.maxVolume = t('El volumen máximo no puede superar el volumen');
  }
  return issues;
}
