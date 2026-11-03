import { DOCS } from '../../../lib/domain.js';
import { cn } from '../../../lib/cn.js';
import { PostBadge } from './PostBadge.jsx';

const CARD = 'flex min-h-[88px] w-full cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/** Choix du poste : six postes (un document chacun) et, pour le chef de guérite, le poste superviseur. */
export function PostGrid({ current, supervisor, onPick, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {DOCS.map(d => (
        <button key={d.key} type="button" onClick={() => onPick(d.post)} aria-pressed={current === d.post}
          className={cn(CARD, current === d.post ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
          <PostBadge post={d.post} size="lg" />
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-900">{d.label}</span>
            <span className="mt-1 block text-sm text-slate-500">{d.hint}</span>
          </span>
        </button>
      ))}
      {supervisor && (
        <button type="button" onClick={() => onPick('sup')} aria-pressed={current === 'sup'}
          className={cn(CARD, 'sm:col-span-2 xl:col-span-3', current === 'sup' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white')}>
          <PostBadge post="sup" size="lg" />
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-900">Superviseur · chef de guérite</span>
            <span className="mt-1 block text-sm text-slate-500">Voit les 6 documents, ouvre la barrière, valide entrées et sorties.</span>
          </span>
        </button>
      )}
    </div>
  );
}
