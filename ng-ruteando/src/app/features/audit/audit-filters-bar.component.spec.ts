import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AuditFilters, EMPTY_FILTERS } from './audit-filters';
import { AuditFiltersBarComponent } from './audit-filters-bar.component';

describe('AuditFiltersBarComponent', () => {
  let fixture: ComponentFixture<AuditFiltersBarComponent>;
  let emitted: Partial<AuditFilters>[];
  const root = () => fixture.nativeElement as HTMLElement;
  const chip = (text: string) => (Array.from(root().querySelectorAll('button.audit-chip')) as HTMLButtonElement[]).find((b) => b.textContent?.trim().startsWith(text))!;
  const switches = () => Array.from(root().querySelectorAll('button[role=switch]')) as HTMLButtonElement[];

  const setup = (filters: AuditFilters = EMPTY_FILTERS, inputs: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(AuditFiltersBarComponent);
    fixture.componentRef.setInput('filters', filters);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    emitted = [];
    fixture.componentInstance.filtersChange.subscribe((change) => emitted.push(change));
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNoopAnimations()] }));

  it('ofrece los rangos rápidos y el personalizado, con «Todo» marcado al empezar', () => {
    setup();
    expect(Array.from(root().querySelectorAll('button.audit-chip')).map((b) => b.textContent?.trim())).toEqual(['24 horas', '7 días', '30 días', 'Todo', 'Personalizado']);
    expect(chip('Todo').getAttribute('aria-pressed')).toBe('true');
    expect(chip('7 días').getAttribute('aria-pressed')).toBe('false');
  });

  it('elegir un rango rápido avisa del rango y borra las fechas', () => {
    setup({ ...EMPTY_FILTERS, range: 'personalizado', from: '2026-10-01', to: '2026-10-05' });
    chip('30 días').click();
    expect(emitted).toEqual([{ range: '30d', from: null, to: null }]);
  });

  it('«Personalizado» se abre aplicado a los últimos siete días', () => {
    setup();
    chip('Personalizado').click();
    fixture.detectChanges();
    expect(emitted.length).toBe(1);
    const { range, from, to } = emitted[0];
    expect(range).toBe('personalizado');
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Date.parse(to as string) - Date.parse(from as string)).toBe(6 * 86_400_000);
    expect(root().querySelectorAll('input[type=date]').length).toBe(2);
  });

  it('«Personalizado» con fechas ya puestas no las pisa', () => {
    setup({ ...EMPTY_FILTERS, range: 'personalizado', from: '2026-10-01', to: '2026-10-05' });
    chip('Personalizado').click();
    expect(emitted).toEqual([]);
    const [from, to] = Array.from(root().querySelectorAll('input[type=date]')) as HTMLInputElement[];
    expect([from.value, to.value]).toEqual(['2026-10-01', '2026-10-05']);
  });

  it('cambiar una fecha avisa con el rango personalizado', () => {
    setup({ ...EMPTY_FILTERS, range: 'personalizado', from: '2026-10-01', to: '2026-10-05' });
    const to = root().querySelectorAll('input[type=date]')[1] as HTMLInputElement;
    to.value = '2026-10-09';
    to.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([{ range: 'personalizado', from: '2026-10-01', to: '2026-10-09' }]);
  });

  it('borrar las dos fechas vuelve a «Todo»', () => {
    setup({ ...EMPTY_FILTERS, range: 'personalizado', from: '2026-10-01', to: null });
    const from = root().querySelectorAll('input[type=date]')[0] as HTMLInputElement;
    from.value = '';
    from.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([{ range: 'todo', from: null, to: null }]);
  });

  it('un inicio posterior al fin dice qué corregir y no avisa', () => {
    setup({ ...EMPTY_FILTERS, range: 'personalizado', from: '2026-10-01', to: '2026-10-05' });
    const from = root().querySelectorAll('input[type=date]')[0] as HTMLInputElement;
    from.value = '2026-10-09';
    from.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(emitted).toEqual([]);
    expect(root().querySelector('[role=alert]')?.textContent).toContain('El inicio no puede ser posterior al fin');
  });

  it('un fin anterior al inicio también se corrige', () => {
    setup({ ...EMPTY_FILTERS, range: 'personalizado', from: '2026-10-05', to: '2026-10-07' });
    const to = root().querySelectorAll('input[type=date]')[1] as HTMLInputElement;
    to.value = '2026-10-01';
    to.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(root().querySelector('[role=alert]')?.textContent).toContain('El fin no puede ser anterior al inicio');
  });

  it('«solo con cambios de valores» avisa del interruptor', () => {
    setup();
    switches()[0].click();
    expect(emitted).toEqual([{ onlyChanges: true }]);
  });

  it('«mostrar datos técnicos» es de presentación: avisa por su propia salida y no filtra', () => {
    setup();
    const technical: boolean[] = [];
    fixture.componentInstance.technicalChange.subscribe((on) => technical.push(on));
    switches()[1].click();
    expect(technical).toEqual([true]);
    expect(emitted).toEqual([]);
  });

  it('«Limpiar filtros» solo aparece con algún filtro y avisa', () => {
    setup();
    const cleared: number[] = [];
    fixture.componentInstance.cleared.subscribe(() => cleared.push(1));
    expect(root().textContent).not.toContain('Limpiar filtros');

    fixture.componentRef.setInput('filters', { ...EMPTY_FILTERS, kind: 'creacion' });
    fixture.detectChanges();
    const clear = (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes('Limpiar filtros'))!;
    clear.click();
    expect(cleared.length).toBe(1);
  });

  it('el filtro de entidad se muestra con su nombre y su cola, y se quita con un clic', () => {
    setup({ ...EMPTY_FILTERS, entityId: '6acb99b48275a26dbdf8fcf5' }, { entityLabel: 'Vehículo' });
    const remove = root().querySelector('button[aria-label="Quitar el filtro de entidad"]') as HTMLButtonElement;
    expect(remove.textContent).toContain('Vehículo');
    expect(remove.textContent).toContain('8fcf5'.slice(-5));
    expect(remove.getAttribute('title')).toBe('Quitar el filtro de entidad');
    remove.click();
    expect(emitted).toEqual([{ entityId: null }]);
  });

  it('las listas de tipo de acción y de persona traen sus opciones', () => {
    setup(EMPTY_FILTERS, { people: ['ana@example.com', 'luis@example.com'], hasUnidentified: true });
    const labels = Array.from(root().querySelectorAll('mat-form-field mat-label')).map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Tipo de acción', 'Persona']);
  });

  it('en «Mi actividad» no ofrece elegir una persona', () => {
    setup(EMPTY_FILTERS, { showPeople: false });
    expect(Array.from(root().querySelectorAll('mat-form-field mat-label')).map((el) => el.textContent?.trim())).toEqual(['Tipo de acción']);
  });

  it('el grupo de rangos tiene nombre y cada filtro su etiqueta', () => {
    setup();
    expect(root().querySelector('[role=group][aria-labelledby=audit-range-label]')).not.toBeNull();
    expect(root().querySelector('#audit-range-label')?.textContent).toContain('¿Cuándo?');
    expect(root().querySelector('section')?.getAttribute('aria-labelledby')).toBe('audit-filters-title');
  });
});
