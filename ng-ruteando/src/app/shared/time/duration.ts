/** Duración escrita como «1h 30m» (h = horas, m = minutos) y su equivalente en minutos. */

const DURATION = /^\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*$/i;

/** Minutos de «2h 45m», «2h» o «45m»; `null` si el texto está vacío o no sigue el formato. */
export function parseDuration(text: string): number | null {
  const match = DURATION.exec(text);
  if (!match || (match[1] === undefined && match[2] === undefined)) {
    return null;
  }
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

/** «1h 30m», «2h» o «45m» para una cantidad de minutos (redondeada al minuto). */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return [hours > 0 && `${hours}h`, (rest > 0 || hours === 0) && `${rest}m`].filter(Boolean).join(' ');
}
