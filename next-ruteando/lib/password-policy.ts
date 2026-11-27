/** Política de contraseña del gateway para el registro y el restablecimiento; el gateway tiene la última palabra. */
export const PASSWORD_POLICY_LENGTH = 16;
export const PASSWORD_SYMBOLS = '@$!%*?&';

export type PasswordRule = 'length' | 'upper' | 'lower' | 'digit' | 'symbol';

// Como el gateway: letras ASCII (una `É` no cuenta como mayúscula) y solo estos símbolos
const CLASSES: Readonly<Record<Exclude<PasswordRule, 'length'>, RegExp>> = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  digit: /[0-9]/,
  symbol: new RegExp(`[${PASSWORD_SYMBOLS}]`),
};

/** Los requisitos que se muestran como lista, en este orden. Los textos son claves en español de `t()`; `{0}` lleva el valor de `args`. */
export const PASSWORD_REQUIREMENTS: readonly {
  rule: PasswordRule;
  label: string;
  args?: readonly (string | number)[];
}[] = [
  { rule: 'length', label: 'Al menos {0} caracteres', args: [PASSWORD_POLICY_LENGTH] },
  { rule: 'upper', label: 'Una mayúscula' },
  { rule: 'lower', label: 'Una minúscula' },
  { rule: 'digit', label: 'Un número' },
  { rule: 'symbol', label: 'Un símbolo ({0})', args: [PASSWORD_SYMBOLS] },
];

/** La regla en una frase (clave de `t()` y sus argumentos): es lo que se muestra cuando el gateway rechaza la contraseña. */
export const PASSWORD_POLICY_TEXT = {
  key: 'Mínimo {0} caracteres, con mayúscula, minúscula, número y un símbolo ({1})',
  args: [PASSWORD_POLICY_LENGTH, PASSWORD_SYMBOLS] as const,
};

/** Reglas que NO cumple `value`; un valor vacío las incumple todas. */
export function missingRules(value: string): Set<PasswordRule> {
  const missing = new Set<PasswordRule>();
  if (value.length < PASSWORD_POLICY_LENGTH) missing.add('length');
  for (const rule of Object.keys(CLASSES) as (keyof typeof CLASSES)[]) {
    if (!CLASSES[rule].test(value)) missing.add(rule);
  }
  return missing;
}

/** `true` si la contraseña cumple todas las reglas. */
export const meetsPolicy = (value: string) => missingRules(value).size === 0;
