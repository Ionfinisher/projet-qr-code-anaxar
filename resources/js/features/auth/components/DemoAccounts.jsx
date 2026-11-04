import { Icon } from '../../../Components/ui/index.js';

/** Comptes de démonstration (mode démo uniquement) : connexion en un clic. */
export function DemoAccounts({ accounts, password, disabled, onPick, gateHref }) {
  if (!accounts.length) return null;
  return (
    <section aria-labelledby="pf-demo-acc" className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-4">
      <h3 id="pf-demo-acc" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="sparkles" size={15} className="text-brand-600" /> Comptes de démonstration</h3>
      <p className="mt-1 text-[13px] text-slate-600">
        Mot de passe commun : <span className="font-mono font-semibold text-slate-900">{password}</span>
        {gateHref && <> · agents de guérite : application <a href={gateHref} className="font-medium text-brand-700 underline underline-offset-2">Guérite</a></>}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {accounts.map(d => (
          <button key={d.id} type="button" disabled={disabled} onClick={() => onPick(d)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"><Icon name={d.icon} size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{d.label}</span>
              <span className="block truncate text-xs text-slate-500">{d.who} · {d.id}</span>
            </span>
            <Icon name="arrow-right" size={16} className="text-slate-400" />
          </button>
        ))}
      </div>
    </section>
  );
}
