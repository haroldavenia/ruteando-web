import type { TFunction } from '@/lib/i18n/core';

const PLACEHOLDER = '—';

/**
 * Formatos de cifras, fechas y tiempos para el idioma activo (`lang` es también el código de `Intl`). Todos dan «—» ante un valor vacío o
 * inválido. Se crea con `makeFormat(t, lang)` o, en un componente de cliente, con `useFormat()`.
 */
export function makeFormat(t: TFunction, lang: string) {
  const km = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const dateTime = new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short' });
  const shortDate = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const coordinate = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
    useGrouping: false,
  });

  return {
    /** Segundos como «2 h 5 min», «9 min» o «45 s». */
    duration(seconds: number | null | undefined): string {
      if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return PLACEHOLDER;
      const total = Math.round(seconds);
      if (total < 60) return t('{0} s', [total]);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      return hours > 0 ? t('{0} h {1} min', [hours, minutes]) : t('{0} min', [minutes]);
    },
    /** Metros como kilómetros con un decimal. */
    distance(meters: number | null | undefined): string {
      if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) return PLACEHOLDER;
      return t('{0} km', [km.format(meters / 1000)]);
    },
    percent(value: number | null | undefined): string {
      return value === null || value === undefined || !Number.isFinite(value)
        ? PLACEHOLDER
        : `${percent.format(value)} %`;
    },
    /** Instante ISO (UTC) en la hora local del navegador (o de `zone`). */
    dateTime(iso: string | null | undefined, zone?: string): string {
      if (!iso) return PLACEHOLDER;
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return PLACEHOLDER;
      return (
        zone ? new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short', timeZone: zone }) : dateTime
      ).format(date);
    },
    /** Hace cuánto fue un instante: «ahora», «hace 12 min», «hace 3 h», «hace 4 d» y, pasados 30 días, la fecha. */
    relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
      const time = iso ? new Date(iso).getTime() : NaN;
      if (Number.isNaN(time)) return PLACEHOLDER;
      const minutes = Math.floor(Math.max(0, now - time) / 60_000);
      if (minutes < 1) return t('ahora');
      if (minutes < 60) return t('hace {0} min', [minutes]);
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('hace {0} h', [hours]);
      const days = Math.floor(hours / 24);
      return days < 30 ? t('hace {0} d', [days]) : shortDate.format(time);
    },
    count: (value: number | null | undefined) => (value === null || value === undefined ? PLACEHOLDER : String(value)),
    /** `latitud / longitud` con cinco decimales. */
    latLng: (point: { lat: number; lng: number } | null | undefined) =>
      point ? `${coordinate.format(point.lat)} / ${coordinate.format(point.lng)}` : PLACEHOLDER,
  };
}

export type Format = ReturnType<typeof makeFormat>;
