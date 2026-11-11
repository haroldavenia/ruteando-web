import { LANGUAGES } from '../../core/i18n/i18n';
import { LEGAL, LEGAL_CONTACT } from './legal-content';
import { LEGAL_DOCS } from './legal-docs';

describe('contenido legal', () => {
  for (const doc of LEGAL_DOCS) {
    it(`«${doc}» existe completo en los tres idiomas y con la misma estructura`, () => {
      const shape = (lang: (typeof LANGUAGES)[number]) =>
        LEGAL[lang][doc].sections.map((s) => [s.paragraphs?.length ?? 0, s.items?.length ?? 0]);
      for (const lang of LANGUAGES) {
        const text = LEGAL[lang][doc];
        expect(text.intro.trim()).withContext(`${lang} intro`).not.toBe('');
        expect(text.sections.length).withContext(`${lang} secciones`).toBeGreaterThanOrEqual(5);
        for (const s of text.sections) {
          expect(s.heading.trim()).withContext(`${lang} título`).not.toBe('');
          expect((s.paragraphs?.length ?? 0) + (s.items?.length ?? 0))
            .withContext(`${lang} ${s.heading}`)
            .toBeGreaterThan(0);
        }
      }
      expect(shape('en')).toEqual(shape('es'));
      expect(shape('pt')).toEqual(shape('es'));
    });
  }

  it('el cierre de contacto usa el marcador {email} solo cuando hay correo', () => {
    for (const lang of LANGUAGES) {
      expect(LEGAL_CONTACT[lang].withEmail).toContain('{email}');
      expect(LEGAL_CONTACT[lang].withoutEmail).not.toContain('{email}');
    }
  });

  it('el SMS de verificación explica el consentimiento, que no hay publicidad y cómo darse de baja', () => {
    const headings = LEGAL.es.sms.sections.map((s) => s.heading);
    expect(headings).toContain('Tu consentimiento');
    expect(headings).toContain('Cómo dejar de recibirlos');
  });
});
