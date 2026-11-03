import { cn } from '../../Lib/cn.js';

/** Symbole PortFlow (conteneur + flèche). */
export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn('shrink-0', className)}>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#ff5b1f" />
      <rect x="7" y="8.5" width="15" height="6" rx="1.4" fill="#0f172a" />
      <rect x="7" y="17.5" width="10" height="6" rx="1.4" fill="#ffffff" />
      <path d="M19.5 17.5h3.6l3.4 3-3.4 3h-3.6z" fill="#0f172a" />
      <path d="M10 8.5v6M13 8.5v6M16 8.5v6M19 8.5v6" stroke="#ff5b1f" strokeWidth="1" opacity=".55" />
    </svg>
  );
}

/** Logo complet ; `sub` : nom de l'espace (Administration, Guérite…). `dark` : sur fond sombre. */
export function Logo({ sub, dark = false, size = 32, className }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={cn('text-[17px] font-extrabold tracking-tight', dark ? 'text-white' : 'text-slate-900')}>PortFlow</span>
        {sub && <span className={cn('mt-1 text-[11px] font-semibold uppercase tracking-[0.1em]', dark ? 'text-brand-400' : 'text-brand-700')}>{sub}</span>}
      </span>
    </span>
  );
}
