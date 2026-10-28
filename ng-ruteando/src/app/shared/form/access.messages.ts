/** Mensajes de validación de los formularios de acceso, por tipo de error. */
export const FIELD_ERRORS: Readonly<Record<string, string>> = {
  required: 'Este campo es obligatorio',
  email: 'Introduce un correo válido',
  minlength: 'Usa al menos 8 caracteres',
  mismatch: 'Las contraseñas no coinciden',
  // Lo que falta lo dice la lista de requisitos del campo de contraseña
  policy: 'La contraseña no cumple los requisitos',
};

export type FieldMessages = Readonly<Record<string, string>>;

/** Primer mensaje que corresponde a los errores de un control, con `overrides` por encima de los comunes. */
export function firstErrorMessage(errors: Readonly<Record<string, unknown>> | null, overrides: FieldMessages = {}): string {
  if (!errors) {
    return '';
  }
  const messages = { ...FIELD_ERRORS, ...overrides };
  for (const key of Object.keys(errors)) {
    if (messages[key]) {
      return messages[key];
    }
  }
  return '';
}
