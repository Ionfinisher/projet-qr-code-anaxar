// Éléments communs des modules d'administration.
import { Badge, EmptyState, Icon } from '@/Components/ui/index.js';
import { urgencyOf } from '../selectors.js';
import { cn } from '@/Lib/cn.js';

/** Délai avant le créneau d'une demande en attente. */
export function UrgencyBadge({ demande, now, size }) {
  const u = urgencyOf(demande, now);
  return <Badge tone={u.tone} icon="timer" size={size}>{u.label}</Badge>;
}


/** Mention affichée quand le profil permet de consulter mais pas d'agir. */
export function ReadOnlyNote({ children }) {
  return <p className="flex items-center gap-1.5 text-[13px] text-slate-500"><Icon name="lock" size={14} /> {children}</p>;
}

/**
 * Ligne de liste cliquable (inscription, demande) : repère à gauche, trois lignes de texte, statut à droite.
 */
export function RecordRow({ leading, title, line2, line3, side, active, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'true' : undefined}
      className={cn('flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:gap-4 sm:p-4',
        active ? 'border-brand-400 ring-1 ring-brand-400' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60')}>
      <span className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-700">{leading}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-slate-900">{title}</span>
        {line2 && <span className="mt-0.5 block truncate text-[13px] text-slate-600">{line2}</span>}
        {line3 && <span className="mt-0.5 block truncate text-xs text-slate-500">{line3}</span>}
        {side && <span className="mt-2 flex sm:hidden">{side}</span>}
      </span>
      {side && <span className="hidden shrink-0 sm:block">{side}</span>}
    </button>
  );
}

/** Barre d'outils d'une liste : filtres et recherche. */
export function ListTools({ children, className }) {
  return <div className={cn('mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className)}>{children}</div>;
}

/** Carte de décision (boutons Valider / Rejeter…). */
export function DecisionBar({ children }) {
  return <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">{children}</div>;
}
