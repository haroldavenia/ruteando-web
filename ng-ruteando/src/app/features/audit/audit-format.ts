const LONG_DATE_TIME = new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'medium' });
const SHORT_DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const LONG_DAY = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
const CLOCK = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const COUNT = new Intl.NumberFormat('es');

const PLACEHOLDER = '—';

/** «11 de octubre de 2026, 14:14:14» en la hora local; vacío o inválido da «—». */
export function formatLongDateTime(iso: string | null | undefined): string {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(time) ? PLACEHOLDER : LONG_DATE_TIME.format(time);
}

/** El instante en UTC tal como lo guarda el gateway, para quien lo cruza con otros sistemas. */
export function formatUtc(iso: string | null | undefined): string {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(time) ? PLACEHOLDER : new Date(time).toISOString();
}

/** Día `AAAA-MM-DD` como «11 oct» (el día local, sin pasar por UTC). */
export function formatDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return SHORT_DATE.format(new Date(year, month - 1, day));
}

/** Día `AAAA-MM-DD` como «domingo, 11 de octubre» (para lectores de pantalla). */
export function formatLongDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return LONG_DAY.format(new Date(year, month - 1, day));
}

/** Hora y minutos locales de un instante («14:32»). */
export function formatClock(time: number): string {
  return CLOCK.format(time);
}

/** Número con separador de miles («1 000»). */
export function formatNumber(value: number): string {
  return COUNT.format(value);
}
