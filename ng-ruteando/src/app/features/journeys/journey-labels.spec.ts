import { journeyStatusLabel, stopTypeLabel } from './journey-labels';

describe('etiquetas de jornadas', () => {
  it('traduce los estados, incluidos planned y completed', () => {
    expect(['planning', 'planned', 'in_progress', 'completed', 'failed', 'cancelled'].map(journeyStatusLabel)).toEqual([
      'En planificación',
      'Planificada',
      'En curso',
      'Completada',
      'Fallida',
      'Cancelada',
    ]);
  });

  it('traduce los tipos de parada', () => {
    expect(['depot', 'delivery', 'pickup', 'service'].map(stopTypeLabel)).toEqual(['Depósito', 'Entrega', 'Recogida', 'Servicio']);
  });

  it('un valor desconocido se muestra con su clave y null queda vacío', () => {
    expect(journeyStatusLabel('archived')).toBe('archived');
    expect(stopTypeLabel('refuel')).toBe('refuel');
    expect(journeyStatusLabel(null)).toBe('');
  });
});
