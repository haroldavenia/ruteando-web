import { formatCount, formatDateTime, formatDistance, formatDuration, formatLatLng, formatPercent, formatRelativeTime } from './format';

describe('format', () => {
  describe('formatRelativeTime', () => {
    const now = Date.parse('2026-10-31T12:00:00Z');
    const ago = (ms: number) => new Date(now - ms).toISOString();
    const casos: [string, number, string][] = [
      ['segundos', 20_000, 'ahora'],
      ['un minuto', 60_000, 'hace 1 min'],
      ['casi una hora', 59 * 60_000, 'hace 59 min'],
      ['una hora', 3_600_000, 'hace 1 h'],
      ['casi un día', 23 * 3_600_000, 'hace 23 h'],
      ['un día', 24 * 3_600_000, 'hace 1 d'],
      ['casi un mes', 29 * 86_400_000, 'hace 29 d'],
    ];
    for (const [nombre, ms, esperado] of casos) {
      it(`${nombre} -> ${esperado}`, () => expect(formatRelativeTime(ago(ms), now)).toBe(esperado));
    }

    it('pasados 30 días da la fecha corta', () => {
      expect(formatRelativeTime(ago(40 * 86_400_000), now)).toMatch(/^\d{1,2} [a-z]+\.? 2026$/);
    });

    it('un instante futuro (reloj adelantado) no da un tiempo negativo', () => {
      expect(formatRelativeTime(new Date(now + 5 * 60_000).toISOString(), now)).toBe('ahora');
    });

    it('vacío o inválido da «—»', () => {
      expect(formatRelativeTime(null, now)).toBe('—');
      expect(formatRelativeTime('no es una fecha', now)).toBe('—');
    });
  });

  describe('formatDuration', () => {
    const casos: [number, string][] = [
      [0, '0 s'],
      [59, '59 s'],
      [60, '1 min'],
      [532, '8 min'],
      [3599, '59 min'],
      [3600, '1 h 0 min'],
      [7500, '2 h 5 min'],
      [28800, '8 h 0 min'],
    ];
    for (const [segundos, esperado] of casos) {
      it(`${segundos} s -> ${esperado}`, () => expect(formatDuration(segundos)).toBe(esperado));
    }

    it('vacío, negativo o no numérico dan «—»', () => {
      expect(formatDuration(null)).toBe('—');
      expect(formatDuration(undefined)).toBe('—');
      expect(formatDuration(-1)).toBe('—');
      expect(formatDuration(NaN)).toBe('—');
    });
  });

  describe('formatDistance', () => {
    it('metros a kilómetros con un decimal y coma', () => {
      expect(formatDistance(5928.5)).toBe('5,9 km');
      expect(formatDistance(0)).toBe('0,0 km');
      expect(formatDistance(12050)).toBe('12,1 km');
    });

    it('vacío o negativo dan «—»', () => {
      expect(formatDistance(null)).toBe('—');
      expect(formatDistance(-5)).toBe('—');
    });
  });

  it('formatPercent', () => {
    expect(formatPercent(72.5)).toBe('72,5 %');
    expect(formatPercent(100)).toBe('100 %');
    expect(formatPercent(null)).toBe('—');
  });

  it('formatCount', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(12)).toBe('12');
    expect(formatCount(null)).toBe('—');
  });

  describe('formatDateTime', () => {
    it('muestra el mismo instante UTC en dos husos distintos', () => {
      const iso = '2026-10-11T13:00:00Z';
      const bogota = formatDateTime(iso, 'America/Bogota');
      const madrid = formatDateTime(iso, 'Europe/Madrid');
      expect(bogota).toContain('8:00');
      expect(madrid).toContain('15:00');
      expect(bogota).not.toBe(madrid);
    });

    it('vacío o inválido dan «—»', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime('')).toBe('—');
      expect(formatDateTime('no es una fecha')).toBe('—');
    });

    it('sin huso usa el del navegador', () => {
      expect(formatDateTime('2026-10-11T13:00:00Z')).not.toBe('—');
    });
  });

  it('formatLatLng', () => {
    expect(formatLatLng({ lat: 4.60872, lng: -74.07728 })).toBe('4,60872 / -74,07728');
    expect(formatLatLng(null)).toBe('—');
  });
});
