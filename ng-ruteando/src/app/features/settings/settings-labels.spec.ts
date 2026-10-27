import {
  DEFAULT_LENGTH_OF_STAY_TYPES,
  DEFAULT_RESTRICTION_TYPES,
  DEFAULT_ROUTE_TOPOLOGIES,
  lengthOfStayLabel,
  restrictionTypeLabel,
  routeTopologyLabel,
} from './settings-labels';

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
