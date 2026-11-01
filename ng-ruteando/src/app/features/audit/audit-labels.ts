import { AuditLog } from '../../core/api/models';
import { roleLabel } from '../../shared/ui/role-label';
import { StatusTone } from '../../shared/ui/status-tone';

/** Tipos en los que se agrupan las acciones, decididos por el verbo de su clave. */
export type AuditKind = 'creacion' | 'modificacion' | 'eliminacion' | 'estado' | 'asignacion' | 'otras';

/** En el orden en que se ofrecen en los filtros y en el reparto. */
export const AUDIT_KINDS: readonly AuditKind[] = ['creacion', 'modificacion', 'eliminacion', 'estado', 'asignacion', 'otras'];

const KIND_LABELS: Readonly<Record<AuditKind, string>> = {
  creacion: 'Creación',
  modificacion: 'Modificación',
  eliminacion: 'Eliminación',
  estado: 'Cambio de estado',
  asignacion: 'Asignación',
  otras: 'Otras',
};

/** Tono de cada tipo: lo bueno en verde, lo reversible en azul, lo destructivo en rojo y los estados en ámbar. */
const KIND_TONES: Readonly<Record<AuditKind, StatusTone>> = {
  creacion: 'success',
  modificacion: 'info',
  eliminacion: 'danger',
  estado: 'warning',
  asignacion: 'info',
  otras: 'neutral',
};

const KIND_ICONS: Readonly<Record<AuditKind, string>> = {
  creacion: 'add_circle',
  modificacion: 'edit',
  eliminacion: 'delete',
  estado: 'published_with_changes',
  asignacion: 'swap_horiz',
  otras: 'more_horiz',
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

export const auditKindLabel = (kind: AuditKind): string => KIND_LABELS[kind];
export const auditKindTone = (kind: AuditKind): StatusTone => KIND_TONES[kind];
export const auditKindIcon = (kind: AuditKind): string => KIND_ICONS[kind];

/** Tipo de una clave de acción (`package.status.change` → estado): el último verbo conocido, de derecha a izquierda. */
export function auditKind(action: string): AuditKind {
  const tokens = action.toLowerCase().split(/[._-]/);
  if (tokens.includes('status') && tokens.includes('change')) {
    return 'estado';
  }
  for (let index = tokens.length - 1; index >= 0; index--) {
    const kind = VERB_KINDS[tokens[index]];
    if (kind) {
      return kind;
    }
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

const ENTITIES: Readonly<Record<string, EntityInfo>> = {
  journey: { label: 'Jornada', feminine: true },
  package: { label: 'Paquete', feminine: false },
  place: { label: 'Lugar', feminine: false },
  resource: { label: 'Vehículo', feminine: false },
  resource_type: { label: 'Tipo de vehículo', feminine: false },
  'resource-type': { label: 'Tipo de vehículo', feminine: false },
  settings: { label: 'Configuración', feminine: true },
  user: { label: 'Usuario', feminine: false },
  invitation: { label: 'Invitación', feminine: true },
  tenant: { label: 'Empresa', feminine: true },
  zone: { label: 'Zona', feminine: true },
  notification: { label: 'Notificación', feminine: true },
};

/** Participio en masculino y femenino de los verbos que componen la frase de una acción. */
const PARTICIPLES: Readonly<Record<string, readonly [string, string]>> = {
  create: ['creado', 'creada'],
  created: ['creado', 'creada'],
  update: ['actualizado', 'actualizada'],
  updated: ['actualizado', 'actualizada'],
  delete: ['eliminado', 'eliminada'],
  deleted: ['eliminado', 'eliminada'],
  revoked: ['revocado', 'revocada'],
  accepted: ['aceptado', 'aceptada'],
};

/** Acciones cuya frase no sale de «entidad + verbo». */
const ACTIONS: Readonly<Record<string, string>> = {
  'resource.assign.driver': 'Conductor asignado',
  'resource.unassign.driver': 'Conductor desasignado',
  'package.status.change': 'Estado de paquete cambiado',
  'notification.push_registered': 'Dispositivo registrado para avisos',
  'notification.preferences_updated': 'Preferencias de avisos actualizadas',
};

/** Nombre en español del tipo de entidad; uno que no se conoce se muestra con su clave. */
export function auditEntityLabel(entityType: string): string {
  return ENTITIES[entityType]?.label ?? entityType;
}

/** Frase corta de la acción («Jornada eliminada»); una acción que no se sabe componer se muestra con su clave. */
export function auditActionLabel(action: string): string {
  const known = ACTIONS[action];
  if (known) {
    return known;
  }
  const [entity, verb, ...rest] = action.split('.');
  const info = ENTITIES[entity];
  const participle = PARTICIPLES[verb];
  if (info && participle && rest.length === 0) {
    return `${info.label} ${participle[info.feminine ? 1 : 0]}`;
  }
  return action;
}

/** Texto del evento: la descripción del gateway o, si es solo la clave de la acción o falta, la frase de la acción. */
export function auditSummary(log: Pick<AuditLog, 'action' | 'description'>): string {
  const text = log.description?.trim();
  return text && text.toLowerCase() !== log.action.toLowerCase() ? text : auditActionLabel(log.action);
}

/** Identificadores de 24 caracteres hexadecimales (los de MongoDB) que el gateway deja dentro de las frases. */
const LONG_ID = /\b[0-9a-f]{24}\b/gi;

/** Las frases del gateway llevan identificadores enteros («Driver 6acb99b1a2fa810fb39fb5a9 asignado…»): para leerlas se dejan como «#fb5a9». */
export function humanizeIds(text: string): string {
  return text.replace(LONG_ID, (id) => `#${id.slice(-6)}`);
}

/** Rol en minúsculas: el gateway lo manda como `TENANT_ADMIN` en unos eventos y `tenant_admin` en otros. */
export function normalizeRole(role: string | null | undefined): string | null {
  const value = role?.trim().toLowerCase();
  return value ? value : null;
}

export interface AuditActor {
  /** Correo de quien actuó o, si no se conoce, «Anónimo» o «Sin identificar». */
  person: string;
  /** Rol en español, o `null` si el evento no lo trae o es anónimo. */
  role: string | null;
  /** Hay correo: se sabe quién fue. */
  identified: boolean;
}

export function auditActor(log: Pick<AuditLog, 'actorEmail' | 'actorRole'>): AuditActor {
  const role = normalizeRole(log.actorRole);
  const email = log.actorEmail?.trim() ?? '';
  if (role === 'anonymous') {
    return { person: email || 'Anónimo', role: null, identified: email !== '' };
  }
  return { person: email || 'Sin identificar', role: role ? roleLabel(role) : null, identified: email !== '' };
}

/**
 * Iniciales para el avatar de quien actuó: de un correo, las de las dos primeras partes de su nombre (`ana.martinez@…` → «AM»); de
 * otro texto, sus dos primeras letras. Sin nada que mostrar devuelve una cadena vacía (el avatar enseña entonces un icono).
 */
export function actorInitials(person: string): string {
  const name = person.split('@')[0].trim();
  const parts = name.split(/[._\-\s]+/).filter((part) => part !== '');
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Trozos de un texto largo sin espacios (un correo) donde es natural partirlo si no cabe: tras `@`, `.`, `_` y `-`. Quien lo pinta pone un
 * `<wbr>` entre trozo y trozo, de modo que en una pantalla estrecha el correo baja de línea por esos sitios y no a mitad de palabra; el
 * texto (al copiarlo o leerlo) no cambia. Unidos, los trozos dan el texto original.
 */
export function breakableParts(text: string): string[] {
  return text.match(/[^@._-]+[@._-]*|[@._-]+/g) ?? [];
}

/** Cola de un identificador largo, para la tabla (el completo va en el detalle y en el `title`). */
export function shortId(id: string, length = 8): string {
  return id.length > length ? id.slice(-length) : id;
}
