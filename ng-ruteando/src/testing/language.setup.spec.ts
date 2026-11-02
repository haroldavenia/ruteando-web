// `beforeEach` global (fuera de cualquier `describe`): aplica a todas las pruebas. Las pruebas de idiomas cambian el idioma dentro de
// su propio caso y esto lo devuelve al español, que es el de los textos fuente que comprueban el resto de pruebas.
import { setDictionary, useLanguage } from '../app/core/i18n/i18n';

beforeEach(() => {
  useLanguage('es', false);
  setDictionary({});
});
