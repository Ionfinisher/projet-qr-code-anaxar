import { forwardRef } from 'react';
import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

/** Attributs d'accessibilité d'un champ relié à son message d'aide ou d'erreur. */
export function fieldProps(id, error, hint) {
  return { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error || hint ? `${id}-msg` : undefined };
}

/** Champ de formulaire : libellé, contrôle (enfant), aide ou erreur. */
export function Field({ id, label, required, optional, hint, hintTone, error, labelAside, className, children }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-sm font-medium text-slate-800">
            {label}
            {required && <span className="text-rose-600" aria-hidden="true"> *</span>}
            {optional && <span className="font-normal text-slate-500"> (facultatif)</span>}
          </label>
          {labelAside}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-msg`} className="flex items-start gap-1.5 text-sm text-rose-700"><Icon name="triangle-alert" size={15} className="mt-0.5" /><span>{error}</span></p>
      ) : hint ? (
        <p id={`${id}-msg`} className={cn('flex items-start gap-1.5 text-sm', hintTone === 'ok' ? 'text-emerald-700' : 'text-slate-500')}>
          {hintTone === 'ok' && <Icon name="circle-check" size={15} className="mt-0.5" />}<span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}

const CONTROL = 'block w-full rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
/** Classes d'un contrôle de saisie (état normal ou invalide). */
export const controlClass = (invalid, className) => cn(CONTROL,
  invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25' : 'border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-500/25', className);

export const Input = forwardRef(function Input({ invalid, mono, leading, className, ...rest }, ref) {
  const el = <input ref={ref} className={controlClass(invalid || rest['aria-invalid'] === 'true', cn('h-11 px-3.5', mono && 'font-mono tracking-wide', leading && 'pl-10', className))} {...rest} />;
  if (!leading) return el;
  return <div className="relative">{el}<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leading}</span></div>;
});

export const Textarea = forwardRef(function Textarea({ invalid, className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={controlClass(invalid || rest['aria-invalid'] === 'true', cn('px-3.5 py-2.5 leading-relaxed', className))} {...rest} />;
});

export const Select = forwardRef(function Select({ invalid, className, wrapperClassName, children, ...rest }, ref) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select ref={ref} className={controlClass(invalid || rest['aria-invalid'] === 'true', cn('h-11 cursor-pointer appearance-none pl-3.5 pr-10', className))} {...rest}>{children}</select>
      <Icon name="chevron-down" size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
    </div>
  );
});
