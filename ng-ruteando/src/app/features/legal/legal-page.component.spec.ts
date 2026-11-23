import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { LegalDoc } from './legal-docs';
import { LegalPageComponent } from './legal-page.component';

describe('LegalPageComponent', () => {
  let fixture: ComponentFixture<LegalPageComponent>;
  let root: HTMLElement;

  function open(doc: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { data: of({ doc }) } },
      ],
    });
    fixture = TestBed.createComponent(LegalPageComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  }

  const cases: [LegalDoc, string][] = [
    ['privacy', 'Política de privacidad'],
    ['terms', 'Términos y condiciones'],
    ['sms', 'Verificación por SMS'],
  ];
  for (const [doc, title] of cases) {
    it(`«${doc}» muestra su título, la fecha y las secciones`, () => {
      open(doc);
      expect(root.querySelector('h1')?.textContent?.trim()).toBe(title);
      expect(root.querySelector('.updated')?.textContent).toContain('Última actualización');
      expect(root.querySelectorAll('section h2').length).toBeGreaterThan(5);
    });
  }

  it('sin correo de contacto configurado remite a quien administra la empresa', () => {
    open('privacy');
    const last = Array.from(root.querySelectorAll('section')).at(-1)!;
    expect(last.querySelector('h2')?.textContent).toBe('Contacto');
    expect(last.textContent).toContain('persona que administra Ruteando');
  });

  it('un documento desconocido cae en la política de privacidad en vez de romper', () => {
    open('otra-cosa');
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Política de privacidad');
  });

  it('marca como actual el documento que se está leyendo y deja ir a los otros', () => {
    open('terms');
    const hrefs = Array.from(root.querySelectorAll('footer a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/legal/privacy', '/legal/terms', '/legal/sms']);
  });

  it('el botón Volver regresa a donde estaba la persona o, sin historial, va al inicio', () => {
    open('privacy');
    const back = spyOn(TestBed.inject(Location), 'back');
    const go = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    const button = root.querySelector('button.back') as HTMLButtonElement;
    expect(button.textContent).toContain('Volver');
    button.click();

    expect(back.calls.count() + go.calls.count()).toBe(1);
    if (go.calls.count()) {
      expect(go).toHaveBeenCalledWith('/');
    }
  });
});
