import type { SessionUser } from './session-token';

type Person = Pick<SessionUser, 'email' | 'firstName' | 'lastName'>;

/** Nombre de la persona con sesión, o su correo si no tiene nombre. */
export function displayName(user: Person): string {
  const name = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || user.email;
}

/** Iniciales para el avatar: nombre y apellido o, sin ellos, la primera letra del correo. */
export function initials(user: Person): string {
  const letters = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
    .map((part) => [...part][0]); // un carácter completo (no media pareja sustituta de un emoji)
  return (letters.length ? letters.slice(0, 2).join('') : ([...user.email][0] ?? '?')).toUpperCase();
}
