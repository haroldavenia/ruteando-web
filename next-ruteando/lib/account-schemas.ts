import { z } from 'zod';

import type { TFunction } from './i18n/core';
import { missingRules } from './password-policy';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Correo con los mismos mensajes en todas las pantallas de cuenta. */
export const emailField = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, t('Introduce tu correo'))
    .refine((value) => EMAIL.test(value), t('Introduce un correo válido'));

/** Contraseña nueva: la política del gateway (el gateway tiene la última palabra) y su confirmación. */
export const newPasswordShape = (t: TFunction) => ({
  password: z
    .string()
    .min(1, t('Introduce una contraseña'))
    .refine((value) => missingRules(value).size === 0, t('La contraseña no cumple los requisitos')),
  confirm: z.string().min(1, t('Confirma tu contraseña')),
});

/** Que la confirmación coincida: se cuelga del campo `confirm` para que el error salga bajo él. */
export const confirmMatches = (t: TFunction) => ({
  message: t('Las contraseñas no coinciden'),
  path: ['confirm'] as (string | number)[],
});
