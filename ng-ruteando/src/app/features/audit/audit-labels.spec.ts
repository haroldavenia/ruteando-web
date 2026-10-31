import { AuditLog } from '../../core/api/models';

import {
  AUDIT_KINDS,
  AuditKind,
  actorInitials,
  auditActionLabel,
  auditActor,
  auditEntityLabel,
  auditKind,
  auditKindIcon,
  auditKindLabel,
  auditKindTone,
  auditSummary,
  humanizeIds,
  isDeletion,
  normalizeRole,
  shortId,
} from './audit-labels';

import list from '../../../testing/fixtures/gateway/get__audit-logs.json';

const logs = (list.response.body as unknown as { content: AuditLog[] }).content;

describe('audit-labels', () => {
  describe('acciones reales del gateway', () => {
    const expected: Record<string, [string, AuditKind]> = {
      'resource.assign.driver': ['Conductor asignado', 'asignacion'],
      'resource.unassign.driver': ['Conductor desasignado', 'asignacion'],
      'package.status.change': ['Estado de paquete cambiado', 'estado'],
      'journey.delete': ['Jornada eliminada', 'eliminacion'],
      'invitation.created': ['Invitación creada', 'creacion'],
      'invitation.revoked': ['Invitación revocada', 'eliminacion'],
      'invitation.accepted': ['Invitación aceptada', 'otras'],
      'settings.create': ['Configuración creada', 'creacion'],
      'settings.update': ['Configuración actualizada', 'modificacion'],
      'package.create': ['Paquete creado', 'creacion'],
      'resource.create': ['Vehículo creado', 'creacion'],
      'resource.update': ['Vehículo actualizado', 'modificacion'],
      'place.create': ['Lugar creado', 'creacion'],
      'place.update': ['Lugar actualizado', 'modificacion'],
      'user.created': ['Usuario creado', 'creacion'],
      'user.updated': ['Usuario actualizado', 'modificacion'],
      'tenant.updated': ['Empresa actualizada', 'modificacion'],
      'notification.push_registered': ['Dispositivo registrado para avisos', 'otras'],
      'notification.preferences_updated': ['Preferencias de avisos actualizadas', 'modificacion'],
    };

    for (const [action, [label, kind]] of Object.entries(expected)) {
      it(`${action} se lee «${label}» y es de tipo ${kind}`, () => {
        expect(auditActionLabel(action)).toBe(label);
        expect(auditKind(action)).toBe(kind);
      });
    }

    it('todas las acciones de los ejemplos reales tienen frase propia (ninguna se queda en su clave)', () => {
      for (const log of logs) {
        expect(auditActionLabel(log.action)).withContext(log.action).not.toBe(log.action);
      }
    });
  });

  describe('lo que el gateway puede traer y la aplicación aún no conoce', () => {
    it('una acción sin frase conocida se muestra con su clave y es de tipo otras', () => {
      expect(auditActionLabel('route.optimize')).toBe('route.optimize');
      expect(auditKind('route.optimize')).toBe('otras');
    });

    it('una entidad desconocida con un verbo conocido deja la clave', () => {
      expect(auditActionLabel('widget.created')).toBe('widget.created');
      expect(auditEntityLabel('widget')).toBe('widget');
    });

    it('el tipo de entidad conocido se lee en español', () => {
      expect(auditEntityLabel('journey')).toBe('Jornada');
      expect(auditEntityLabel('resource')).toBe('Vehículo');
      expect(auditEntityLabel('invitation')).toBe('Invitación');
    });

    it('la clave en mayúsculas se clasifica igual', () => {
      expect(auditKind('JOURNEY.DELETE')).toBe('eliminacion');
    });
  });

  describe('tipos de acción', () => {
    it('hay seis, cada uno con nombre, tono y glifo', () => {
      expect(AUDIT_KINDS.length).toBe(6);
      for (const kind of AUDIT_KINDS) {
        expect(auditKindLabel(kind)).not.toBe('');
        expect(auditKindIcon(kind)).not.toBe('');
      }
      expect(auditKindTone('eliminacion')).toBe('danger');
      expect(auditKindTone('creacion')).toBe('success');
      expect(auditKindTone('estado')).toBe('warning');
      expect(auditKindTone('otras')).toBe('neutral');
    });

    it('los 20 eventos del ejemplo se reparten en 7 creaciones, 5 modificaciones, 3 asignaciones, 2 eliminaciones, 2 otras y 1 estado', () => {
      const counts: Record<string, number> = {};
      for (const log of logs) {
        counts[auditKind(log.action)] = (counts[auditKind(log.action)] ?? 0) + 1;
      }
      expect(counts).toEqual({ creacion: 7, modificacion: 5, asignacion: 3, eliminacion: 2, otras: 2, estado: 1 });
    });

    it('solo delete y deleted borran la entidad (revocar una invitación no)', () => {
      expect(isDeletion('journey.delete')).toBeTrue();
      expect(isDeletion('journey.deleted')).toBeTrue();
      expect(isDeletion('invitation.revoked')).toBeFalse();
      expect(isDeletion('package.create')).toBeFalse();
    });
  });

  describe('resumen', () => {
    it('usa la descripción del gateway cuando dice algo', () => {
      expect(auditSummary({ action: 'journey.delete', description: 'Journey eliminado: name=Postman journey' })).toBe(
        'Journey eliminado: name=Postman journey',
      );
    });

    it('arma una frase si la descripción es solo la clave de la acción', () => {
      expect(auditSummary({ action: 'invitation.created', description: 'invitation.created' })).toBe('Invitación creada');
      expect(auditSummary({ action: 'invitation.created', description: 'INVITATION.CREATED' })).toBe('Invitación creada');
    });

    it('arma una frase si la descripción falta o está en blanco', () => {
      expect(auditSummary({ action: 'package.create', description: null })).toBe('Paquete creado');
      expect(auditSummary({ action: 'package.create', description: '   ' })).toBe('Paquete creado');
    });
  });

  describe('autor', () => {
    it('muestra el correo y el rol en español', () => {
      expect(auditActor({ actorEmail: 'ana@example.com', actorRole: 'tenant_admin' })).toEqual({
        person: 'ana@example.com',
        role: 'Administrador',
        identified: true,
      });
    });

    it('el rol con otra capitalización es el mismo rol', () => {
      expect(auditActor({ actorEmail: null, actorRole: 'TENANT_ADMIN' }).role).toBe('Administrador');
      expect(auditActor({ actorEmail: null, actorRole: 'tenant_admin' }).role).toBe('Administrador');
      expect(normalizeRole('TENANT_ADMIN')).toBe('tenant_admin');
    });

    it('sin correo es «Sin identificar» y conserva el rol', () => {
      expect(auditActor({ actorEmail: null, actorRole: 'TENANT_ADMIN' })).toEqual({
        person: 'Sin identificar',
        role: 'Administrador',
        identified: false,
      });
    });

    it('el rol anonymous es «Anónimo» y no muestra rol', () => {
      expect(auditActor({ actorEmail: null, actorRole: 'anonymous' })).toEqual({ person: 'Anónimo', role: null, identified: false });
    });

    it('sin rol ni correo no inventa nada', () => {
      expect(auditActor({ actorEmail: null, actorRole: null })).toEqual({ person: 'Sin identificar', role: null, identified: false });
    });

    it('un rol que no se conoce se muestra tal cual', () => {
      expect(auditActor({ actorEmail: 'a@b.c', actorRole: 'auditor' }).role).toBe('auditor');
    });
  });

  it('actorInitials saca las iniciales de un correo o de un nombre', () => {
    expect(actorInitials('ana.martinez@ruteando.demo')).toBe('AM');
    expect(actorInitials('luis_perez@example.com')).toBe('LP');
    expect(actorInitials('carla-gomez@x.com')).toBe('CG');
    expect(actorInitials('soporte@x.com')).toBe('SO');
    expect(actorInitials('Ana María')).toBe('AM');
    expect(actorInitials('x')).toBe('X');
    expect(actorInitials('')).toBe('');
    expect(actorInitials('@x.com')).toBe('');
  });

  it('humanizeIds deja los identificadores largos como #cola y no toca el resto', () => {
    const driver = '6acb99b1a2fa810fb39fb5a9';
    const resource = '6acb99b48275a26dbdf8fcf5';
    expect(humanizeIds(`Driver ${driver} asignado al recurso ${resource}`)).toBe(`Driver #${driver.slice(-6)} asignado al recurso #${resource.slice(-6)}`);
    expect(humanizeIds('Paquete creado: guide=G-1042')).toBe('Paquete creado: guide=G-1042');
    expect(humanizeIds('abc123')).toBe('abc123');
  });

  it('shortId deja la cola de un identificador largo y respeta uno corto', () => {
    expect(shortId('6acb99b6a2fa810fb39fb5c5')).toBe('b39fb5c5');
    expect(shortId('abc')).toBe('abc');
  });
});
