import {
  DEFAULT_LENGTH_OF_STAY_TYPES,
  DEFAULT_RESTRICTION_TYPES,
  DEFAULT_ROUTE_TOPOLOGIES,
  SettingsSummary,
  describeSettings,
  lengthOfStayLabel,
  restrictionTypeLabel,
  routeTopologyLabel,
} from './settings-labels';

describe('describeSettings', () => {
  const base: SettingsSummary = {
    restrictionType: 'fixed_routes',
    routeTopology: 'round_trip',
    fixedRoutes: 3,
    shiftDurationMin: 480,
    placeStartName: 'Depósito central',
    placeEndName: null,
    vehicleCount: 3,
    evaluateWeight: true,
    evaluateVolume: true,
    evaluateItineraryZone: false,
  };
  const say = (changes: Partial<SettingsSummary>) => describeSettings({ ...base, ...changes });

  it('describe la configuración completa en una frase', () => {
    expect(say({})).toBe('Planificará 3 rutas (ida y vuelta) desde Depósito central, con 3 vehículos, evaluando peso y volumen.');
  });

  it('usa el singular con una ruta y un vehículo', () => {
    expect(say({ fixedRoutes: 1, vehicleCount: 1 })).toContain('1 ruta (ida y vuelta)');
    expect(say({ fixedRoutes: 1, vehicleCount: 1 })).toContain('con 1 vehículo,');
  });

  it('con una llegada distinta de la salida dice las dos; con la misma, solo la salida', () => {
    expect(say({ placeEndName: 'Almacén norte' })).toContain('desde Depósito central hasta Almacén norte');
    expect(say({ placeEndName: 'Depósito central' })).toContain('desde Depósito central,');
    expect(say({ placeEndName: 'Depósito central' })).not.toContain('hasta');
  });

  it('con turnos dice su duración en horas y minutos', () => {
    expect(say({ restrictionType: 'resource_vs_time', shiftDurationMin: 480 })).toContain('rutas con turnos de 8 h (ida y vuelta)');
    expect(say({ restrictionType: 'resource_vs_time', shiftDurationMin: 90 })).toContain('turnos de 1 h 30 min');
    expect(say({ restrictionType: 'resource_vs_time', shiftDurationMin: 45 })).toContain('turnos de 45 min');
    expect(say({ restrictionType: 'resource_vs_time', shiftDurationMin: null })).toContain('rutas según recursos y tiempo');
  });

  it('con ventanas horarias lo dice', () => {
    expect(say({ restrictionType: 'time_windows' })).toContain('rutas con ventanas horarias');
  });

  it('lista lo que se evalúa con comas y «y»', () => {
    expect(say({ evaluateWeight: true, evaluateVolume: false })).toContain('evaluando peso.');
    expect(say({ evaluateWeight: true, evaluateVolume: true, evaluateItineraryZone: true })).toContain('evaluando peso, volumen y zona del itinerario.');
    expect(say({ evaluateWeight: false, evaluateVolume: false })).not.toContain('evaluando');
  });

  it('lo que falta no se dice ni se inventa', () => {
    expect(say({ placeStartName: null })).toBe('Planificará 3 rutas (ida y vuelta), con 3 vehículos, evaluando peso y volumen.');
    expect(say({ vehicleCount: 0 })).not.toContain('vehículo');
    expect(say({ restrictionType: '', routeTopology: '', placeStartName: null, vehicleCount: 0, evaluateWeight: false, evaluateVolume: false })).toBe('Planificará rutas.');
    expect(say({ fixedRoutes: null })).toContain('Planificará rutas (ida y vuelta)');
    expect(say({ fixedRoutes: 0 })).toContain('Planificará rutas (ida y vuelta)');
    expect(say({ fixedRoutes: 2.5 })).toContain('Planificará rutas (ida y vuelta)');
  });

  it('una topología que el gateway añada se muestra con su clave', () => {
    expect(say({ routeTopology: 'nueva_forma' })).toContain('(nueva_forma)');
  });
});

describe('etiquetas de configuraciones', () => {
  it('traduce las topologías', () => {
    expect(DEFAULT_ROUTE_TOPOLOGIES.map(routeTopologyLabel)).toEqual([
      'Del depósito al depósito',
      'Ida y vuelta',
      'Entrega abierta',
      'Recogida abierta',
      'Flexible',
    ]);
  });

  it('traduce los tipos de restricción', () => {
    expect(DEFAULT_RESTRICTION_TYPES.map(restrictionTypeLabel)).toEqual(['Rutas fijas', 'Recursos y tiempo', 'Ventanas horarias']);
  });

  it('traduce los tipos de estancia', () => {
    expect(DEFAULT_LENGTH_OF_STAY_TYPES.map(lengthOfStayLabel)).toEqual(['Fija', 'Definida en el itinerario']);
  });

  it('un valor desconocido se muestra con su clave y null queda vacío', () => {
    expect(routeTopologyLabel('teleport')).toBe('teleport');
    expect(restrictionTypeLabel('otra')).toBe('otra');
    expect(lengthOfStayLabel(null)).toBe('');
  });
});
