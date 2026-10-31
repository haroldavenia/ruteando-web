const PLACEHOLDER = '—';
const KM = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PERCENT = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
const DATE_TIME = new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' });

/** Segundos como «2 h 5 min», «9 min» o «45 s»; vacío o no válido da «—». */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return PLACEHOLDER;
  }
  const total = Math.round(seconds);
  if (total < 60) {
    return `${total} s`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

/** Metros como kilómetros con un decimal y coma decimal («5,9 km»). */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return PLACEHOLDER;
  }
  return `${KM.format(meters / 1000)} km`;
}

/** Porcentaje («72,5 %»); `null` da «—». */
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? PLACEHOLDER : `${PERCENT.format(value)} %`;
}

/** Instante ISO (UTC) en la hora local del navegador; vacío o inválido da «—». */
export function formatDateTime(iso: string | null | undefined, zone?: string): string {
  if (!iso) {
    return PLACEHOLDER;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return PLACEHOLDER;
  }
  return (zone ? new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short', timeZone: zone }) : DATE_TIME).format(date);
}

const SHORT_DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });

/** Hace cuánto fue un instante: «ahora», «hace 12 min», «hace 3 h», «hace 4 d» y, pasados 30 días, la fecha; vacío o inválido da «—». */
export function formatRelativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  const time = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(time)) {
    return PLACEHOLDER;
  }
  const minutes = Math.floor(Math.max(0, now - time) / 60_000);
  if (minutes < 1) {
    return 'ahora';
  }
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return days < 30 ? `hace ${days} d` : SHORT_DATE.format(time);
}

/** Cifra opcional («—» si falta). */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? PLACEHOLDER : String(value);
}

const COORDINATE = new Intl.NumberFormat('es', { minimumFractionDigits: 5, maximumFractionDigits: 5, useGrouping: false });

/** `latitud / longitud` con cinco decimales; sin posición válida da «—». */
export function formatLatLng(point: { lat: number; lng: number } | null | undefined): string {
  return point ? `${COORDINATE.format(point.lat)} / ${COORDINATE.format(point.lng)}` : PLACEHOLDER;
}
