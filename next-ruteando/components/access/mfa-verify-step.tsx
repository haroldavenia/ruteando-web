'use client';

import { RiArrowRightSLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';

import { AccessTitle, Lead } from '@/components/access/step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { LinkButton } from '@/components/ui/link-button';
import { ApiError } from '@/lib/api-client';
import { DEAD_CHALLENGE, type MfaChallenge, type MfaMethodOption, mfaSend, mfaVerify } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';
import { cleanCode, MFA_ICON, MFA_LABEL, type MfaChallengeMethod } from '@/lib/mfa-labels';

/** Con un solo método y que sea correo o SMS, el código se envía al llegar a este paso. */
const sendsOnArrival = (challenge: MfaChallenge) => {
  const choices = challenge.methods.filter((m) => m.method !== 'recovery');
  return choices.length === 1 && (choices[0].method === 'email' || choices[0].method === 'sms');
};

interface Props {
  challenge: MfaChallenge;
  /** La sesión ya está abierta (el servidor escribió las cookies). */
  onVerified: () => void;
  /** Hay que volver al primer paso; el texto explica por qué (vacío si la persona solo volvió). */
  onCancelled: (message: string) => void;
}

/**
 * Segundo paso del acceso: la persona supera el reto con un método activo (correo, SMS, aplicación autenticadora) o con un código de
 * recuperación. La sesión solo se abre al acertar; hasta entonces el navegador no tiene ninguna cookie de sesión ni token.
 */
export function MfaVerifyStep({ challenge, onVerified, onCancelled }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const [chosen, setChosen] = useState<MfaChallengeMethod | null>(null);
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  // Con un solo método de correo o SMS el código se envía al llegar: ya se arranca «ocupado» para no pintar un instante un botón libre
  const [loading, setLoading] = useState(() => sendsOnArrival(challenge));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Los métodos que la persona tiene activos; el código de recuperación va aparte
  const choices = challenge.methods.filter((m) => m.method !== 'recovery');
  const hasRecovery = challenge.methods.some((m) => m.method === 'recovery');
  // Con más de un método activo se pregunta cuál usar antes de pedir o enviar nada; con uno solo se va directo
  const picking = chosen === null && choices.length > 1;
  const method: MfaChallengeMethod = chosen ?? choices[0]?.method ?? 'recovery';
  const canResend = method === 'email' || method === 'sms';
  const others = challenge.methods.filter((m) => m.method !== method);
  const destination = challenge.methods.find((m) => m.method === method)?.destination ?? '';

  function fail(err: unknown) {
    setLoading(false);
    if (err instanceof ApiError && err.code && DEAD_CHALLENGE.includes(err.code)) {
      onCancelled(err.message);
      return;
    }
    setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
  }

  /** Pide el envío del código; el estado de «ocupado» lo pone quien llama (así el envío inicial no cambia estado dentro de un efecto). */
  function deliver(target: 'email' | 'sms') {
    return mfaSend(challenge.challengeId, target, t).then(
      (to) => {
        setLoading(false);
        setInfo(t('Código enviado a {0}', [to ?? '']));
      },
      (err: unknown) => fail(err)
    );
  }

  function send(target: MfaChallengeMethod) {
    if ((target !== 'email' && target !== 'sms') || loading) return;
    setLoading(true);
    setError(null);
    void deliver(target);
  }

  // Con un solo método de correo o SMS el código se envía al llegar. La guarda evita un segundo envío con el doble montaje de desarrollo
  // (el envío está limitado a 3 cada 10 minutos).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!picking && (method === 'email' || method === 'sms')) void deliver(method);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar: lo demás cambia con la elección de la persona
  }, []);

  // Al elegir o cambiar de método el foco va al campo del código (con el selector abierto no hay campo)
  useEffect(() => {
    if (!picking) inputRef.current?.focus();
  }, [method, picking]);

  function select(next: MfaChallengeMethod) {
    setChosen(next);
    setCode('');
    setTouched(false);
    setError(null);
    setInfo(null);
    if (next === 'email' || next === 'sms') send(next);
  }

  function back() {
    setChosen(null);
    setCode('');
    setTouched(false);
    setError(null);
    setInfo(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await mfaVerify(challenge.challengeId, method, cleanCode(code), t);
      onVerified();
    } catch (err) {
      fail(err);
      setCode('');
      setTouched(false);
      inputRef.current?.focus();
    }
  }

  const hint = (option: MfaMethodOption) =>
    option.method === 'totp'
      ? t('Código de 6 dígitos de tu aplicación')
      : t('Te enviaremos un código a {0}', [option.destination ?? '']);

  const prompt =
    method === 'totp'
      ? t('Escribe el código de 6 dígitos de tu aplicación autenticadora.')
      : method === 'recovery'
        ? t('Escribe uno de tus códigos de recuperación. Cada uno sirve una sola vez.')
        : t('Te enviamos un código a {0}. Escríbelo para continuar.', [destination]);

  if (picking) {
    return (
      <>
        <AccessTitle>{t('Verificación en dos pasos')}</AccessTitle>
        <Lead>{t('Elige cómo quieres verificar tu identidad.')}</Lead>
        <ul className="flex flex-col gap-2.5">
          {choices.map((option) => (
            <li key={option.method}>
              <button
                type="button"
                onClick={() => select(option.method)}
                className="flex min-h-16 w-full cursor-pointer items-center gap-3.5 rounded-control border border-outline-variant bg-surface px-4 py-3 text-start transition-colors duration-120 ease-out hover:border-primary hover:bg-surface-container"
              >
                <Icon icon={MFA_ICON[option.method]} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <strong>{t(MFA_LABEL[option.method])}</strong>
                  <small className="text-[13px] wrap-break-word text-on-surface-variant">{hint(option)}</small>
                </span>
                <Icon icon={RiArrowRightSLine} />
              </button>
            </li>
          ))}
        </ul>
        {hasRecovery ? (
          <p className="text-center text-sm">
            <LinkButton onClick={() => select('recovery')}>
              {t('¿No puedes usar ninguno? Usa un código de recuperación')}
            </LinkButton>
          </p>
        ) : null}
        <p className="text-center text-sm">
          <LinkButton onClick={() => onCancelled('')}>{t('Volver')}</LinkButton>
        </p>
      </>
    );
  }

  return (
    <>
      <AccessTitle>{t('Verificación en dos pasos')}</AccessTitle>
      <Lead>{prompt}</Lead>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          ref={inputRef}
          label={method === 'recovery' ? t('Código de recuperación') : t('Código')}
          leading={MFA_ICON[method]}
          inputMode={method === 'recovery' ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          error={touched && !code.trim() ? t('Escribe el código') : undefined}
        />
        <FormResult error={error} success={info} />
        <Button type="submit" variant="primary" size="lg" loading={loading}>
          {t('Verificar')}
        </Button>
      </form>
      {canResend ? (
        <p className="text-center text-sm">
          <LinkButton disabled={loading} onClick={() => send(method)}>
            {t('Reenviar código')}
          </LinkButton>
        </p>
      ) : null}
      {choices.length > 1 ? (
        <p className="text-center text-sm">
          <LinkButton onClick={back}>{t('Elegir otro método')}</LinkButton>
        </p>
      ) : others.length ? (
        <p className="text-center text-sm">
          {t('Usar otro método:')}{' '}
          {others.map((option, index) => (
            <span key={option.method}>
              <LinkButton onClick={() => select(option.method)}>{t(MFA_LABEL[option.method])}</LinkButton>
              {index < others.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      ) : null}
      <p className="text-center text-sm">
        <LinkButton onClick={() => onCancelled('')}>{t('Volver')}</LinkButton>
      </p>
    </>
  );
}
