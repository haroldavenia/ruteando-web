import { AssignedService } from '../models';
import { assignmentBody, dateOnly, isForRoute, readAssignment } from './assigned-services-contract';

const service = (patch: Partial<AssignedService> = {}): AssignedService => ({
  id: 's1',
  state: 'ACTIVO',
  executionDate: '2026-11-25T00:00:00Z',
  route: { journeyId: 'j1', routeIndex: 1 },
  vehicle: { id: 'v1' },
  driver: { id: 'd1' },
  ...patch,
});

describe('assigned-services-contract', () => {
  it('lee la jornada, la ruta, el vehículo, el conductor y la fecha', () => {
    expect(readAssignment(service())).toEqual({
      journeyId: 'j1',
      routeIndex: 1,
      vehicleId: 'v1',
      driverId: 'd1',
      executionDate: '2026-11-25',
    });
  });

  it('es tolerante: objetos en null, jornada anidada e índice como texto', () => {
    expect(readAssignment(service({ route: null, vehicle: null, driver: null, executionDate: null }))).toEqual({
      journeyId: null,
      routeIndex: null,
      vehicleId: null,
      driverId: null,
      executionDate: null,
    });
    const refs = readAssignment(service({ route: { journey: { id: 'j9' }, routeIndex: '2' } }));
    expect(refs.journeyId).toBe('j9');
    expect(refs.routeIndex).toBe(2);
  });

  it('arma el cuerpo con el estado dado o ACTIVO', () => {
    const base = { journeyId: 'j1', routeIndex: 0, vehicleId: 'v1', driverId: 'd1', executionDate: '2026-12-01' };
    expect(assignmentBody(base)).toEqual({
      state: 'ACTIVO',
      route: { journeyId: 'j1', routeIndex: 0 },
      vehicle: { id: 'v1' },
      driver: { id: 'd1' },
      executionDate: '2026-12-01',
    });
    expect(assignmentBody(base, 'FINALIZADO').state).toBe('FINALIZADO');
  });

  it('reconoce el servicio de una ruta', () => {
    expect(isForRoute(service(), 'j1', 1)).toBeTrue();
    expect(isForRoute(service(), 'j1', 0)).toBeFalse();
    expect(isForRoute(service({ route: null }), 'j1', 1)).toBeFalse();
  });

  it('dateOnly solo acepta fechas ISO', () => {
    expect(dateOnly('2026-11-25')).toBe('2026-11-25');
    expect(dateOnly('25/11/2026')).toBeNull();
    expect(dateOnly(null)).toBeNull();
  });
});
