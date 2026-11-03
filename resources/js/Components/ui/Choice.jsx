import { useRef } from 'react';
import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

/** Case à cocher avec libellé et description. */
export function Checkbox({ id, checked, onChange, label, description, disabled, className }) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 text-sm', disabled && 'cursor-not-allowed opacity-60', className)}>
      <input id={id} type="checkbox" checked={!!checked} disabled={disabled} onChange={e => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-slate-300 accent-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" />
      <span className="min-w-0">
        <span className="font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

/** Interrupteur (role="switch"). */
export function Switch({ checked, onChange, label, description, disabled, className }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} disabled={disabled} onClick={() => onChange?.(!checked)}
      className={cn('flex w-full cursor-pointer items-start justify-between gap-4 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60', className)}>
      <span className="min-w-0 text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-slate-500">{description}</span>}
      </span>
      <span className={cn('relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.3)] transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </span>
    </button>
  );
}

/** Navigation clavier d'un groupe radio (flèches). */
function useRadioKeys(options, value, onChange) {
  const ref = useRef(null);
  const onKeyDown = e => {
    const enabled = options.filter(o => !o.disabled);
    const i = enabled.findIndex(o => o.value === value);
    let n = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % enabled.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + enabled.length) % enabled.length;
    if (n === null) return;
    e.preventDefault();
    onChange(enabled[n].value);
    const idx = options.indexOf(enabled[n]);
    ref.current?.querySelectorAll('[role="radio"]')[idx]?.focus();
  };
  return { ref, onKeyDown };
}

/**
 * Choix exclusif sous forme de cartes : options [{ value, label, description, icon, disabled, aside }].
 */
export function RadioCards({ options, value, onChange, label, columns = 2, size = 'md', className }) {
  const keys = useRadioKeys(options, value, onChange);
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' }[columns];
  return (
    <div ref={keys.ref} role="radiogroup" aria-label={label} onKeyDown={keys.onKeyDown} className={cn('grid gap-2.5', cols, className)}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} disabled={o.disabled} tabIndex={on || (value == null && o === options[0]) ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn('flex w-full cursor-pointer items-start gap-3 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
              size === 'sm' ? 'px-3 py-2.5' : 'px-4 py-3.5',
              on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
            {o.icon && (
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
                <Icon name={o.icon} size={18} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-sm text-slate-500">{o.description}</span>}
            </span>
            {o.aside}
            {!o.icon && <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-brand-600' : 'border-slate-300')}>{on && <span className="h-2 w-2 rounded-full bg-brand-600" />}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sélecteur segmenté (filtres, onglets de vue) : options [{ value, label, icon, count }].
 */
export function Segmented({ options, value, onChange, label, size = 'md', className }) {
  const keys = useRadioKeys(options, value, onChange);
  return (
    <div ref={keys.ref} role="radiogroup" aria-label={label} onKeyDown={keys.onKeyDown}
      className={cn('inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1', className)}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onChange(o.value)}
            className={cn('inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3 text-sm',
              on ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.12)]' : 'text-slate-600 hover:text-slate-900')}>
            {o.icon && <Icon name={o.icon} size={16} />}
            <span>{o.label}</span>
            {o.count != null && (
              <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums', on ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700')}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
