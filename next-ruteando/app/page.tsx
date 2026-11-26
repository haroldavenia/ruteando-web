import { RiRouteLine } from '@remixicon/react';

// Privada: proxy.ts redirige a /access si no hay sesión.
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center gap-2 text-primary">
      <RiRouteLine aria-hidden size={24} />
      <h1 className="text-2xl font-medium">Ruteando</h1>
    </main>
  );
}
