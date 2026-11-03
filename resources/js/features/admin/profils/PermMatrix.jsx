import { PERM_GROUPS } from '../../../lib/domain.js';
import { cn } from '../../../lib/cn.js';

/**
 * Matrice des habilitations d'un type de profil (interne / externe).
 * Règles : retirer « consulter » retire aussi les droits d'action du groupe ; un droit d'action ajoute « consulter ».
 */
export function PermMatrix({ kind, value, onChange, disabled }) {
  const groups = PERM_GROUPS.filter(g => g.kind === kind);
  const all = value.includes('*');
  const toggle = (g, key) => {
    const set = new Set(value);
    if (set.has(key)) {
      set.delete(key);
      if (key.endsWith('.consulter')) g.perms.forEach(([k]) => set.delete(k)); // sans consultation, pas de traitement
    } else {
      set.add(key);
      const read = g.perms.find(([k]) => k.endsWith('.consulter'));
      if (read && !key.endsWith('.consulter')) set.add(read[0]);
    }
    onChange([...set]);
  };
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {groups.map(g => (
        <fieldset key={g.key} disabled={disabled} className="rounded-2xl border border-slate-200 p-3.5">
          <legend className="px-1.5 text-sm font-semibold text-slate-900">{g.label}</legend>
          <div className="flex flex-col gap-1">
            {g.perms.map(([k, label]) => {
              const on = all || value.includes(k);
              return (
                <label key={k} className={cn('flex items-start gap-3 rounded-xl px-2 py-2 text-sm', disabled ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50')}>
                  <input type="checkbox" checked={on} onChange={() => toggle(g, k)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600 disabled:opacity-70" />
                  <span className="min-w-0">
                    <span className={cn('block', on ? 'font-medium text-slate-900' : 'text-slate-600')}>{label}</span>
                    <small className="block font-mono text-[11px] text-slate-400">{k}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
