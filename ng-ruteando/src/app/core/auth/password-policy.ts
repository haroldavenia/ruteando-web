import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Política de contraseña del gateway para el registro y el restablecimiento; el gateway tiene la última palabra. */
export const PASSWORD_POLICY_LENGTH = 16;
export const PASSWORD_SYMBOLS = '@$!%*?&';

/** La regla en una frase: es lo que se muestra cuando el gateway rechaza la contraseña. */
export const PASSWORD_POLICY_TEXT = `Mínimo ${PASSWORD_POLICY_LENGTH} caracteres, con mayúscula, minúscula, número y un símbolo (${PASSWORD_SYMBOLS})`;

export type PasswordRule = 'length' | 'upper' | 'lower' | 'digit' | 'symbol';
/** Reglas que incumple una contraseña (solo las que faltan). */
export type PasswordPolicyError = Partial<Record<PasswordRule, true>>;

/** Los requisitos que se muestran como lista, en este orden. */
export const PASSWORD_REQUIREMENTS: readonly { readonly rule: PasswordRule; readonly label: string }[] = [
  { rule: 'length', label: `Al menos ${PASSWORD_POLICY_LENGTH} caracteres` },
  { rule: 'upper', label: 'Una mayúscula' },
  { rule: 'lower', label: 'Una minúscula' },
  { rule: 'digit', label: 'Un número' },
  { rule: 'symbol', label: `Un símbolo (${PASSWORD_SYMBOLS})` },
];

// Como el gateway: letras ASCII (una `É` no cuenta como mayúscula) y solo estos símbolos
const CLASSES: Readonly<Record<Exclude<PasswordRule, 'length'>, RegExp>> = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  digit: /[0-9]/,
  symbol: new RegExp(`[${PASSWORD_SYMBOLS}]`),
};

/** Reglas que no cumple `value`; un valor vacío las incumple todas. */
export function missingRules(value: string): PasswordPolicyError {
  const missing: PasswordPolicyError = {};
  if (value.length < PASSWORD_POLICY_LENGTH) {
    missing.length = true;
  }
  for (const rule of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
    if (!CLASSES[rule].test(value)) {
      missing[rule] = true;
    }
  }
  return missing;
}

/** Valida la política y deja en `policy` lo que falta. Un valor vacío no da error: lo cubre `required`. */
export function passwordPolicy(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  const missing = missingRules(value);
  return Object.keys(missing).length ? { policy: missing } : null;
}
