const PLACEHOLDER = '—';

/** Fechas y números de la auditoría en el idioma activo (`lang` es también el código de `Intl`). */
export function makeAuditFormat(lang: string) {
  const longDateTime = new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeStyle: 'medium' });
  const shortDate = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' });
  const longDay = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const clock = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' });
  const count = new Intl.NumberFormat(lang);
  const parts = (key: string): [number, number, number] => {
    const [year, month, day] = key.split('-').map(Number) as [number, number, number];
    return [year, month, day];
  };
  return {
    /** «11 de octubre de 2026, 14:14:14» en la hora local; vacío o inválido da «—». */
    longDateTime(iso: string | null | undefined): string {
      const time = iso ? Date.parse(iso) : NaN;
      return Number.isNaN(time) ? PLACEHOLDER : longDateTime.format(time);
    },
    /** El instante en UTC tal como lo guarda el gateway, para quien lo cruza con otros sistemas. */
    utc(iso: string | null | undefined): string {
      const time = iso ? Date.parse(iso) : NaN;
      return Number.isNaN(time) ? PLACEHOLDER : new Date(time).toISOString();
    },
    /** Día `AAAA-MM-DD` como «11 oct» (el día local, sin pasar por UTC). */
    dayKey(key: string): string {
      const [year, month, day] = parts(key);
      return shortDate.format(new Date(year, month - 1, day));
    },
    /** Día `AAAA-MM-DD` como «domingo, 11 de octubre» (para lectores de pantalla). */
    longDayKey(key: string): string {
      const [year, month, day] = parts(key);
      return longDay.format(new Date(year, month - 1, day));
    },
    /** Hora y minutos locales de un instante («14:32»). */
    clock: (time: number) => clock.format(time),
    /** Número con separador de miles («1 000»). */
    number: (value: number) => count.format(value),
  };
}

export type AuditFormat = ReturnType<typeof makeAuditFormat>;
