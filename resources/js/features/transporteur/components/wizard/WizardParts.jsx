import { Icon } from '../../../../Components/ui/index.js';
import { cn } from '@/Lib/cn';

/** Section titrée d'une étape de l'assistant. */
export function WizardSection({ icon, title, aside, children, className }) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Icon name={icon} size={18} className="text-slate-500" /> {title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Numéro de camion (01, 02…). */
export function TruckNo({ n, className }) {
  return <span className={cn('inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg bg-slate-900 px-1.5 text-xs font-bold tabular-nums text-white', className)}>{String(n).padStart(2, '0')}</span>;
}

/** Sous-titre d'un groupe de champs (Chauffeur, Véhicule, Conteneur). */
export function SubTitle({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{children}</p>;
}
