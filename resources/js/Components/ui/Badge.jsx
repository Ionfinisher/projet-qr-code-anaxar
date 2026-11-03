import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

export const TONE_BADGE = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warn: 'bg-amber-50 text-amber-900 ring-amber-200',
  bad: 'bg-rose-50 text-rose-800 ring-rose-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  dark: 'bg-slate-900 text-white ring-slate-900',
};

/** Pastille de statut. tone : neutral | info | ok | warn | bad | brand | dark */
export function Badge({ tone = 'neutral', icon, size = 'md', children, className, ...rest }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 rounded-full font-medium ring-1 ring-inset',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs', TONE_BADGE[tone] || TONE_BADGE.neutral, className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 16 : 14} />}
      <span className="truncate">{children}</span>
    </span>
  );
}
