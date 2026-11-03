// Éléments d'affichage d'un rendez-vous : statut, conteneur ISO 6346, plaque, créneau, contrôles.
import { STATUS, statusOf, splitContainer, COUNTRY, DOCS, checkCounts, relDay } from '../../Lib/domain.js';
import { Badge } from '../ui/Badge.jsx';
import { cn } from '../../Lib/cn.js';

/** Statut dérivé d'un rendez-vous (confirmé, contrôle en cours, dans le port…). */
export function RdvStatusBadge({ rdv, now, size }) {
  const st = STATUS[statusOf(rdv, now)];
  return <Badge tone={st.tone} icon={st.icon} size={size}>{st.label}</Badge>;
}

/** Statut à partir d'un référentiel { statut: { label, short, tone, icon } } (INS_STATUS, DEM_STATUS…). */
export function StatusTag({ map, status, short = false, size }) {
  const st = map[status];
  if (!st) return null;
  return <Badge tone={st.tone} icon={st.icon} size={size}>{short ? st.short || st.label : st.label}</Badge>;
}

const CN_SIZE = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-xl' };

/** Numéro de conteneur ISO 6346 : chiffre de contrôle encadré, comme sur la porte du conteneur. */
export function ContainerNumber({ value, size = 'md', placeholder = 'À attribuer au terminal', className }) {
  const p = splitContainer(value);
  if (!p) return <span className={cn('font-mono text-slate-500', CN_SIZE[size], !value && 'italic', className)}>{value || placeholder}</span>;
  return (
    <span aria-label={`Conteneur ${p.owner} ${p.serial}, chiffre de contrôle ${p.check}`}
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-semibold tracking-wide text-slate-900', CN_SIZE[size], className)}>
      <span>{p.owner}</span><span>{p.serial}</span>
      <span className="rounded-[4px] border-2 border-slate-900 px-1 leading-tight">{p.check}</span>
    </span>
  );
}

const PLATE_SIZE = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };

/** Plaque d'immatriculation avec code pays. */
export function Plate({ country = 'TG', value, size = 'md', className }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <span aria-label={`Immatriculation ${value}, ${COUNTRY[country]?.name || country}`}
      className={cn('inline-flex items-stretch overflow-hidden rounded-md border-2 border-slate-900 bg-white font-mono font-bold uppercase leading-none text-slate-900', PLATE_SIZE[size], className)}>
      <span className="flex items-center bg-[#1d4ed8] px-1.5 text-[0.72em] text-white">{country}</span>
      <span className={cn('flex items-center whitespace-nowrap tracking-wider', size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-1')}>{value}</span>
    </span>
  );
}

/** Créneau : jour relatif (Aujourd'hui, Demain…) et plage horaire. */
export function SlotLabel({ slot, withDay = true, className }) {
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      {withDay && <span className="text-sm text-slate-500">{relDay(slot.date)}</span>}
      <span className="font-semibold tabular-nums text-slate-900">{slot.start}–{slot.end}</span>
    </span>
  );
}

/** Six segments : état du contrôle de chaque document à la guérite. */
export function ChecksBar({ rdv, className }) {
  const { ok } = checkCounts(rdv);
  return (
    <span role="img" aria-label={`Contrôles validés : ${ok} sur 6`} className={cn('inline-flex gap-1', className)}>
      {DOCS.map(d => {
        const c = rdv.checks?.[d.key];
        return <span key={d.key} title={d.label} className={cn('h-2 w-4 rounded-full', c?.s === 'ok' ? 'bg-emerald-500' : c?.s === 'ko' ? 'bg-rose-500' : 'bg-slate-200')} />;
      })}
    </span>
  );
}
