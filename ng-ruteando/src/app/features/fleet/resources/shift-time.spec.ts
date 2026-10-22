import { MAX_SHIFT_MINUTES, fromUtcIso, localDateOf, minutesToSeconds, secondsToMinutes, shiftErrors, toUtcIso, todayLocalDate } from './shift-time';

/** Huso (minutos respecto a UTC) con un ejemplo de lugar. */
const ZONES: [string, number][] = [
  ['UTC', 0],
  ['Bogotá (UTC-5)', -300],
  ['Madrid verano (UTC+2)', 120],
  ['India (UTC+5:30)', 330],
  ['Nueva Zelanda verano (UTC+13)', 780],
  ['Nueva York invierno (UTC-5)', -300],
];

describe('shift-time', () => {
  describe('toUtcIso y fromUtcIso', () => {
    for (const [name, offset] of ZONES) {
      it(`ida y vuelta en ${name}`, () => {
        for (const time of ['00:00', '06:30', '13:00', '23:59']) {
          const iso = toUtcIso(time, '2026-10-11', offset);
          expect(fromUtcIso(iso, offset)).withContext(`${name} ${time}`).toBe(time);
          expect(localDateOf(iso, offset)).toBe('2026-10-11');
        }
      });
    }

    it('convierte a UTC según el huso', () => {
      expect(toUtcIso('08:00', '2026-10-11', -300)).toBe('2026-10-11T13:00:00Z');
      expect(toUtcIso('08:00', '2026-10-11', 120)).toBe('2026-10-11T06:00:00Z');
      expect(toUtcIso('08:00', '2026-10-11', 330)).toBe('2026-10-11T02:30:00Z');
    });

    it('cambia de día en UTC cuando la hora local cae cerca de medianoche', () => {
      expect(toUtcIso('23:30', '2026-10-11', -300)).toBe('2026-10-12T04:30:00Z');
      expect(toUtcIso('01:00', '2026-10-11', 120)).toBe('2026-10-10T23:00:00Z');
      expect(toUtcIso('00:30', '2026-03-01', 780)).toBe('2026-02-28T11:30:00Z');
    });

    it('lee el ejemplo real del gateway en hora local', () => {
      expect(fromUtcIso('2026-10-11T13:00:00Z', -300)).toBe('08:00');
      expect(fromUtcIso('2026-10-11T13:00:00Z', 0)).toBe('13:00');
    });

    it('sin huso explícito usa el del navegador y la ida y vuelta se conserva', () => {
      const iso = toUtcIso('08:15', '2026-07-01');
      expect(fromUtcIso(iso)).toBe('08:15');
      expect(localDateOf(iso)).toBe('2026-07-01');
    });
  });

  it('todayLocalDate da la fecha local con ceros', () => {
    expect(todayLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('convierte duraciones entre minutos y segundos', () => {
    expect(minutesToSeconds(480)).toBe(28800);
    expect(secondsToMinutes(28800)).toBe(480);
    expect(secondsToMinutes(3600)).toBe(60);
    expect(secondsToMinutes(90)).toBe(1.5);
  });

  describe('shiftErrors', () => {
    it('acepta un turno normal', () => {
      expect(shiftErrors(480, 60)).toEqual([]);
      expect(shiftErrors(MAX_SHIFT_MINUTES, 0)).toEqual([]);
    });

    it('rechaza turnos nulos, negativos o de más de 24 horas', () => {
      expect(shiftErrors(0, 0)).toEqual(['shiftNotPositive']);
      expect(shiftErrors(-5, 0)).toEqual(['shiftNotPositive']);
      expect(shiftErrors(MAX_SHIFT_MINUTES + 1, 0)).toEqual(['shiftTooLong']);
    });

    it('rechaza descansos negativos', () => {
      expect(shiftErrors(480, -1)).toEqual(['breakNegative']);
    });
  });
});
