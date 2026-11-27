import { type RemixiconComponentType, RiArrowDownSLine } from '@remixicon/react';
import { type ComponentProps, type ReactNode, useId } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

/**
 * Campos con contorno de la guía de diseño: 56px de alto, 12px de esquina y etiqueta flotante. El enfoque (2px y color primario) se
 * dibuja con un anillo de 1px sobre el borde de 1px para que el campo no cambie de tamaño. La etiqueta es obligatoria (accesibilidad);
 * `hint` es la pista y `error` el mensaje de validación (enlazados con `aria-describedby`; el error marca el campo con `aria-invalid`).
 */
const control =
  'peer block w-full min-h-14 rounded-control border border-outline bg-transparent px-4 pt-5 pb-1 text-base text-on-surface outline-none placeholder:text-transparent focus:border-primary focus:ring-1 focus:ring-primary aria-invalid:border-error aria-invalid:focus:ring-error disabled:opacity-50';

const floating =
  'pointer-events-none absolute left-4 top-1.5 origin-left text-xs text-on-surface-variant transition-all duration-120 ease-out peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary peer-aria-invalid:text-error';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}

function Message({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (!error && !hint) return null;
  return (
    <p
      id={id}
      role={error ? 'alert' : undefined}
      className={cn('mt-1 px-4 text-xs', error ? 'text-error' : 'text-on-surface-variant')}
    >
      {error ?? hint}
    </p>
  );
}

function Shell({
  id,
  hint,
  error,
  className,
  children,
}: Pick<FieldProps, 'hint' | 'error' | 'className'> & { id: string; children: ReactNode }) {
  return (
    <div className={cn('w-full', className)}>
      <div className="relative">{children}</div>
      <Message id={`${id}-msg`} hint={hint} error={error} />
    </div>
  );
}

export interface InputProps extends FieldProps, Omit<ComponentProps<'input'>, 'placeholder'> {
  /** Icono decorativo a la izquierda (la etiqueta se desplaza para no taparlo). */
  leading?: RemixiconComponentType;
  /** Contenido a la derecha dentro del campo (el botón de mostrar la contraseña): debe ser interactivo por sí mismo. */
  trailing?: ReactNode;
}

/** Estos tipos siempre muestran algo (`--:--`, `dd/mm/aaaa`): la etiqueta va siempre arriba, como en un `select`. */
const ALWAYS_FILLED = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

export function Input({ label, hint, error, className, id, leading, trailing, ...props }: InputProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const raised = ALWAYS_FILLED.has(props.type ?? '');
  return (
    <Shell id={fieldId} hint={hint} error={error} className={className}>
      {/* `placeholder=" "` activa la etiqueta flotante (`peer-placeholder-shown`); el texto visible es la etiqueta */}
      <input
        id={fieldId}
        placeholder=" "
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(control, leading && 'pl-12', trailing && 'pr-14')}
        {...props}
      />
      <label
        htmlFor={fieldId}
        className={cn(
          floating,
          leading && 'left-12',
          raised && 'top-1.5 text-xs peer-placeholder-shown:top-1.5 peer-placeholder-shown:text-xs'
        )}
      >
        {label}
      </label>
      {leading ? (
        <Icon icon={leading} className="pointer-events-none absolute top-4 left-4 text-on-surface-variant" />
      ) : null}
      {trailing ? <div className="absolute top-1.5 right-1.5">{trailing}</div> : null}
    </Shell>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: FieldProps & Omit<ComponentProps<'textarea'>, 'placeholder'>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <Shell id={fieldId} hint={hint} error={error} className={className}>
      <textarea
        id={fieldId}
        placeholder=" "
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(control, 'min-h-28 resize-y')}
        {...props}
      />
      <label htmlFor={fieldId} className={floating}>
        {label}
      </label>
    </Shell>
  );
}

/** Selector nativo (accesible y con el teclado y el móvil de serie). La etiqueta va siempre arriba: un `select` nunca está «vacío». */
export function Select({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...props
}: FieldProps & ComponentProps<'select'>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <Shell id={fieldId} hint={hint} error={error} className={className}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(control, 'appearance-none pr-11')}
        {...props}
      >
        {children}
      </select>
      <label
        htmlFor={fieldId}
        className="pointer-events-none absolute top-1.5 left-4 text-xs text-on-surface-variant peer-focus:text-primary peer-aria-invalid:text-error"
      >
        {label}
      </label>
      <Icon icon={RiArrowDownSLine} className="pointer-events-none absolute top-4 right-3 text-on-surface-variant" />
    </Shell>
  );
}
