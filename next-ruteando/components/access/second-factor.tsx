'use client';

import { AccessTitle, Lead } from '@/components/access/step';
import { Button } from '@/components/ui/button';
import type { MfaChallenge, MfaEnrollChallenge } from '@/lib/auth-client';
import { useT } from '@/lib/i18n/client';

import { MfaVerifyStep } from './mfa-verify-step';

export type SecondFactorStep =
  { kind: 'verify'; challenge: MfaChallenge } | { kind: 'enroll'; enroll: MfaEnrollChallenge };

/**
 * Lo que sigue a las credenciales cuando el servidor pide un segundo factor: superar el reto con un método ya activo, o activar uno
 * si la empresa lo exige y la persona aún no tiene ninguno. Lo comparten el acceso con contraseña y el regreso del SSO.
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
  const t = useT();
  if (step.kind === 'verify') {
    return <MfaVerifyStep challenge={step.challenge} onVerified={onVerified} onCancelled={onCancelled} />;
  }
  // La activación obligatoria (QR, códigos de recuperación) llega con el Perfil, que comparte sus componentes
  return (
    <>
      <AccessTitle>{t('Activa la verificación en dos pasos')}</AccessTitle>
      <Lead>{t('Tu empresa exige un segundo factor. Activa uno para poder entrar.')}</Lead>
      <Button variant="outlined" onClick={() => onCancelled('')}>
        {t('Volver')}
      </Button>
    </>
  );
}
