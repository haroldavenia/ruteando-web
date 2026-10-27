import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusBadgeComponent } from './status-badge.component';
import { StatusTone } from './status-tone';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;
  const root = () => fixture.nativeElement as HTMLElement;

  function render(label: string, tone?: StatusTone, icon?: string): void {
    fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('label', label);
    if (tone) {
      fixture.componentRef.setInput('tone', tone);
    }
    if (icon) {
      fixture.componentRef.setInput('icon', icon);
    }
    fixture.detectChanges();
  }

  it('el texto del componente es solo el nombre del estado (el icono no añade texto)', () => {
    render('Atendido', 'success');
    expect(root().textContent!.trim()).toBe('Atendido');
  });

  it('muestra icono y nombre del estado en español', () => {
    render('Atendido', 'success');
    expect(root().querySelector('span')?.textContent).toBe('Atendido');
    expect(root().querySelector('mat-icon')?.getAttribute('fontIcon')).toBe('check_circle');
  });

  it('el icono es decorativo: los lectores de pantalla anuncian solo el nombre', () => {
    render('Cancelado', 'danger');
    expect(root().querySelector('mat-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(root().textContent!.trim()).toBe('Cancelado');
  });

  it('el tono por defecto es neutro y se expone para los estilos', () => {
    render('Pendiente');
    expect(root().getAttribute('data-tone')).toBe('neutral');
    render('Fallida', 'danger');
    expect(root().getAttribute('data-tone')).toBe('danger');
  });

  it('cada tono usa un fondo distinto del tema', () => {
    const backgrounds = (['neutral', 'success', 'info', 'warning', 'danger'] as StatusTone[]).map((tone) => {
      render('x', tone);
      document.body.appendChild(root());
      const bg = getComputedStyle(root()).backgroundColor;
      root().remove();
      return bg;
    });
    expect(new Set(backgrounds).size).toBe(5);
  });

  it('permite un icono propio', () => {
    render('Devuelto', 'info', 'undo');
    expect(root().querySelector('mat-icon')?.getAttribute('fontIcon')).toBe('undo');
  });
});
