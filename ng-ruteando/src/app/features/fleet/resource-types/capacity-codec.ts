import { ResourceType } from '../../../core/api/models';

/**
 * Capacidad de un tipo de vehículo entre la pantalla y el gateway.
 *
 * HIPÓTESIS, SIN VERIFICAR contra el gateway real (todas las capturas traen `capacity`, `measure` y `restriction` en `null`):
 *   - `capacity    = { weight, volume }`                              peso en kg y volumen en cm³
 *   - `measure     = { height, width, depth }`                        en cm
 *   - `restriction = { minWeight, minVolume, maxWeight, maxVolume }`  en kg y cm³
 * Los nombres de clave vienen de la aplicación AngularJS anterior, que el gateway probablemente heredó. Las unidades, de la configuración
 * del tenant en la colección Postman: `config { defaultWeightUnit: "kg", defaultVolumeUnit: "cm3" }` (la aplicación anterior guardaba el
 * peso en gramos, pero el gateway declara kg). La pantalla trabaja en kg, cm³ y cm. Si la comprobación con el gateway real dice otra
 * cosa, todo el cambio está en este archivo y en su prueba: la constante de unidad y los nombres de clave de abajo.
 */
export const WEIGHT_UNITS_PER_KG = 1;
export const CM3_PER_M3 = 1_000_000;

export type CapacityMode = 'volume' | 'measure';

/** Valores tal como los edita la persona: kg, cm³ y cm. `null` es «sin dato». */
export interface CapacityValues {
  mode: CapacityMode;
  /** kg */
  weight: number | null;
  /** cm³ (en modo medidas es el producto de las tres medidas) */
  volume: number | null;
  /** cm */
  width: number | null;
  height: number | null;
  depth: number | null;
  /** kg */
  minWeight: number | null;
  maxWeight: number | null;
  /** cm³ */
  minVolume: number | null;
  maxVolume: number | null;
}

type Opaque = Record<string, unknown> | null;
export type CapacitySource = Pick<ResourceType, 'capacity' | 'measure' | 'restriction'>;

export const EMPTY_CAPACITY: CapacityValues = {
  mode: 'volume',
  weight: null,
  volume: null,
  width: null,
  height: null,
  depth: null,
  minWeight: null,
  maxWeight: null,
  minVolume: null,
  maxVolume: null,
};

function numberAt(source: Opaque, key: string): number | null {
  const value = source?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const fromStoredWeight = (stored: number | null): number | null => (stored === null ? null : round(stored / WEIGHT_UNITS_PER_KG));
const toStoredWeight = (kg: number | null): number | null => (kg === null ? null : round(kg * WEIGHT_UNITS_PER_KG));

/** Volumen en cm³ de unas medidas, o `null` si falta alguna o no es mayor que 0. */
export function volumeOfMeasures(measures: Pick<CapacityValues, 'width' | 'height' | 'depth'>): number | null {
  const { width, height, depth } = measures;
  return width !== null && height !== null && depth !== null && width > 0 && height > 0 && depth > 0 ? round(width * height * depth) : null;
}

/** El volumen que vale de verdad: el producto de las medidas en modo medidas, el escrito en modo volumen. */
export function effectiveVolume(values: CapacityValues): number | null {
  return values.mode === 'measure' ? volumeOfMeasures(values) : values.volume;
}

/** Lee la capacidad de un tipo; el modo es «medidas» si trae alto, ancho y profundidad mayores que 0 (no se guarda aparte). */
export function decodeCapacity(source: CapacitySource | null): CapacityValues {
  if (!source) {
    return EMPTY_CAPACITY;
  }
  const width = numberAt(source.measure, 'width');
  const height = numberAt(source.measure, 'height');
  const depth = numberAt(source.measure, 'depth');
  const hasMeasures = volumeOfMeasures({ width, height, depth }) !== null;
  return {
    mode: hasMeasures ? 'measure' : 'volume',
    weight: fromStoredWeight(numberAt(source.capacity, 'weight')),
    volume: numberAt(source.capacity, 'volume'),
    width: hasMeasures ? width : null,
    height: hasMeasures ? height : null,
    depth: hasMeasures ? depth : null,
    minWeight: fromStoredWeight(numberAt(source.restriction, 'minWeight')),
    maxWeight: fromStoredWeight(numberAt(source.restriction, 'maxWeight')),
    minVolume: numberAt(source.restriction, 'minVolume'),
    maxVolume: numberAt(source.restriction, 'maxVolume'),
  };
}

/**
 * Parte del objeto que trajo el gateway y sobrescribe solo las claves de `edited`; un valor `null` quita esa clave. Las claves que la
 * pantalla no conoce se conservan. Un objeto que se queda sin claves es `null`.
 */
export function mergeOpaque(current: Opaque, edited: Readonly<Record<string, number | null>>): Opaque {
  const result: Record<string, unknown> = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(edited)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export interface EncodedCapacity {
  capacity: Opaque;
  measure: Opaque;
  restriction: Opaque;
}

/** Las tres estructuras que se envían: el registro actual (si lo hay) con los valores editados encima. */
export function encodeCapacity(values: CapacityValues, current: CapacitySource | null): EncodedCapacity {
  const measured = values.mode === 'measure';
  return {
    capacity: mergeOpaque(current?.capacity ?? null, { weight: toStoredWeight(values.weight), volume: effectiveVolume(values) }),
    // En modo volumen se quitan las medidas que hubiera
    measure: mergeOpaque(current?.measure ?? null, {
      width: measured ? values.width : null,
      height: measured ? values.height : null,
      depth: measured ? values.depth : null,
    }),
    restriction: mergeOpaque(current?.restriction ?? null, {
      minWeight: toStoredWeight(values.minWeight),
      maxWeight: toStoredWeight(values.maxWeight),
      minVolume: values.minVolume,
      maxVolume: values.maxVolume,
    }),
  };
}
