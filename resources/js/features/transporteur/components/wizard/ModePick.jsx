import { fmtDayLong } from '../../../../lib/domain.js';
import { Button, Icon } from '../../../../components/ui/index.js';
import { cn } from '../../../../lib/cn.js';
import { cap } from '../../selectors.js';

function ModeCard({ title, text, trucks, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="group flex cursor-pointer flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <span aria-hidden="true" className="flex h-16 items-end gap-1.5">
        {Array.from({ length: trucks }, (_, i) => (
          <span key={i} className={cn('block w-12 rounded-md', i === 0 ? 'h-12 bg-brand-500' : i === 1 ? 'h-10 bg-slate-800' : 'h-8 bg-sky-500')} />
        ))}
      </span>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600">{text}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">Commencer <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" /></span>
    </button>
  );
}

/** Premier écran de l'assistant : un camion ou plusieurs camions sur le même créneau. */
export function ModePick({ onPick, onCancel, initialSlot }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
            Nouvelle demande de rendez-vous{initialSlot ? ` · ${cap(fmtDayLong(initialSlot.date + 'T12:00:00Z'))}, ${initialSlot.start}` : ''}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Combien de camions pour ce créneau ?</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-slate-500">L’opération et le créneau sont saisis une seule fois. Après validation par le port, chaque camion reçoit son propre QR code.</p>
        </div>
        <Button variant="ghost" icon="x" onClick={onCancel}>Annuler</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ModeCard title="Un camion" text="Un conteneur, un chauffeur, un QR code." trucks={1} onClick={() => onPick('single')} />
        <ModeCard title="Plusieurs camions" text="Une seule demande, un QR code par camion. Saisie ligne à ligne ou collage depuis un tableur." trucks={3} onClick={() => onPick('lot')} />
      </div>
    </div>
  );
}
