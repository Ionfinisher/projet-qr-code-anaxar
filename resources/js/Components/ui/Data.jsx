import { initials } from '../../Lib/domain.js';
import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

/** Liste libellé / valeur : items [[libellé, valeur], …] (les entrées vides sont ignorées). */
export function KeyValue({ items, className, dense = false }) {
  return (
    <dl className={cn('grid grid-cols-1 sm:grid-cols-[minmax(130px,200px)_minmax(0,1fr)]', dense ? 'gap-x-5 gap-y-2' : 'gap-x-6 gap-y-3', 'text-sm', className)}>
      {items.filter(Boolean).map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="mb-2 min-w-0 break-words text-slate-900 sm:mb-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const STAT_TONE = { neutral: 'text-slate-900', ok: 'text-emerald-700', warn: 'text-amber-700', bad: 'text-rose-700', brand: 'text-brand-700', info: 'text-sky-700' };

/** Indicateur chiffré (tableau de bord, supervision). */
export function StatCard({ label, value, unit, hint, icon, tone = 'neutral', onClick, className }) {
  const As = onClick ? 'button' : 'div';
  return (
    <As type={onClick ? 'button' : undefined} onClick={onClick}
      className={cn('flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
        onClick && 'cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', className)}>
      <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-slate-500">
        <span>{label}</span>{icon && <Icon name={icon} size={17} className="text-slate-400" />}
      </span>
      <span className={cn('text-3xl font-bold tabular-nums tracking-tight', STAT_TONE[tone])}>
        {value}{unit && <small className="ml-1 text-base font-semibold text-slate-500">{unit}</small>}
      </span>
      {hint && <span className="text-[13px] text-slate-500">{hint}</span>}
    </As>
  );
}

/** Jauge segmentée (occupation d'un créneau). */
export function Meter({ rate, closed, segments = 10, label, className }) {
  const on = Math.round(Math.min(1, Math.max(0, rate)) * segments);
  const color = closed ? 'bg-slate-400' : rate >= 1 ? 'bg-rose-500' : rate >= 0.85 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'} className={cn('inline-flex gap-0.5', className)}>
      {Array.from({ length: segments }, (_, i) => <i key={i} className={cn('block h-2 w-1.5 rounded-[2px]', i < on ? color : 'bg-slate-200')} />)}
    </span>
  );
}

const AVATAR_TONE = { neutral: 'bg-slate-200 text-slate-700', brand: 'bg-brand-100 text-brand-800', dark: 'bg-slate-800 text-white', ok: 'bg-emerald-100 text-emerald-800' };

export function Avatar({ name, size = 32, tone = 'brand', className }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', AVATAR_TONE[tone], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>{initials(name)}</span>
  );
}

/** Étapes d'un assistant : steps [{ label }], current = index de l'étape affichée. */
export function Stepper({ steps, current, onStep, className }) {
  return (
    <ol className={cn('flex items-center gap-2 overflow-x-auto', className)} aria-label="Étapes">
      {steps.map((s, i) => {
        const done = i < current, on = i === current;
        const dot = (
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            done ? 'bg-emerald-600 text-white' : on ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600')}>
            {done ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}
          </span>
        );
        return (
          <li key={s.label} className="flex shrink-0 items-center gap-2" aria-current={on ? 'step' : undefined}>
            {onStep && done ? (
              <button type="button" onClick={() => onStep(i)} className="flex cursor-pointer items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                {dot}<span className="text-sm font-medium text-slate-700 hover:text-slate-900">{s.label}</span>
              </button>
            ) : (
              <>{dot}<span className={cn('text-sm', on ? 'font-semibold text-slate-900' : 'font-medium text-slate-500', !on && 'hidden sm:inline')}>{s.label}</span></>
            )}
            {i < steps.length - 1 && <span className={cn('h-px w-6 sm:w-10', done ? 'bg-emerald-500' : 'bg-slate-200')} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Tableau : columns [{ key, header, render(row), className, headerClassName }], rows, rowKey(row).
 * Sur petit écran, le tableau défile horizontalement.
 */
export function DataTable({ columns, rows, rowKey = r => r.id, onRowClick, caption, empty, className, rowClassName }) {
  if (!rows.length && empty) return empty;
  return (
    <div className={cn('relative overflow-x-auto rounded-2xl border border-slate-200 bg-white', className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map(c => (
              <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500', c.headerClassName)}>
                {c.srOnly ? <span className="sr-only">{c.header}</span> : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(r => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn('align-middle', onRowClick && 'cursor-pointer hover:bg-slate-50', rowClassName?.(r))}>
              {columns.map(c => <td key={c.key} className={cn('px-4 py-3 text-slate-700', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
