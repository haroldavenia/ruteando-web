'use client';

import { type ReactNode, useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n/client';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** Una acción que no se puede deshacer (borrar) se pinta de peligro. */
  danger?: boolean;
}

/**
 * Pide confirmación con un diálogo: `const { ask, dialog } = useConfirm()`, `if (await ask({...}))`, y `dialog` se pinta una vez en el
 * componente. Cerrar con Escape o fuera es cancelar.
 */
export function useConfirm(): { ask: (options: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
  const t = useT();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const ask = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    []
  );
  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = (
    <Dialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
      {options ? (
        <DialogContent title={options.title} description={options.message}>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="text">{t('Cancelar')}</Button>
            </DialogClose>
            <Button variant={options.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {options.confirmLabel}
            </Button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
  return { ask, dialog };
}
