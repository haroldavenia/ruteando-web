import { AuditLog } from '../../core/api/models';

import { EMPTY_VALUE, auditFieldLabel, diffChanges, displayValue, hasValueChanges } from './audit-diff';

import list from '../../../testing/fixtures/gateway/get__audit-logs.json';

const logs = (list.response.body as unknown as { content: AuditLog[] }).content;

describe('audit-diff', () => {
  describe('displayValue', () => {
    it('muestra vacío, null y undefined como «(vacío)»', () => {
      expect(displayValue('')).toBe(EMPTY_VALUE);
      expect(displayValue(null)).toBe(EMPTY_VALUE);
      expect(displayValue(undefined)).toBe(EMPTY_VALUE);
    });

    it('conserva el texto, los números, el cero y los booleanos', () => {
      expect(displayValue('texto')).toBe('texto');
      expect(displayValue(0)).toBe('0');
      expect(displayValue(12.5)).toBe('12.5');
      expect(displayValue(false)).toBe('false');
    });

    it('muestra objetos y listas como JSON compacto', () => {
      expect(displayValue({ a: 1, b: [2, 3] })).toBe('{"a":1,"b":[2,3]}');
      expect(displayValue([1, 'dos'])).toBe('[1,"dos"]');
    });
  });

  describe('diffChanges', () => {
    it('sin changes no hay filas', () => {
      expect(diffChanges(null)).toEqual([]);
      expect(diffChanges(undefined)).toEqual([]);
      expect(hasValueChanges(null)).toBeFalse();
    });

    it('marca el campo que cambió y lo pone con su nombre en español', () => {
      const [row] = diffChanges({ before: { driverId: '' }, after: { driverId: '6acb99b1a2fa810fb39fb5a9' } });
      expect(row).toEqual({
        field: 'driverId',
        label: 'Conductor',
        before: EMPTY_VALUE,
        after: '6acb99b1a2fa810fb39fb5a9',
        beforeEmpty: true,
        afterEmpty: false,
        changed: true,
      });
    });

    it('el estado de un paquete se lee con su nombre en español', () => {
      const [row] = diffChanges({ before: { status: 'pending' }, after: { status: 'attended' } }, 'package');
      expect(row.before).toBe('Pendiente');
      expect(row.after).toBe('Atendido');
    });

    it('un estado de otra entidad se muestra tal cual', () => {
      const [row] = diffChanges({ before: { status: 'pending' }, after: { status: 'attended' } }, 'journey');
      expect(row.before).toBe('pending');
    });

    it('antes y después idénticos no son un cambio, y vacío contra null tampoco', () => {
      const rows = diffChanges({ before: { name: 'A', driverId: '', quantity: 1 }, after: { name: 'A', driverId: null, quantity: 1 } });
      expect(rows.every((row) => !row.changed)).toBeTrue();
      expect(hasValueChanges({ before: { name: 'A' }, after: { name: 'A' } })).toBeFalse();
    });

    it('los campos que cambiaron van primero y el resto conserva su orden', () => {
      const rows = diffChanges({ before: { a: 1, b: 2, c: 3 }, after: { a: 1, b: 9, c: 3, d: 4 } });
      expect(rows.map((row) => row.field)).toEqual(['b', 'd', 'a', 'c']);
      expect(rows.filter((row) => row.changed).map((row) => row.field)).toEqual(['b', 'd']);
    });

    it('un campo que solo está en un lado cuenta como cambio', () => {
      const [row] = diffChanges({ before: {}, after: { nuevo: 'x' } });
      expect(row.changed).toBeTrue();
      expect(row.before).toBe(EMPTY_VALUE);
    });

    it('un campo que no se conoce se muestra con su clave', () => {
      expect(auditFieldLabel('campoRaro')).toBe('campoRaro');
    });

    it('compara objetos anidados por su contenido', () => {
      expect(hasValueChanges({ before: { z: { a: 1 } }, after: { z: { a: 1 } } })).toBeFalse();
      expect(hasValueChanges({ before: { z: { a: 1 } }, after: { z: { a: 2 } } })).toBeTrue();
    });

    it('acepta que falte uno de los dos lados', () => {
      expect(diffChanges({ after: { a: 1 } }).length).toBe(1);
      expect(diffChanges({ before: null, after: null })).toEqual([]);
    });
  });

  it('de los 7 eventos del ejemplo con changes, 4 cambian valores (las actualizaciones guardan antes y después idénticos)', () => {
    const withChanges = logs.filter((log) => log.changes);
    expect(withChanges.length).toBe(7);
    expect(withChanges.filter((log) => hasValueChanges(log.changes)).length).toBe(4);
    const update = logs.find((log) => log.action === 'settings.update');
    expect(hasValueChanges(update?.changes)).toBeFalse();
  });
});
