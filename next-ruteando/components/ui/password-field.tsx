'use client';

import { RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useState } from 'react';

import { useT } from '@/lib/i18n/client';

import { Input, type InputProps } from './field';
import { IconButton } from './icon-button';

/**
 * Campo de contraseña con botón para mostrarla u ocultarla (`aria-pressed` y nombre que cambia con el estado). Todo lo demás es un
 * `Input`: etiqueta flotante, pista, error y `autoComplete` (`current-password` al entrar, `new-password` al elegirla).
 */
export function PasswordField(props: Omit<InputProps, 'type' | 'trailing'>) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <IconButton
          label={visible ? t('Ocultar contraseña') : t('Mostrar contraseña')}
          icon={visible ? RiEyeOffLine : RiEyeLine}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        />
      }
    />
  );
}
