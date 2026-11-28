'use client';

import { useState } from 'react';

import { AccessTitle, Lead } from '@/components/access/step';
import { MfaEnroll, type MfaEnrollment } from '@/components/mfa/mfa-enroll';
import { RecoveryCodes } from '@/components/mfa/recovery-codes';
import { FormResult } from '@/components/ui/form-result';
import { Loading } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { type MfaChallenge, mfaComplete, type MfaEnrollChallenge } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';

import { MfaVerifyStep } from './mfa-verify-step';

export type SecondFactorStep =
  { kind: 'verify'; challenge: MfaChallenge } | { kind: 'enroll'; enroll: MfaEnrollChallenge };

/**
 * Lo que sigue a las credenciales cuando el servidor pide un segundo factor: superar el reto con un método ya activo, o activar uno si
 * la empresa lo exige y la persona aún no tiene ninguno. Lo comparten el acceso con contraseña y el regreso del SSO.
 */
export function SecondFactor({
  step,
  onVerified,
  onCancelled,
}: {
  step: SecondFactorStep;
  onVerified: () => void;
  onCancelled: (message: string) => void;
}) {
  if (step.kind === 'verify') {
    return <MfaVerifyStep challenge={step.challenge} onVerified={onVerified} onCancelled={onCancelled} />;
  }
  return <EnrollStep enroll={step.enroll} onVerified={onVerified} onCancelled={onCancelled} />;
}

/**
 * Segundo paso cuando la empresa exige el segundo factor y la persona aún no tiene ninguno: activa un método con el reto (sin sesión),
 * guarda los códigos de recuperación y solo entonces el servidor entrega la sesión.
 */
function EnrollStep({
  enroll,
  onVerified,
  onCancelled,
}: {
  enroll: MfaEnrollChallenge;
  onVerified: () => void;
  onCancelled: (message: string) => void;
}) {
  const t = useT();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setLoading(true);
    setError(null);
    try {
      await mfaComplete(enroll.challengeId, t);
      onVerified();
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError && err.code === 'CHALLENGE_EXPIRED') onCancelled(err.message);
      else setError(err instanceof Error ? err.message : t('No se pudo completar la solicitud'));
    }
  }

  function enrolled(result: MfaEnrollment) {
    if (result.recoveryCodes?.length) setCodes(result.recoveryCodes);
    else void finish();
  }

  return (
    <>
      <AccessTitle>{t('Activa la verificación en dos pasos')}</AccessTitle>
      {codes ? (
        <>
          <Lead>{t('Método activado. Guarda tus códigos de recuperación antes de entrar.')}</Lead>
          <RecoveryCodes codes={codes} onSaved={() => void finish()} />
        </>
      ) : (
        <>
          <Lead>{t('Tu empresa exige un segundo factor. Activa uno para poder entrar.')}</Lead>
          <MfaEnroll methods={enroll.methods} challengeId={enroll.challengeId} onEnrolled={enrolled} />
        </>
      )}
      <FormResult error={error} />
      {loading ? (
        <Loading label={t('Entrando')}>
          <progress aria-label={t('Entrando')} className="h-2 w-full accent-primary" />
        </Loading>
      ) : null}
    </>
  );
}
