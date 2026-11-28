import { type RemixiconComponentType, RiArrowDropDownFill } from '@remixicon/react';
import { Children, type ComponentProps, isValidElement, type ReactNode, useId } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from './icon';

/**
 * Campos con contorno de la guía de diseño (los `mat-form-field` outline de Angular): 56px de alto, 12px de esquina y etiqueta que, al
 * subir, queda SOBRE el borde con una muesca (el fondo `--field-bg` de la superficie donde está el campo tapa la línea). El enfoque (2px y
 * color primario) se dibuja con un anillo de 1px sobre el borde de 1px para que el campo no cambie de tamaño. La etiqueta es obligatoria (accesibilidad);
 * `hint` es la pista y `error` el mensaje de validación (enlazados con `aria-describedby`; el error marca el campo con `aria-invalid`).
 */
const control =
  'peer block w-full min-h-14 rounded-control border border-outline bg-transparent px-4 py-[15px] text-base text-on-surface outline-none placeholder:text-transparent hover:border-on-surface focus:border-primary focus:ring-1 focus:ring-primary aria-invalid:border-error aria-invalid:focus:ring-error disabled:opacity-50';

/** La etiqueta arriba, sobre el borde y con la muesca. */
const raisedLabel = 'top-0 -translate-y-1/2 bg-(--field-bg) text-xs';

const floating = cn(
  'pointer-events-none absolute top-4 left-3 max-w-[calc(100%-1.5rem)] truncate px-1 text-base text-on-surface-variant transition-all duration-120 ease-out peer-focus:text-primary peer-aria-invalid:text-error',
  'peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-(--field-bg) peer-focus:text-xs',
  'peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:bg-(--field-bg) peer-not-placeholder-shown:text-xs'
);

interface FieldProps {
  label: string;
  /** Pinta un asterisco tras la etiqueta (campo obligatorio) y marca el campo con `aria-required`: es solo visual, la validación es del formulario. */
  requiredMark?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  /** Campo compacto de 44px (los filtros de un listado), como `--mat-form-field-container-height: 44px` de Angular. */
  dense?: boolean;
}

/**
 * La pista o el error bajo el campo. Dentro de un `FormSection` (`--field-reserve: 20px`) deja SIEMPRE su sitio, como la zona de
 * subíndice fija de `mat-form-field`: el error no mueve lo de abajo y las filas respiran igual que en Angular.
 */
function Message({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <div className="min-h-(--field-reserve,0px)">
      {error || hint ? (
        <p
          id={id}
          role={error ? 'alert' : undefined}
          className={cn('mt-1 mb-0 px-4 text-xs', error ? 'text-error' : 'text-on-surface-variant')}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
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
  /** Unidad al final del campo («kg», «cm³»), como el `matTextSuffix` de Angular; el nombre accesible la incluye. */
  suffix?: string;
  /** Contenido a la derecha dentro del campo (el botón de mostrar la contraseña): debe ser interactivo por sí mismo. */
  trailing?: ReactNode;
}

/** Estos tipos siempre muestran algo (`--:--`, `dd/mm/aaaa`): la etiqueta va siempre arriba, como en un `select`. */
const ALWAYS_FILLED = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

export function Input({
  label,
  requiredMark,
  hint,
  error,
  className,
  dense,
  id,
  leading,
  trailing,
  suffix,
  ...props
}: InputProps) {
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
        aria-required={requiredMark || undefined}
        aria-label={suffix ? `${label} (${suffix})` : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(control, dense && 'min-h-11 py-[9px]', leading && 'pl-[52px]', (trailing || suffix) && 'pr-14')}
        {...props}
      />
      <label
        htmlFor={fieldId}
        className={cn(
          floating,
          dense && 'top-2.5',
          leading && 'left-12',
          // El asterisco es de adorno (CSS): `aria-required` ya dice que es obligatorio y no ensucia el nombre accesible
          requiredMark && "after:content-['*']",
          raised && cn(raisedLabel, 'bg-(--field-bg)')
        )}
      >
        {label}
      </label>
      {leading ? (
        <Icon icon={leading} className="pointer-events-none absolute top-4 left-3.5 text-on-surface-variant" />
      ) : null}
      {trailing ? <div className="absolute top-1.5 right-1.5">{trailing}</div> : null}
      {suffix ? (
        <span aria-hidden className="pointer-events-none absolute top-4 right-4 text-on-surface-variant">
          {suffix}
        </span>
      ) : null}
    </Shell>
  );
}

export function Textarea({
  label,
  requiredMark,
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
        aria-required={requiredMark || undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(control, 'min-h-28 resize-y')}
        {...props}
      />
      <label htmlFor={fieldId} className={cn(floating, requiredMark && "after:content-['*']")}>
        {label}
      </label>
    </Shell>
  );
}

/** ¿Hay una opción con valor vacío y con texto («Igual que la salida»)? Entonces el campo ya muestra algo y la etiqueta sube. */
function blankOptionHasText(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      isValidElement<{ value?: string; children?: ReactNode }>(child) &&
      child.props.value === '' &&
      Children.count(child.props.children) > 0 &&
      child.props.children !== ''
  );
}

/** ¿La primera opción es la en blanco (sin texto)? Sin valor dado, un `select` nativo muestra su primera opción. */
function firstOptionIsBlank(children: ReactNode): boolean {
  const first = Children.toArray(children).find((child) => isValidElement(child));
  if (!isValidElement<{ value?: string; children?: ReactNode }>(first)) return false;
  return first.props.value === '' && (first.props.children === undefined || first.props.children === '');
}

/** Selector nativo (accesible y con el teclado y el móvil de serie). La etiqueta va siempre arriba: un `select` nunca está «vacío». */
export function Select({
  label,
  requiredMark,
  hint,
  error,
  className,
  dense,
  id,
  children,
  ...props
}: FieldProps & ComponentProps<'select'>) {
  const generated = useId();
  const fieldId = id ?? generated;
  // Como `mat-select`: sin elegir, la etiqueta descansa dentro del campo; con un valor, sube a la muesca (o al enfocarlo)
  const provided = props.value ?? props.defaultValue;
  const empty =
    provided === undefined ? firstOptionIsBlank(children) : provided === '' && !blankOptionHasText(children);
  return (
    <Shell id={fieldId} hint={hint} error={error} className={className}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-required={requiredMark || undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(control, dense && 'min-h-11 py-[9px]', 'appearance-none pr-11')}
        {...props}
      >
        {children}
      </select>
      <label
        htmlFor={fieldId}
        className={cn(
          'pointer-events-none absolute left-3 max-w-[calc(100%-3rem)] truncate px-1 text-on-surface-variant transition-all duration-120 ease-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-(--field-bg) peer-focus:text-xs peer-focus:text-primary peer-aria-invalid:text-error',
          requiredMark && "after:content-['*']",
          empty ? cn('text-base', dense ? 'top-2.5' : 'top-4') : cn('bg-(--field-bg)', raisedLabel)
        )}
      >
        {label}
      </label>
      <Icon
        icon={RiArrowDropDownFill}
        className={cn('pointer-events-none absolute right-3 text-on-surface-variant', dense ? 'top-2.5' : 'top-4')}
      />
    </Shell>
  );
}
