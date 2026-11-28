import { RiAddLine, RiCheckLine, RiDeleteBinLine, RiRouteLine, RiSearchLine, RiUserLine } from '@remixicon/react';
import { notFound } from 'next/navigation';

import { Alert } from '@/components/ui/alert';
import { StatusBadge, TONES } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { DemoDialog, DemoMenu } from '@/components/ui/demo';
import { Input, Select, Textarea } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Loading, Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getT } from '@/lib/i18n/server';
import { getTheme } from '@/lib/theme-server';

/**
 * Muestrario de los componentes de `components/ui` con los tokens de la guía de diseño, para revisarlos a mano en claro y oscuro y en
 * los tres idiomas. Solo existe fuera de producción (en producción responde 404).
 */
export default async function Design() {
  if (process.env.NODE_ENV === 'production') notFound();
  const t = await getT();
  const theme = await getTheme();

  return (
    <main className="mx-auto flex max-w-300 flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px]/9 font-bold">Ruteando · {t('Tema de color')}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageToggle />
          <ThemeToggle initial={theme} />
        </div>
      </header>

      <Card>
        <CardTitle>Botones</CardTitle>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary">
            <Icon icon={RiRouteLine} size={20} />
            {t('Planificar jornada')}
          </Button>
          <Button variant="primary" size="lg">
            {t('Guardar')}
          </Button>
          <Button>{t('Cancelar')}</Button>
          <Button variant="outlined">{t('Buscar o ir a…')}</Button>
          <Button variant="text">{t('Cerrar')}</Button>
          <Button variant="danger">
            <Icon icon={RiDeleteBinLine} size={20} />
            Eliminar
          </Button>
          <Button variant="primary" loading>
            {t('Guardar')}
          </Button>
          <Button disabled>{t('Cancelar')}</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <IconButton label={t('Buscar o ir a…')} icon={RiSearchLine} />
          <IconButton label="Añadir" icon={RiAddLine} variant="tonal" />
          <IconButton label="Usuario" icon={RiUserLine} variant="tonal" disabled />
        </div>
      </Card>

      <Card>
        <CardTitle>Campos</CardTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            hint="Usa el correo con el que te registraste"
          />
          <Input label="Contraseña" type="password" defaultValue="clave-de-ejemplo" />
          <Input label="Nombre" error="Escribe un nombre" />
          <Select label="Tipo de vehículo" defaultValue="car">
            <option value="car">Camioneta</option>
            <option value="moto">Motocicleta</option>
          </Select>
          <Textarea label="Notas" className="md:col-span-2" />
        </div>
      </Card>

      <Card>
        <CardTitle>Estados y avisos</CardTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          {TONES.map((tone) => (
            <StatusBadge key={tone} tone={tone}>
              {tone}
            </StatusBadge>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Alert tone="info" title="Información">
            Un aviso que solo informa.
          </Alert>
          <Alert tone="success">
            <span className="inline-flex items-center gap-1">
              <Icon icon={RiCheckLine} size={16} /> Guardado
            </span>
          </Alert>
          <Alert tone="warning" title="Aviso">
            Algo requiere tu atención.
          </Alert>
          <Alert tone="danger" title="Error">
            No se pudo completar la operación.
          </Alert>
        </div>
      </Card>

      <Card>
        <CardTitle>Carga, diálogo y menú</CardTitle>
        <Loading className="mt-4 grid gap-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </Loading>
        <div className="mt-4 flex flex-wrap gap-3">
          <DemoDialog />
          <DemoMenu />
        </div>
      </Card>
    </main>
  );
}
