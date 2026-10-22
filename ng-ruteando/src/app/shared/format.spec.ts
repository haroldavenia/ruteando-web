import { formatCount, formatDateTime, formatDistance, formatDuration, formatLatLng, formatPercent } from './format';

describe('format', () => {
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
