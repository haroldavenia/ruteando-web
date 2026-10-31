import { AUDIT_FIXTURE_LOGS, auditLog } from '../../../testing/audit';
import { parseCsv } from '../../shared/data/csv';

import { auditCsvFileName, auditToCsv } from './audit-export';

describe('audit-export', () => {
  const parse = (rows: Parameters<typeof auditToCsv>[0]) => parseCsv(auditToCsv(rows)).rows;

  it('lleva una fila por evento con las columnas del módulo', () => {
    const rows = parse(AUDIT_FIXTURE_LOGS);
    expect(rows.length).toBe(21);
    expect(rows[0]).toEqual([
      'Instante (UTC)',
      'Acción',
      'Tipo de acción',
      'Entidad',
      'Identificador',
      'Persona',
      'Rol',
      'Resumen',
      'IP',
      'Cambios',
    ]);
  });

  it('muestra la frase, la clave, el tipo, la entidad y el identificador completo', () => {
    const [, row] = parse([auditLog({ action: 'journey.delete', entityType: 'journey', entityId: '5f6f1325079242c7807dd3c4', description: 'Journey eliminado: name=X', actorEmail: 'ana@x.com', actorRole: 'TENANT_ADMIN', createdAt: '2026-10-11T14:14:14.039Z', ipAddress: '172.18.0.1' })]);
    expect(row).toEqual([
      '2026-10-11T14:14:14.039Z',
      'Jornada eliminada (journey.delete)',
      'Eliminación',
      'Jornada',
      '5f6f1325079242c7807dd3c4',
      'ana@x.com',
      'Administrador',
      'Journey eliminado: name=X',
      '172.18.0.1',
      '',
    ]);
  });

  it('la persona sin correo queda vacía en lugar de «Sin identificar»', () => {
    const [, row] = parse([auditLog({ actorEmail: null, actorRole: 'anonymous' })]);
    expect(row[5]).toBe('');
    expect(row[6]).toBe('');
  });

  it('los cambios son solo los campos que cambiaron, con su nombre en español', () => {
    const [, row] = parse([
      auditLog({
        action: 'package.status.change',
        changes: { before: { status: 'pending', name: 'Caja' }, after: { status: 'attended', name: 'Caja' } },
      }),
    ]);
    expect(row[row.length - 1]).toBe('Estado: Pendiente → Atendido');
  });

  it('varios cambios se separan con « | » y un evento sin cambios deja la celda vacía', () => {
    const [, changed, plain] = parse([
      auditLog({ entityType: 'resource', action: 'resource.update', changes: { before: { name: 'A', quantity: 1 }, after: { name: 'B', quantity: 2 } } }),
      auditLog({ changes: null }),
    ]);
    expect(changed[changed.length - 1]).toBe('Nombre: A → B | Cantidad: 1 → 2');
    expect(plain[plain.length - 1]).toBe('');
  });

  it('sin ninguna IP no pone la columna (la actividad propia no la entrega)', () => {
    const header = parse([auditLog({ ipAddress: undefined }), auditLog({ ipAddress: null })])[0];
    expect(header).not.toContain('IP');
    expect(header[header.length - 1]).toBe('Cambios');
  });

  it('protege las celdas que una hoja de cálculo ejecutaría como fórmula', () => {
    const csv = auditToCsv([auditLog({ description: '=HYPERLINK("http://x")', actorEmail: '+cmd@x.com' })]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd@x.com");
    expect(csv).not.toMatch(/;=HYPERLINK/);
  });

  it('sin eventos queda solo la cabecera', () => {
    expect(parse([]).length).toBe(1);
  });

  it('el nombre del archivo lleva la fecha local', () => {
    expect(auditCsvFileName(new Date(2026, 9, 5))).toBe('auditoria-2026-10-05.csv');
  });
});
