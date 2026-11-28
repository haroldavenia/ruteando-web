'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/client';
import { mfaApi } from '@/lib/mfa-client';
import { cleanCode, MFA_ICON, MFA_LABEL, type MfaChallengeMethod, type MfaMethod } from '@/lib/mfa-labels';

/** Código con el que la persona autoriza una acción sensible: de qué método viene y el código. */
export interface MfaStepUpResult {
  via: MfaChallengeMethod;
  code: string;
}

/**
 * Pide un código de un método activo (o de recuperación) para autorizar una acción sensible: desactivar un método o pedir códigos de
 * recuperación nuevos. Con correo o SMS envía el código al elegirlo; la acción en sí la hace quien lo usa (`error` y `busy` vienen de él).
 */
export function MfaStepUp({
  methods,
  hasRecovery = false,
  confirmLabel,
  busy = false,
  error = null,
  onConfirmed,
  onCancelled,
}: {
  /** Métodos activos con los que se puede confirmar. */
  methods: readonly MfaMethod[];
  /** Si quedan códigos de recuperación, también valen. */
  hasRecovery?: boolean;
  confirmLabel?: string;
  busy?: boolean;
  /** Fallo de la acción, que sabe quien usa este componente. */
  error?: string | null;
  onConfirmed: (result: MfaStepUpResult) => void;
  onCancelled: () => void;
}) {
  const t = useT();
  const api = useMemo(() => mfaApi(t), [t]);
  const options = useMemo<MfaChallengeMethod[]>(
    () => [...methods, ...(hasRecovery ? (['recovery'] as const) : [])],
    [methods, hasRecovery]
  );
  const [chosen, setChosen] = useState<MfaChallengeMethod | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /** La aplicación autenticadora primero (no manda nada); si no, lo primero que haya. */
  const via: MfaChallengeMethod =
    chosen && options.includes(chosen) ? chosen : options.includes('totp') ? 'totp' : (options[0] ?? 'recovery');
  const canSend = via === 'email' || via === 'sms';
  const prompt =
    via === 'totp'
      ? t('Para confirmar, escribe el código de tu aplicación autenticadora.')
      : via === 'recovery'
        ? t('Para confirmar, escribe uno de tus códigos de recuperación.')
        : t('Para confirmar, pide un código y escríbelo aquí.');

  async function send() {
    if ((via !== 'email' && via !== 'sms') || sending) return;
    setSending(true);
    setSendError(null);
    try {
      setInfo(t('Código enviado a {0}', [(await api.sessionSend(via)).destination ?? '']));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        if (!code.trim()) return setCodeError(t('Escribe el código'));
        setCodeError(null);
        if (!busy) onConfirmed({ via, code: cleanCode(code) });
      }}
      className="flex flex-col gap-3"
    >
      <p>{prompt}</p>
      {options.length > 1 ? (
        <div role="group" aria-label={t('Método de confirmación')} className="flex flex-wrap gap-2">
          {options.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={m === via}
              onClick={() => {
                setChosen(m);
                setCode('');
                setSendError(null);
                setInfo(null);
              }}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-4 text-sm',
                m === via
                  ? 'border-transparent bg-secondary-container text-on-secondary-container'
                  : 'border-outline text-primary'
              )}
            >
              <Icon icon={MFA_ICON[m]} size={20} />
              {t(MFA_LABEL[m])}
            </button>
          ))}
        </div>
      ) : null}
      <Input
        label={t('Código')}
        leading={MFA_ICON[via]}
        inputMode={via === 'recovery' ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        error={codeError ?? undefined}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <FormResult error={error || sendError} success={info} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outlined" onClick={onCancelled}>
          {t('Cancelar')}
        </Button>
        {canSend ? (
          <Button variant="text" disabled={sending} onClick={() => void send()}>
            {t('Enviar código')}
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={busy}>
          {confirmLabel ?? t('Confirmar')}
        </Button>
      </div>
    </Form>
  );
}
