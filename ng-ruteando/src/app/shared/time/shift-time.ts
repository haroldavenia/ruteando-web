/**
 * Conversión del turno de un vehículo entre lo que ve la persona (hora local del navegador, minutos)
 * y lo que guarda el gateway (ISO 8601 en UTC, segundos). Las funciones aceptan `offsetMinutes`
 * (hora local menos UTC) para poder probarlas con husos distintos; sin él usan el del navegador
 * en ese instante, con el horario de verano incluido.
 */

export const MAX_SHIFT_MINUTES = 24 * 60;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Diferencia en minutos entre la hora local y UTC en un instante (positiva al este de Greenwich). */
export function browserOffsetMinutes(at: Date): number {
  return -at.getTimezoneOffset();
}

/** `HH:mm` local de un instante ISO UTC. */
export function fromUtcIso(iso: string, offsetMinutes: number = browserOffsetMinutes(new Date(iso))): string {
  const local = new Date(new Date(iso).getTime() + offsetMinutes * 60_000);
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** Fecha local `YYYY-MM-DD` de un instante ISO UTC. */
export function localDateOf(iso: string, offsetMinutes: number = browserOffsetMinutes(new Date(iso))): string {
  const local = new Date(new Date(iso).getTime() + offsetMinutes * 60_000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

/**
 * ISO UTC (`YYYY-MM-DDTHH:mm:ssZ`) de una hora local `HH:mm` en la fecha local `localDate`
 * (`YYYY-MM-DD`). El instante puede caer en el día anterior o posterior en UTC.
 */
export function toUtcIso(time: string, localDate: string, offsetMinutes?: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = localDate.split('-').map(Number);
  const offset = offsetMinutes ?? browserOffsetMinutes(new Date(year, month - 1, day, hours, minutes));
  const utc = new Date(Date.UTC(year, month - 1, day, hours, minutes) - offset * 60_000);
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())}:00Z`;
}

/** Fecha local de hoy, `YYYY-MM-DD`, para un vehículo nuevo. */
export function todayLocalDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const minutesToSeconds = (minutes: number): number => Math.round(minutes * 60);
export const secondsToMinutes = (seconds: number): number => Math.round((seconds / 60) * 100) / 100;

export type ShiftError = 'shiftNotPositive' | 'shiftTooLong' | 'breakNegative';

/** Errores de las duraciones (en minutos): turno de 1 min a 24 h y descanso no negativo. */
export function shiftErrors(durationMinutes: number, breakMinutes: number): ShiftError[] {
  const errors: ShiftError[] = [];
  if (durationMinutes <= 0) {
    errors.push('shiftNotPositive');
  } else if (durationMinutes > MAX_SHIFT_MINUTES) {
    errors.push('shiftTooLong');
  }
  if (breakMinutes < 0) {
    errors.push('breakNegative');
  }
  return errors;
}
