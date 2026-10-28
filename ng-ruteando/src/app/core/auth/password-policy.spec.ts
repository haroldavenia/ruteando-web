import { FormControl } from '@angular/forms';

import { PASSWORD_POLICY_TEXT, PASSWORD_REQUIREMENTS, missingRules, passwordPolicy } from './password-policy';

const VALIDA = 'Ruteando@2026abcdef'; // 19 caracteres, con las cuatro clases

const check = (value: string) => passwordPolicy(new FormControl(value));

describe('passwordPolicy', () => {
  it('una contraseña con 16 o más caracteres y las cuatro clases pasa', () => {
    expect(check(VALIDA)).toBeNull();
    expect(check('Abcdefghijklm1@x')).toBeNull(); // exactamente 16
  });

  it('un valor vacío no da error: lo cubre required', () => {
    expect(check('')).toBeNull();
  });

  it('con 15 caracteres falla solo por la longitud', () => {
    expect(check('Abcdefghijkl1@x')).toEqual({ policy: { length: true } });
  });

  it('la contraseña de 14 caracteres con # falla por la longitud y por el símbolo', () => {
    expect(check('Ruteando#2026x')).toEqual({ policy: { length: true, symbol: true } });
  });

  it('cada clase que falta se señala por separado', () => {
    expect(check('RUTEANDO@2026ABCDEF')).toEqual({ policy: { lower: true } });
    expect(check('ruteando@2026abcdef')).toEqual({ policy: { upper: true } });
    expect(check('Ruteando@abcdefghij')).toEqual({ policy: { digit: true } });
    expect(check('Ruteando2026abcdefg')).toEqual({ policy: { symbol: true } });
  });

  it('solo cuentan los símbolos @$!%*?& (un # o un _ no lo son)', () => {
    expect(check('Ruteando#2026abcdef')).toEqual({ policy: { symbol: true } });
    expect(check('Ruteando_2026abcdef')).toEqual({ policy: { symbol: true } });
    for (const symbol of '@$!%*?&') {
      expect(check(`Ruteando${symbol}2026abcdef`)).withContext(symbol).toBeNull();
    }
  });

  it('una mayúscula acentuada no cuenta como mayúscula', () => {
    expect(check('épico@2026abcdefgh')).toEqual({ policy: { upper: true } });
  });
});

describe('missingRules', () => {
  it('un valor vacío incumple las cinco reglas', () => {
    expect(missingRules('')).toEqual({ length: true, upper: true, lower: true, digit: true, symbol: true });
  });

  it('una contraseña válida no incumple ninguna', () => {
    expect(missingRules(VALIDA)).toEqual({});
  });

  it('va marcando las reglas que cumple a medida que se escribe', () => {
    expect(missingRules('r')).toEqual({ length: true, upper: true, digit: true, symbol: true });
    expect(missingRules('rR')).toEqual({ length: true, digit: true, symbol: true });
    expect(missingRules('rR1')).toEqual({ length: true, symbol: true });
    expect(missingRules('rR1@')).toEqual({ length: true });
  });
});

describe('requisitos mostrados', () => {
  it('son cinco, en este orden y con su texto', () => {
    expect(PASSWORD_REQUIREMENTS.map((r) => r.rule)).toEqual(['length', 'upper', 'lower', 'digit', 'symbol']);
    expect(PASSWORD_REQUIREMENTS.map((r) => r.label)).toEqual([
      'Al menos 16 caracteres',
      'Una mayúscula',
      'Una minúscula',
      'Un número',
      'Un símbolo (@$!%*?&)',
    ]);
  });

  it('el texto de la regla en una frase nombra los cuatro requisitos', () => {
    expect(PASSWORD_POLICY_TEXT).toBe('Mínimo 16 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&)');
  });
});
