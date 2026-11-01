import { driver, resource, resourceType } from '../../../testing/fleet';

import { csvFileName, driversToCsv, typesToCsv, vehiclesToCsv } from './fleet-export';

const lines = (csv: string): string[] => csv.replace('\uFEFF', '').trim().split('\r\n');

describe('fleet-export', () => {
  it('el nombre del archivo lleva la fecha local', () => {
    expect(csvFileName('vehiculos', new Date(2026, 9, 31, 8, 0))).toBe('vehiculos-2026-10-31.csv');
    expect(csvFileName('tipos', new Date(2026, 0, 5))).toBe('tipos-2026-01-05.csv');
  });

  it('los tipos exportan el peso en kg y el volumen en m³', () => {
    const csv = typesToCsv([
      resourceType({ name: 'Camión', category: 'truck', osrmProfile: 'driving', capacity: { weight: 500, volume: 12_000_000 }, gasMileage: 12.5 }),
      resourceType({ name: 'Camioneta', category: 'car', capacity: null, gasMileage: null }),
    ]);
    const rows = lines(csv);
    expect(rows[0]).toBe('Nombre;Categoría;Perfil de ruteo;Peso (kg);Volumen (m³);Consumo de combustible');
    expect(rows[1]).toBe('Camión;truck;Conducción;500;12;12.5');
    expect(rows[2]).toBe('Camioneta;car;Conducción;;;');
  });

  it('los vehículos exportan tipo, conductor y estado', () => {
    const csv = vehiclesToCsv([
      resource({
        name: 'Furgón',
        licensePlate: 'ABC-123',
        quantity: 2,
        active: false,
        resourceType: { id: 't', name: 'Furgoneta', capacity: null, osrmProfile: 'driving' },
        assignedUser: { id: 'u', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' },
      }),
    ]);
    expect(lines(csv)[1]).toBe('Furgón;ABC-123;Furgoneta;Ana Pérez;ana@example.com;2;Inactivo');
  });

  it('los conductores exportan el documento con su etiqueta', () => {
    const csv = driversToCsv([driver({ firstName: 'Luis', lastName: 'Gómez', email: 'luis@example.com', phone: null, identifierType: 'citizen_id', identifierValue: '1020', active: true })]);
    expect(lines(csv)[1]).toBe('Luis;Gómez;luis@example.com;;Documento de identidad;1020;Activo');
  });

  it('protege las celdas que una hoja de cálculo leería como fórmula', () => {
    const csv = vehiclesToCsv([resource({ name: '=SUMA(1;2)', licensePlate: '+5', assignedUser: null })]);
    const row = lines(csv)[1];
    expect(row.startsWith(`"'=SUMA(1;2)"`)).toBeTrue();
    expect(row).toContain(";'+5;");
  });
});
