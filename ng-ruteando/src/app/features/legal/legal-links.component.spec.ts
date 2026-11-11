import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LegalLinksComponent } from './legal-links.component';

describe('LegalLinksComponent', () => {
  it('enlaza los tres documentos y muestra el derecho de autor', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LegalLinksComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    const links = Array.from(root.querySelectorAll('a')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Política de privacidad', '/legal/privacidad'],
      ['Términos y condiciones', '/legal/terminos'],
      ['Verificación por SMS', '/legal/sms'],
    ]);
    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Información legal');
    expect(root.querySelector('.copy')?.textContent).toContain(`${new Date().getFullYear()} Ruteando`);
  });
});
