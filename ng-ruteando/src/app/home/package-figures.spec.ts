import { Package } from '../core/api/models';

import { FIGURES_SAMPLE_SIZE, packageFigures } from './package-figures';

const item = (status: string) => ({ status }) as Package;
const page = (statuses: string[], totalElements = statuses.length) => ({ content: statuses.map(item), totalElements });

describe('packageFigures', () => {
  it('cuenta atendidos, pendientes y sin atender, y da el porcentaje de atendidos', () => {
    const figures = packageFigures(page(['attended', 'attended', 'attended', 'pending', 'unattended', 'cancelled', 'returned', 'pending']));
    expect(figures.sample).toBe(8);
    expect(figures.attended).toBe(3);
    expect(figures.pending).toBe(2);
    expect(figures.unattended).toBe(1);
    expect(figures.percent).toBeCloseTo(37.5, 5);
  });

  it('son exactas cuando todos los paquetes caben en la página', () => {
    const figures = packageFigures(page(['attended', 'pending'], 2));
    expect(figures.exact).toBeTrue();
    expect(figures.total).toBe(2);
  });

  it('si hay más paquetes que los recibidos, avisa de que son los más recientes y conserva el total', () => {
    const figures = packageFigures(page(['attended', 'pending'], 250));
    expect(figures.exact).toBeFalse();
    expect(figures.total).toBe(250);
    expect(figures.sample).toBe(2);
  });

  it('sin paquetes todo es cero y el porcentaje no es NaN', () => {
    const figures = packageFigures(page([], 0));
    expect(figures).toEqual({ sample: 0, total: 0, exact: true, attended: 0, pending: 0, unattended: 0, percent: 0 });
  });

  it('un total menor que lo recibido (dato incoherente) no resta: el total nunca baja de la muestra', () => {
    const figures = packageFigures(page(['attended', 'pending', 'pending'], 1));
    expect(figures.total).toBe(3);
    expect(figures.exact).toBeTrue();
  });

  it('un estado que la aplicación no conoce no cuenta en ninguna cifra, pero sí en la muestra', () => {
    const figures = packageFigures(page(['demo_xyz', 'attended']));
    expect(figures.attended).toBe(1);
    expect(figures.pending).toBe(0);
    expect(figures.sample).toBe(2);
    expect(figures.percent).toBe(50);
  });

  it('pide un tamaño de muestra razonable: una sola petición, no toda la tabla', () => {
    expect(FIGURES_SAMPLE_SIZE).toBe(100);
  });
});
