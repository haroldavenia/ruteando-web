'use client';

import { RiAlertLine, RiClipboardLine, RiDownloadLine } from '@remixicon/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { downloadBlob } from '@/lib/csv';
import { useT } from '@/lib/i18n/client';

/** Los códigos de recuperación, que se muestran una sola vez: copiar, descargar y confirmar que se guardaron. */
export function RecoveryCodes({ codes, onSaved }: { codes: readonly string[]; onSaved: () => void }) {
  const t = useT();
  const [status, setStatus] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <p role="note" className="flex gap-2.5 rounded-control bg-warning-container px-4 py-3 text-on-warning-container">
        <Icon icon={RiAlertLine} />
        <span>
          {t(
            'Guarda estos códigos en un lugar seguro. Cada uno sirve una sola vez si pierdes tu teléfono, y no volverán a mostrarse.'
          )}
        </span>
      </p>
      <ol
        aria-label={t('Códigos de recuperación')}
        className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 rounded-control bg-surface-container-high py-4 pr-4 pl-10 font-mono text-base tracking-wide"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outlined"
          onClick={() =>
            navigator.clipboard.writeText(codes.join('\n')).then(
              () => setStatus(t('Códigos copiados')),
              () => setStatus(t('No se pudo copiar: selecciónalos y cópialos a mano'))
            )
          }
        >
          <Icon icon={RiClipboardLine} size={20} />
          {t('Copiar')}
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            downloadBlob('codigos-de-recuperacion.txt', new Blob([codes.join('\n') + '\n'], { type: 'text/plain' }));
            setStatus(t('Descarga iniciada'));
          }}
        >
          <Icon icon={RiDownloadLine} size={20} />
          {t('Descargar')}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-sm text-on-surface-variant">
        {status}
      </p>
      <div>
        <Button variant="primary" onClick={onSaved}>
          {t('Ya los guardé')}
        </Button>
      </div>
    </div>
  );
}
