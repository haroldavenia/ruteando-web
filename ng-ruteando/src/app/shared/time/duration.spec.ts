import { formatDuration, parseDuration } from './duration';

describe('duration', () => {
  it('lee horas y minutos', () => {
    expect(parseDuration('1h 30m')).toBe(90);
    expect(parseDuration('2H')).toBe(120);
    expect(parseDuration('45m')).toBe(45);
    expect(parseDuration(' 2h45m ')).toBe(165);
  });

  it('rechaza lo que no sigue el formato', () => {
    for (const bad of ['', '  ', '90', '1d', '1m 1h', 'abc', '1.5h']) {
      expect(parseDuration(bad)).withContext(bad).toBeNull();
    }
  });

  it('escribe los minutos como horas y minutos', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(0)).toBe('0m');
    expect(parseDuration(formatDuration(165))).toBe(165);
  });
});
