import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { Avatar } from './Data.jsx';
import { controlClass } from './Field.jsx';
import { cn } from '../../Lib/cn.js';

/** En-tête de page : surtitre, titre (h1), sous-titre et actions. */
export function PageHeader({ eyebrow, title, subtitle, actions, className, children }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Recherche avec bouton d'effacement. */
export function SearchInput({ value, onChange, placeholder = 'Rechercher…', label = 'Rechercher', className }) {
  return (
    <div className={cn('relative', className)}>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="search" aria-label={label} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={controlClass(false, 'h-10 pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden')} />
      {value && (
        <button type="button" aria-label="Effacer la recherche" onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Menu déroulant accessible (role="menu") : items [{ label, icon, onClick, tone: 'danger' }].
 * `trigger` : fonction (props) => bouton.
 */
export function Dropdown({ trigger, items, header, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('[aria-haspopup]')?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector('[role="menuitem"]')?.focus(), 10);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const onMenuKey = e => {
    const list = [...(ref.current?.querySelectorAll('[role="menuitem"]') || [])];
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
  };
  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger({ id: btnId, 'aria-haspopup': 'menu', 'aria-expanded': open, onClick: () => setOpen(o => !o) })}
      {open && (
        <div role="menu" aria-labelledby={btnId} onKeyDown={onMenuKey}
          className={cn('pf-anim-pop absolute z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.16)]', align === 'right' ? 'right-0' : 'left-0')}>
          {header && <div className="border-b border-slate-100 px-4 pb-2.5 pt-1.5">{header}</div>}
          {items.filter(Boolean).map(it => (
            <button key={it.label} type="button" role="menuitem" onClick={() => { setOpen(false); it.onClick(); }}
              className={cn('flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm focus:outline-none',
                it.tone === 'danger' ? 'text-rose-700 hover:bg-rose-50 focus:bg-rose-50' : 'text-slate-700 hover:bg-slate-50 focus:bg-slate-50')}>
              {it.icon && <Icon name={it.icon} size={18} className={it.tone === 'danger' ? 'text-rose-500' : 'text-slate-400'} />} {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Menu du compte connecté (avatar, nom, rôle). */
export function AccountMenu({ name, sub, items, dark = false }) {
  return (
    <Dropdown items={items} header={<><p className="truncate text-sm font-semibold text-slate-900">{name}</p><p className="truncate text-xs text-slate-500">{sub}</p></>}
      trigger={props => (
        <button type="button" {...props} aria-label={`Compte : ${name}`}
          className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', dark ? 'hover:bg-white/10' : 'hover:bg-slate-100')}>
          <Avatar name={name} size={34} tone={dark ? 'dark' : 'brand'} className={dark ? 'ring-1 ring-white/20' : ''} />
          <span className="hidden min-w-0 text-left md:block">
            <span className={cn('block max-w-[160px] truncate text-sm font-semibold', dark ? 'text-white' : 'text-slate-900')}>{name}</span>
            <span className={cn('block max-w-[160px] truncate text-xs', dark ? 'text-slate-400' : 'text-slate-500')}>{sub}</span>
          </span>
          <Icon name="chevron-down" size={16} className={cn('hidden md:block', dark ? 'text-slate-400' : 'text-slate-400')} />
        </button>
      )} />
  );
}
