import type { AuditLog } from '@/lib/api/models';
import type { TFunction } from '@/lib/i18n/core';
import type { StatusTone } from '@/lib/list/list-logic';
import type { UserRole } from '@/lib/session-token';

/** Tipos en los que se agrupan las acciones, decididos por el verbo de su clave. */
export type AuditKind = 'creacion' | 'modificacion' | 'eliminacion' | 'estado' | 'asignacion' | 'otras';

/** En el orden en que se ofrecen en los filtros y en el reparto. */
export const AUDIT_KINDS: readonly AuditKind[] = [
  'creacion',
  'modificacion',
  'eliminacion',
  'estado',
  'asignacion',
  'otras',
];

/** Tono de cada tipo: lo bueno en verde, lo reversible en azul, lo destructivo en rojo y los estados en ámbar. */
const KIND_TONES: Readonly<Record<AuditKind, StatusTone>> = {
  creacion: 'success',
  modificacion: 'info',
  eliminacion: 'danger',
  estado: 'warning',
  asignacion: 'info',
  otras: 'neutral',
};

const VERB_KINDS: Readonly<Record<string, AuditKind>> = {
  create: 'creacion',
  created: 'creacion',
  update: 'modificacion',
  updated: 'modificacion',
  delete: 'eliminacion',
  deleted: 'eliminacion',
  revoked: 'eliminacion',
  assign: 'asignacion',
  unassign: 'asignacion',
};

export const auditKindLabel = (kind: AuditKind, t: TFunction): string =>
  ({
    creacion: t('Creación'),
    modificacion: t('Modificación'),
    eliminacion: t('Eliminación'),
    estado: t('Cambio de estado'),
    asignacion: t('Asignación'),
    otras: t('Otras'),
  })[kind];
export const auditKindTone = (kind: AuditKind): StatusTone => KIND_TONES[kind];

/** Tipo de una clave de acción (`package.status.change` → estado): el último verbo conocido, de derecha a izquierda. */
export function auditKind(action: string): AuditKind {
  const tokens = action.toLowerCase().split(/[._-]/);
  if (tokens.includes('status') && tokens.includes('change')) return 'estado';
  for (let index = tokens.length - 1; index >= 0; index--) {
    const kind = VERB_KINDS[tokens[index]!];
    if (kind) return kind;
  }
  return 'otras';
}

/** La clave de la acción es de las que borran la entidad (no una baja como revocar una invitación). */
export function isDeletion(action: string): boolean {
  const tokens = action.toLowerCase().split(/[._-]/);
  return tokens.includes('delete') || tokens.includes('deleted');
}

interface EntityInfo {
  label: string;
  /** Para concordar el participio («Jornada eliminada», «Paquete eliminado»). */
  feminine: boolean;
}

const entities = (t: TFunction): Readonly<Record<string, EntityInfo>> => ({
  journey: { label: t('Jornada'), feminine: true },
  package: { label: t('Paquete'), feminine: false },
  place: { label: t('Lugar'), feminine: false },
  resource: { label: t('Vehículo'), feminine: false },
  resource_type: { label: t('Tipo de vehículo'), feminine: false },
  'resource-type': { label: t('Tipo de vehículo'), feminine: false },
  settings: { label: t('Configuración'), feminine: true },
  user: { label: t('Usuario'), feminine: false },
  invitation: { label: t('Invitación'), feminine: true },
  tenant: { label: t('Empresa'), feminine: true },
  zone: { label: t('Zona'), feminine: true },
  notification: { label: t('Notificación'), feminine: true },
});

/** Participio en masculino y femenino de los verbos que componen la frase de una acción. */
const participles = (t: TFunction): Readonly<Record<string, readonly [string, string]>> => ({
  create: [t('creado'), t('creada')],
  created: [t('creado'), t('creada')],
  update: [t('actualizado'), t('actualizada')],
  updated: [t('actualizado'), t('actualizada')],
  delete: [t('eliminado'), t('eliminada')],
  deleted: [t('eliminado'), t('eliminada')],
  revoked: [t('revocado'), t('revocada')],
  accepted: [t('aceptado'), t('aceptada')],
});

/** Nombre en español del tipo de entidad; uno que no se conoce se muestra con su clave. */
export const auditEntityLabel = (entityType: string, t: TFunction): string =>
  entities(t)[entityType]?.label ?? entityType;

/** Frase corta de la acción («Jornada eliminada»); una acción que no se sabe componer se muestra con su clave. */
export function auditActionLabel(action: string, t: TFunction): string {
  // Acciones cuya frase no sale de «entidad + verbo»
  const known: Record<string, string> = {
    'resource.assign.driver': t('Conductor asignado'),
    'resource.unassign.driver': t('Conductor desasignado'),
    'package.status.change': t('Estado de paquete cambiado'),
    'notification.push_registered': t('Dispositivo registrado para avisos'),
    'notification.preferences_updated': t('Preferencias de avisos actualizadas'),
  };
  if (known[action]) return known[action];
  const [entity, verb, ...rest] = action.split('.');
  const info = entities(t)[entity ?? ''];
  const participle = participles(t)[verb ?? ''];
  if (info && participle && rest.length === 0) return `${info.label} ${participle[info.feminine ? 1 : 0]}`;
  return action;
}

/** Texto del evento: la descripción del gateway o, si es solo la clave de la acción o falta, la frase de la acción. */
export function auditSummary(log: Pick<AuditLog, 'action' | 'description'>, t: TFunction): string {
  const text = log.description?.trim();
  return text && text.toLowerCase() !== log.action.toLowerCase() ? text : auditActionLabel(log.action, t);
}

/** Identificadores de 24 caracteres hexadecimales (los de MongoDB) que el gateway deja dentro de las frases. */
const LONG_ID = /\b[0-9a-f]{24}\b/gi;

/** Las frases del gateway llevan identificadores enteros («Driver 6acb99b1a2fa810fb39fb5a9 asignado…»): para leerlas se dejan como «#fb5a9». */
export const humanizeIds = (text: string): string => text.replace(LONG_ID, (id) => `#${id.slice(-6)}`);

/** Rol en minúsculas: el gateway lo manda como `TENANT_ADMIN` en unos eventos y `tenant_admin` en otros. */
export function normalizeRole(role: string | null | undefined): string | null {
  const value = role?.trim().toLowerCase();
  return value ? value : null;
}

/** Nombre del rol de una persona; un rol que no se conoce se muestra tal cual lo da el gateway. */
export function roleLabel(role: string, t: TFunction): string {
  const labels: Record<UserRole, string> = {
    super_admin: t('Superadministrador'),
    tenant_admin: t('Administrador'),
    agent: t('Agente'),
    driver: t('Conductor'),
  };
  return (labels as Record<string, string>)[role] ?? role;
}

export interface AuditActor {
  /** Correo de quien actuó o, si no se conoce, «Anónimo» o «Sin identificar». */
  person: string;
  /** Rol en español, o `null` si el evento no lo trae o es anónimo. */
  role: string | null;
  /** Hay correo: se sabe quién fue. */
  identified: boolean;
}

export function auditActor(log: Pick<AuditLog, 'actorEmail' | 'actorRole'>, t: TFunction): AuditActor {
  const role = normalizeRole(log.actorRole);
  const email = log.actorEmail?.trim() ?? '';
  if (role === 'anonymous') return { person: email || t('Anónimo'), role: null, identified: email !== '' };
  return { person: email || t('Sin identificar'), role: role ? roleLabel(role, t) : null, identified: email !== '' };
}

/**
 * Iniciales para el avatar de quien actuó: de un correo, las de las dos primeras partes de su nombre (`ana.martinez@…` → «AM»); de
 * otro texto, sus dos primeras letras. Sin nada que mostrar devuelve una cadena vacía (el avatar enseña entonces un icono).
 */
export function actorInitials(person: string): string {
  const name = (person.split('@')[0] ?? '').trim();
  const parts = name.split(/[._\-\s]+/).filter((part) => part !== '');
  const letters = parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Trozos de un texto largo sin espacios (un correo) donde es natural partirlo si no cabe: tras `@`, `.`, `_` y `-`. Quien lo pinta pone un
 * `<wbr>` entre trozo y trozo, de modo que en una pantalla estrecha el correo baja de línea por esos sitios y no a mitad de palabra; el
 * texto (al copiarlo o leerlo) no cambia. Unidos, los trozos dan el texto original.
 */
export const breakableParts = (text: string): string[] => text.match(/[^@._-]+[@._-]*|[@._-]+/g) ?? [];

/** Cola de un identificador largo, para la tabla (el completo va en el detalle y en el `title`). */
export const shortId = (id: string, length = 8): string => (id.length > length ? id.slice(-length) : id);
