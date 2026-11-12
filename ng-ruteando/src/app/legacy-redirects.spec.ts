import { legacyPath } from './legacy-redirects';

describe('legacyPath', () => {
  it('traduce las rutas en español a las actuales', () => {
    expect(legacyPath(['acceso'])).toEqual(['access']);
    expect(legacyPath(['acceso', 'verificar-email'])).toEqual(['access', 'verify-email']);
    expect(legacyPath(['flota', 'vehiculos', 'nuevo'])).toEqual(['fleet', 'vehicles', 'new']);
    expect(legacyPath(['jornadas', 'abc', 'rutas', '2'])).toEqual(['journeys', 'abc', 'routes', '2']);
    expect(legacyPath(['legal', 'privacidad'])).toEqual(['legal', 'privacy']);
  });

  it('deja pasar las rutas actuales y las desconocidas', () => {
    expect(legacyPath(['fleet', 'vehicles'])).toBeNull();
    expect(legacyPath(['legal', 'sms'])).toBeNull();
    expect(legacyPath([])).toBeNull();
  });
});
