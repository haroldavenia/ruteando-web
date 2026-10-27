import { TONE_ICONS, statusTone } from './status-tone';

describe('statusTone', () => {
  it('paquetes: atendido es éxito, pendiente neutro, no atendido aviso, cancelado peligro y devuelto información', () => {
    expect(['attended', 'pending', 'unattended', 'cancelled', 'returned'].map((k) => statusTone('package', k))).toEqual(['success', 'neutral', 'warning', 'danger', 'info']);
  });

  it('jornadas: completada es éxito, planificada y en curso información, fallida y cancelada peligro, en planificación neutro', () => {
    expect(['completed', 'planned', 'in_progress', 'failed', 'cancelled', 'planning'].map((k) => statusTone('journey', k))).toEqual(['success', 'info', 'info', 'danger', 'danger', 'neutral']);
  });

  it('las visitas usan los tonos de los paquetes y «No disponible» es neutro', () => {
    expect(statusTone('visit', 'attended')).toBe('success');
    expect(statusTone('visit', 'cancelled')).toBe('danger');
    expect(statusTone('visit', 'unavailable')).toBe('neutral');
    expect(statusTone('visit', null)).toBe('neutral');
  });

  it('un estado desconocido es neutro', () => {
    for (const domain of ['package', 'journey', 'visit'] as const) {
      expect(statusTone(domain, 'inventado')).toBe('neutral');
    }
  });

  it('cada tono tiene un icono distinto, para no depender solo del color', () => {
    const icons = Object.values(TONE_ICONS);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
