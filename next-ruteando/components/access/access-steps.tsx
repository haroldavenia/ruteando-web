import { getT } from '@/lib/i18n/server';

/**
 * Presentación de la pantalla de crear cuenta en el diseño ancho: el camino hasta la primera jornada en tres pasos, unidos por el hilo de
 * la marca. Los números son decorativos (la lista ya dice el orden). Misma tarjeta que `AccessPitch`.
 */
export async function AccessSteps() {
  const t = await getT();
  const steps = [
    { title: t('Crea tu cuenta'), text: t('Tus datos y los de tu empresa') },
    { title: t('Verifica tu correo'), text: t('Abre el enlace que te enviamos') },
    { title: t('Planifica tu primera jornada'), text: t('Lugares, flota y paquetes') },
  ];
  return (
    <div className="relative hidden w-full max-w-110 rounded-3xl border border-outline-variant bg-surface p-7 shadow-[0_8px_32px_rgb(0_0_0/0.1)] access:block">
      <p className="font-brand text-[32px]/10 font-medium tracking-[-0.01em]">
        {t('Tu primera jornada, en')}{' '}
        <span className="bg-brand-gradient bg-clip-text text-transparent forced-colors:bg-none forced-colors:text-inherit">
          {t('minutos')}
        </span>
        .
      </p>
      <ol className="m-0 mt-6 list-none p-0">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={
              'relative grid grid-cols-[36px_1fr] gap-3.5 pb-5 last:pb-0 ' +
              (index < steps.length - 1
                ? "before:absolute before:inset-[38px_auto_2px_16.5px] before:w-[3px] before:rounded-[3px] before:content-[''] " +
                  (index === 0 ? 'before:bg-brand-gradient' : 'before:bg-outline-variant')
                : '')
            }
          >
            <span
              aria-hidden
              className={
                'grid size-9 place-items-center rounded-full border-2 text-sm font-medium ' +
                (index === 0
                  ? 'border-transparent bg-brand-gradient text-on-primary'
                  : 'border-outline-variant bg-surface text-on-surface-variant')
              }
            >
              {index + 1}
            </span>
            <span>
              <b className="block text-sm/5 font-medium">{step.title}</b>
              <small className="text-sm text-on-surface-variant">{step.text}</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
