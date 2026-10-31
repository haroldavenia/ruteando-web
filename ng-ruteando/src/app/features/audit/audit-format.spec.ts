import { formatClock, formatDayKey, formatLongDateTime, formatLongDayKey, formatNumber, formatUtc } from './audit-format';

describe('audit-format', () => {
  it('formatLongDateTime pone la fecha larga y la hora, y da «—» si no es una fecha', () => {
    const text = formatLongDateTime('2026-10-11T14:14:14.039Z');
    expect(text).toContain('2026');
    expect(text).toContain('octubre');
    expect(formatLongDateTime(null)).toBe('—');
    expect(formatLongDateTime('nada')).toBe('—');
  });

  it('formatUtc devuelve el instante ISO sin cambiarlo de zona', () => {
    expect(formatUtc('2026-10-11T14:14:14.039Z')).toBe('2026-10-11T14:14:14.039Z');
    expect(formatUtc('2026-10-11T09:14:14-05:00')).toBe('2026-10-11T14:14:14.000Z');
    expect(formatUtc(undefined)).toBe('—');
  });

  it('formatDayKey y formatLongDayKey leen el día local aunque la zona horaria esté detrás de UTC', () => {
    expect(formatDayKey('2026-10-11')).toMatch(/^11 oct/);
    expect(formatLongDayKey('2026-10-11')).toContain('domingo');
    expect(formatLongDayKey('2026-10-11')).toContain('11 de octubre');
  });

  it('formatClock da horas y minutos con dos dígitos', () => {
    expect(formatClock(new Date(2026, 9, 11, 9, 5).getTime())).toBe('09:05');
  });

  it('formatNumber separa los miles al estilo español', () => {
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(1000)).toMatch(/^1[\s  .]?000$/);
  });
});
