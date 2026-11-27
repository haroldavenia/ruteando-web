'use client';

import { RiLockLine } from '@remixicon/react';
import { type FocusEvent, useId, useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { PasswordField } from '@/components/ui/password-field';
import { useT } from '@/lib/i18n/client';
import { missingRules } from '@/lib/password-policy';

import { PasswordRequirements } from './password-requirements';

/**
 * Contraseña nueva y su confirmación (registro y restablecimiento). Los requisitos salen al enfocar el campo y, una vez tocado o tras un
 * envío fallido, mientras falte alguno (así se ve cuál). `passwordProps` y `confirmProps` son lo que devuelve `register()`; el valor lo
 * da el formulario (`watch`), porque aquí no hay estado propio de la contraseña.
 */
export function NewPasswordFields({
  passwordProps,
  confirmProps,
  value,
  submitted,
  passwordError,
  confirmError,
  passwordLabel,
}: {
  passwordProps: UseFormRegisterReturn;
  confirmProps: UseFormRegisterReturn;
  value: string;
  submitted: boolean;
  passwordError?: string;
  confirmError?: string;
  passwordLabel?: string;
}) {
  const t = useT();
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const failing = (touched || submitted) && missingRules(value).size > 0;
  const open = focused || failing;

  return (
    <>
      <PasswordField
        label={passwordLabel ?? t('Contraseña')}
        autoComplete="new-password"
        leading={RiLockLine}
        error={passwordError}
        aria-describedby={open ? listId : undefined}
        {...passwordProps}
        onFocus={() => setFocused(true)}
        onBlur={(event: FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          setTouched(true);
          return passwordProps.onBlur(event);
        }}
      />
      {open ? <PasswordRequirements id={listId} value={value} touched={touched || submitted} /> : null}
      <PasswordField
        label={t('Confirmar contraseña')}
        autoComplete="new-password"
        leading={RiLockLine}
        error={confirmError}
        {...confirmProps}
      />
    </>
  );
}
