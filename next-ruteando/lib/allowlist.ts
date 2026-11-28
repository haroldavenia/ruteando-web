import { ADMIN_ROLES as ADMIN, ALL_ROLES as ANY, OPERATIONS_ROLES as OPS } from './roles';
import type { UserRole } from './session';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface Rule {
  /** Segmentos de la ruta; `*` casa un segmento cualquiera y `**` el resto (incluso nada). */
  path: string;
  methods: Method[];
  roles: readonly UserRole[];
}

const READ: Method[] = ['GET'];
const WRITE: Method[] = ['POST', 'PUT', 'PATCH', 'DELETE'];
const ALL: Method[] = [...READ, ...WRITE];

/**
 * Qué puede llamar el navegador. Nunca `auth/**` (lo atienden /middleware/auth|mfa|sso, que imponen el segundo factor): un proxy abierto
 * permitiría saltarlo con variantes de ruta (regresión de la v1.20.1). El gateway valida también el rol; esto es la primera puerta.
 */
export const RULES: Rule[] = [
  { path: 'master-domains/**', methods: READ, roles: ANY },
  { path: 'master-domains/**', methods: WRITE, roles: ADMIN },
  { path: 'resource-types/**', methods: ALL, roles: ADMIN },
  { path: 'resources/**', methods: ALL, roles: ADMIN },
  { path: 'users/**', methods: ALL, roles: ADMIN },
  { path: 'places/**', methods: ALL, roles: ADMIN },
  { path: 'zones/**', methods: ALL, roles: ADMIN },
  { path: 'settings/**', methods: ALL, roles: ADMIN },
  { path: 'packages/**', methods: ALL, roles: OPS },
  { path: 'journeys/**', methods: ALL, roles: OPS },
  { path: 'assigned-services/**', methods: ALL, roles: OPS },
  { path: 'audit-logs/**', methods: READ, roles: OPS },
  { path: 'geocoding', methods: ['POST'], roles: OPS },
  { path: 'reverse-geocoding', methods: ['POST'], roles: OPS },
];

/** Los segmentos ya vienen decodificados por Next: se rechaza todo lo que pueda reinterpretarse aguas abajo. */
export function safeSegments(segments: string[]): string[] | null {
  if (!segments.length) return null;
  for (const s of segments) {
    // eslint-disable-next-line no-control-regex -- los caracteres de control son justo lo que se rechaza
    if (!s || s === '.' || s === '..' || /[\\/;%?#\u0000-\u001f]/.test(s)) return null;
  }
  return segments.map((s) => s.toLowerCase());
}

function matches(rule: string, segments: string[]) {
  const parts = rule.split('/');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '**') return true;
    if (segments[i] === undefined || (parts[i] !== '*' && parts[i] !== segments[i])) return false;
  }
  return parts.length === segments.length;
}

export function isAllowed(segments: string[], method: string, role: UserRole | undefined): boolean {
  const safe = safeSegments(segments);
  if (!safe || !role || safe[0] === 'auth') return false;
  return RULES.some((r) => r.methods.includes(method as Method) && r.roles.includes(role) && matches(r.path, safe));
}
