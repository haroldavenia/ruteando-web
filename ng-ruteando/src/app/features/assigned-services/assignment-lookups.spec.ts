import { DRIVER, JOURNEY, OTHER_VEHICLE, SERVICE, VEHICLE } from '../../../testing/assigned-services';
import {
  assignedRouteLabel,
  assignedServicesToCsv,
  AssignmentLookups,
  dateLabel,
  driverLabel,
  EMPTY_LOOKUPS,
  stateLabel,
  vehicleName,
} from './assignment-lookups';

const lookups: AssignmentLookups = { journeys: [JOURNEY], resources: [VEHICLE, OTHER_VEHICLE], drivers: [DRIVER] };

describe('assignment-lookups', () => {
  it('nombra la ruta con su jornada y su número (el índice del gateway empieza en 0)', () => {
    expect(assignedRouteLabel(lookups, SERVICE)).toBe('Reparto norte · Ruta 2');
  });

  it('lo que no se puede nombrar queda en «—»', () => {
    expect(assignedRouteLabel(EMPTY_LOOKUPS, SERVICE)).toBe('— · Ruta 2');
    expect(assignedRouteLabel(lookups, { ...SERVICE, route: null })).toBe('—');
    expect(vehicleName(EMPTY_LOOKUPS, 'v1')).toBe('—');
    expect(driverLabel(lookups, null)).toBe('—');
  });

  it('el vehículo se nombra por su matrícula o, sin ella, por su nombre; el conductor, por su nombre', () => {
    expect(vehicleName(lookups, 'v1')).toBe('ABC123');
    expect(vehicleName(lookups, 'v2')).toBe('Moto');
    expect(driverLabel(lookups, 'd1')).toBe('Ana Pérez');
  });

  it('el estado ACTIVO se muestra «Activo» y los demás tal cual', () => {
    expect(stateLabel('ACTIVO')).toBe('Activo');
    expect(stateLabel('FINALIZADO')).toBe('FINALIZADO');
  });

  it('la fecha no se corre de día por la zona horaria', () => {
    expect(dateLabel('2026-11-25')).toContain('25');
    expect(dateLabel(null)).toBe('—');
  });

  it('el CSV lleva ruta, vehículo, conductor, fecha y estado', () => {
    const lines = assignedServicesToCsv(lookups, [SERVICE]).split(/\r?\n/);
    expect(lines[0]).toContain('Ruta');
    expect(lines.join('\n')).toContain('Reparto norte · Ruta 2');
    expect(lines.join('\n')).toContain('Ana Pérez');
    expect(lines.join('\n')).toContain('2026-11-25');
  });
});
