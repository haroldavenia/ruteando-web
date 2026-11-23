import { setDictionary } from './i18n';
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  const pipe = new TranslatePipe();

  it('devuelve el texto fuente en español', () => {
    expect(pipe.transform('Guardar')).toBe('Guardar');
  });

  it('traduce con el diccionario activo y sustituye los parámetros', () => {
    setDictionary({ Guardar: 'Save', 'Mostrando {0} de {1}': 'Showing {0} of {1}' });
    expect(pipe.transform('Guardar')).toBe('Save');
    expect(pipe.transform('Mostrando {0} de {1}', [20, 100])).toBe('Showing 20 of 100');
  });

  it('un texto sin traducción sale como está escrito', () => {
    setDictionary({ Guardar: 'Save' });
    expect(pipe.transform('Cancelar')).toBe('Cancelar');
  });
});
