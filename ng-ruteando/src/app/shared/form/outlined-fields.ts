import { Provider } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from '@angular/material/form-field';

const OUTLINED: MatFormFieldDefaultOptions = { appearance: 'outline' };

/** Campos con contorno en toda la aplicación (acceso y área privada); las esquinas de 12px salen del tema, en `styles.scss`. */
export const OUTLINED_FIELDS_PROVIDER: Provider = { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: OUTLINED };
