'use client';

import { RiCheckboxBlankCircleLine, RiCheckboxCircleLine, RiCloseCircleLine } from '@remixicon/react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { missingRules, PASSWORD_REQUIREMENTS } from '@/lib/password-policy';

/**
 * Lista de requisitos de la contraseña. Cada uno es pendiente (aún no se ha intentado), cumplido o no cumplido (solo tras tocar el campo
 * o enviar); el estado va también como texto para el lector de pantalla, no solo como color o icono.
 */
export function PasswordRequirements({ id, value, touched }: { id: string; value: string; touched: boolean }) {
  const t = useT();
  const missing = missingRules(value);
  return (
    <ul id={id} aria-label={t('Requisitos de la contraseña')} className="-mt-2 grid gap-1 text-sm">
      {PASSWORD_REQUIREMENTS.map(({ rule, label, args }) => {
        const met = !missing.has(rule);
        const failed = !met && touched;
        return (
          <li
            key={rule}
            className={cn(
              'flex items-center gap-2',
              met ? 'text-on-success-container' : failed ? 'text-error' : 'text-on-surface-variant'
            )}
          >
            <Icon
              icon={met ? RiCheckboxCircleLine : failed ? RiCloseCircleLine : RiCheckboxBlankCircleLine}
              size={18}
            />
            <span>{t(label, args)}</span>
            <span className="sr-only"> — {met ? t('cumplido') : failed ? t('no cumplido') : t('pendiente')}</span>
          </li>
        );
      })}
    </ul>
  );
}
