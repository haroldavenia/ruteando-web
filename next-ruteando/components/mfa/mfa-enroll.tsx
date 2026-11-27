'use client';

import { RiArrowRightSLine, RiSmartphoneLine } from '@remixicon/react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { FormResult } from '@/components/ui/form-result';
import { Icon } from '@/components/ui/icon';
import { useT } from '@/lib/i18n/client';
import { mfaApi, type MfaTotpSetup } from '@/lib/mfa-client';
import { cleanCode, MFA_HINT, MFA_ICON, MFA_LABEL, type MfaMethod } from '@/lib/mfa-labels';

import { QrCode } from './qr-code';

/** Lo que cuenta la activación al terminar: el método y, si era el primero, los códigos de recuperación (una sola vez). */
export interface MfaEnrollment {
  method: MfaMethod;
  recoveryCodes: string[] | null;
}

type Step = 'choose' | 'start' | 'confirm';

const PHONE = /^\+[1-9][\d\s()-]{7,18}$/;
const CODE = /^\d{3}\s?\d{3}$/;

/**
 * Activa un método de segundo factor: elegir, empezar (teléfono si es SMS; clave y QR si es la aplicación autenticadora) y confirmar con
 * el código. Lo usan el perfil (con sesión) y el acceso obligatorio (con `challengeId`, sin sesión todavía).
 */
export function MfaEnroll({
  methods,
  challengeId = null,
  initial = null,
  onEnrolled,
  onCancelled,
}: {
  /** Métodos que se pueden activar (los que la empresa permite y el servidor ofrece). */
  methods: readonly MfaMethod[];
  /** Reto de activación obligatoria; sin él se usa la sesión. */
  challengeId?: string | null;
  /** Método ya elegido (desde el perfil): salta la lista y empieza directamente. */
  initial?: MfaMethod | null;
  onEnrolled: (result: MfaEnrollment) => void;
  /** Se volvió atrás desde el primer paso de un método elegido de antemano. */
  onCancelled?: () => void;
}) {
  const t = useT();
  const api = useMemo(() => mfaApi(t), [t]);
  const [step, setStep] = useState<Step>(initial ? 'start' : 'choose');
  const [method, setMethod] = useState<MfaMethod | null>(initial);
  // Un método elegido de antemano (que no sea SMS, que pide el teléfono) empieza solo: ya está «cargando» desde el primer pintado
  const [loading, setLoading] = useState(!!initial && initial !== 'sms');
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState('');
  const [totp, setTotp] = useState<MfaTotpSetup | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  /** Lo que devuelve el servidor al empezar: la clave de la aplicación o el destino del código enviado. */
  const started = (out: MfaTotpSetup | { destination: string | null }) => {
    if ('secret' in out) setTotp(out);
    else setDestination(out.destination ?? '');
    setStep('confirm');
  };
  const start = (chosen: MfaMethod, phoneNumber: string) =>
    chosen === 'totp'
      ? api.totpSetup(challengeId)
      : chosen === 'email'
        ? api.emailSetup(challengeId)
        : api.smsSetup(phoneNumber.replace(/[\s()-]/g, ''), challengeId);

  /** Pide al servidor empezar: manda el código (correo, SMS) o genera la clave (aplicación autenticadora). */
  async function begin(chosen: MfaMethod, phoneNumber: string) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      started(await start(chosen, phoneNumber));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    } finally {
      setLoading(false);
    }
  }

  function choose(next: MfaMethod) {
    setMethod(next);
    setError(null);
    setCode('');
    setPhone('');
    setTotp(null);
    setStep('start');
    if (next !== 'sms') void begin(next, '');
  }

  // Un método elegido de antemano (desde el perfil) empieza solo, una vez
  useEffect(() => {
    if (!initial || initial === 'sms') return;
    let current = true;
    start(initial, '')
      .then(
        (out) => current && started(out),
        (err: unknown) =>
          current && setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'))
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    if (!method || loading) return;
    if (!CODE.test(code.trim())) return setCodeError(t('Escribe el código de 6 dígitos'));
    setCodeError(null);
    setLoading(true);
    setError(null);
    try {
      const clean = cleanCode(code);
      const out =
        method === 'email'
          ? await api.emailConfirm(clean, challengeId)
          : method === 'sms'
            ? await api.smsConfirm(clean, challengeId)
            : await api.totpConfirm(clean, challengeId);
      onEnrolled({ method, recoveryCodes: out.recoveryCodes ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
      setLoading(false);
    }
  }

  function back() {
    setError(null);
    setCode('');
    const next: Step = step === 'confirm' && method === 'sms' ? 'start' : 'choose';
    if (next === 'choose' && initial) return onCancelled?.();
    setStep(next);
    if (next === 'choose') {
      setMethod(null);
      setTotp(null);
    }
  }

  if (step === 'choose') {
    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {methods.map((m) => (
          <li key={m}>
            <button
              type="button"
              onClick={() => choose(m)}
              className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-control border border-outline-variant bg-surface-container-low px-4 py-3 text-start hover:bg-surface-container-high"
            >
              <Icon icon={MFA_ICON[m]} />
              <span className="flex flex-1 flex-col gap-0.5 text-on-surface-variant">
                <strong className="text-on-surface">{t(MFA_LABEL[m])}</strong>
                <span>{t(MFA_HINT[m])}</span>
              </span>
              <Icon icon={RiArrowRightSLine} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (step === 'start') {
    if (method !== 'sms') return <FormResult error={error} />;
    return (
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          if (!PHONE.test(phone.trim())) {
            return setPhoneError(t('Escribe el teléfono en formato internacional, por ejemplo +573001234567'));
          }
          setPhoneError(null);
          void begin('sms', phone);
        }}
        className="flex flex-col gap-3"
      >
        <Input
          label={t('Teléfono')}
          type="tel"
          autoComplete="tel"
          leading={RiSmartphoneLine}
          hint={t('Con el prefijo del país, por ejemplo +573001234567')}
          error={phoneError ?? undefined}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <FormResult error={error} />
        <div className="flex justify-between gap-2">
          <Button variant="outlined" onClick={back}>
            {t('Atrás')}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t('Enviar código')}
          </Button>
        </div>
      </Form>
    );
  }

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        void confirm();
      }}
      className="flex flex-col gap-3"
    >
      {totp ? (
        <>
          <p>{t('Escanea el código con tu aplicación autenticadora y escribe el código de 6 dígitos que muestra.')}</p>
          <QrCode text={totp.otpauthUri} />
          <p>
            {t('¿No puedes escanear? Escribe esta clave en la aplicación:')}
            <code className="mt-1 block font-mono text-base tracking-wide break-all">{totp.secret}</code>
          </p>
        </>
      ) : (
        <p>{t('Te enviamos un código a {0}. Escríbelo para activar este método.', [destination])}</p>
      )}
      <Input
        label={t('Código')}
        inputMode="numeric"
        autoComplete="one-time-code"
        error={codeError ?? undefined}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <FormResult error={error} />
      <div className="flex justify-between gap-2">
        <Button variant="outlined" onClick={back}>
          {t('Atrás')}
        </Button>
        <Button type="submit" variant="primary" loading={loading} aria-label={loading ? t('Verificando') : undefined}>
          {t('Activar')}
        </Button>
      </div>
    </Form>
  );
}
