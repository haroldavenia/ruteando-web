'use client';

import * as Toast from '@radix-ui/react-toast';
import { RiCloseLine } from '@remixicon/react';
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';

import { useT } from '@/lib/i18n/client';

import { IconButton } from './icon-button';

const NotifyContext = createContext<(message: string) => void>(() => {});

/** Muestra un aviso breve («Contraseña actualizada…»). Sin proveedor no hace nada, así que un componente se prueba suelto. */
export function useNotify() {
  return useContext(NotifyContext);
}

/**
 * Avisos que sobreviven a un cambio de pantalla (el proveedor vive en el layout raíz): se anuncian a los lectores de pantalla
 * (`role="status"` de Radix), se cierran solos a los 6 s y con Escape o el botón. No mueven el foco.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  const next = useRef(0);
  const notify = useCallback((message: string) => {
    setItems((current) => [...current, { id: next.current++, message }]);
  }, []);

  return (
    <NotifyContext.Provider value={notify}>
      <Toast.Provider duration={6000} label={t('Notificaciones')} swipeDirection="down">
        {children}
        {items.map(({ id, message }) => (
          <Toast.Root
            key={id}
            onOpenChange={(open) => {
              if (!open) setItems((current) => current.filter((item) => item.id !== id));
            }}
            className="flex items-center gap-2 rounded-control border border-outline-variant bg-surface-container-highest py-1 pr-1 pl-4 text-sm text-on-surface shadow-card"
          >
            <Toast.Description className="flex-1 py-2">{message}</Toast.Description>
            <Toast.Close asChild>
              <IconButton label={t('Cerrar')} icon={RiCloseLine} />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md list-none flex-col gap-2 outline-none" />
      </Toast.Provider>
    </NotifyContext.Provider>
  );
}
