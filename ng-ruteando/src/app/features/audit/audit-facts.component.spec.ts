import { ComponentFixture, TestBed } from '@angular/core/testing';

import { auditLog } from '../../../testing/audit';

import { AuditFactsComponent } from './audit-facts.component';

describe('AuditFactsComponent', () => {
  let fixture: ComponentFixture<AuditFactsComponent>;
  const root = () => fixture.nativeElement as HTMLElement;
  const person = () => root().querySelector('.audit-fact-text b') as HTMLElement;

  function render(actorEmail: string | null, width?: string): void {
    fixture = TestBed.createComponent(AuditFactsComponent);
    if (width) {
      root().style.width = width;
    }
    fixture.componentRef.setInput('log', auditLog({ actorEmail }));
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [AuditFactsComponent] }));

  it('muestra el correo tal cual: los puntos de corte no cambian el texto que se lee ni se copia', () => {
    render('ana.martinez@ruteando.demo');
    expect(person().textContent).toBe('ana.martinez@ruteando.demo');
    expect(person().querySelectorAll('wbr').length).toBe(4);
  });

  it('sin correo dice «Sin identificar»', () => {
    render(null);
    expect(person().textContent).toBe('Sin identificar');
  });

  it('en una caja estrecha el correo baja de línea por la arroba y los puntos, no a mitad de palabra', () => {
    render('ana.martinez@ruteando.demo', '200px');
    const nodes = Array.from(person().childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    expect(nodes.length).toBe(4);
    // Un trozo partido por dentro ocuparía varios fragmentos de línea: cada uno debe caber entero en una
    for (const node of nodes) {
      const range = document.createRange();
      range.selectNodeContents(node);
      expect(range.getClientRects().length).withContext(node.textContent ?? '').toBe(1);
    }
    // Y el correo entero sí ocupa más de una línea: la prueba mide una caja en la que no cabe
    const all = document.createRange();
    all.selectNodeContents(person());
    expect(new Set(Array.from(all.getClientRects()).map((r) => Math.round(r.top))).size).toBeGreaterThan(1);
  });
});
