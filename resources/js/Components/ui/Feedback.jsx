import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

const ALERT = {
  info: { box: 'border-sky-200 bg-sky-50', icon: 'info', ic: 'text-sky-600', title: 'text-sky-950' },
  ok: { box: 'border-emerald-200 bg-emerald-50', icon: 'circle-check', ic: 'text-emerald-600', title: 'text-emerald-950' },
  warn: { box: 'border-amber-200 bg-amber-50', icon: 'triangle-alert', ic: 'text-amber-600', title: 'text-amber-950' },
  bad: { box: 'border-rose-200 bg-rose-50', icon: 'circle-x', ic: 'text-rose-600', title: 'text-rose-950' },
  neutral: { box: 'border-slate-200 bg-slate-50', icon: 'info', ic: 'text-slate-500', title: 'text-slate-900' },
  brand: { box: 'border-brand-200 bg-brand-50', icon: 'sparkles', ic: 'text-brand-600', title: 'text-slate-900' },
};

/** Message dans la page. tone : info | ok | warn | bad | neutral | brand */
export function Alert({ tone = 'info', icon, title, children, action, role, className }) {
  const t = ALERT[tone] || ALERT.info;
  return (
    <div role={role} className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3.5', t.box, className)}>
      <Icon name={icon || t.icon} size={20} className={cn('mt-0.5', t.ic)} />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className={cn('font-semibold', t.title)}>{title}</p>}
        {children && <div className={cn('text-slate-700', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** État vide (liste sans résultat, attente d'une action). */
export function EmptyState({ icon = 'circle-dashed', title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Icon name={icon} size={26} /></span>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {children && <p className="max-w-md text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
