import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

/** Carte blanche bordée : conteneur standard des blocs de contenu. */
export function Card({ as: As = 'section', padded = true, className, children, ...rest }) {
  return (
    <As className={cn('rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]', padded && 'p-5 sm:p-6', className)} {...rest}>
      {children}
    </As>
  );
}

/** Titre de section (h2 par défaut), avec icône et contenu aligné à droite (actions, compteur). */
export function SectionTitle({ icon, aside, children, as: As = 'h2', className }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <As className="flex items-center gap-2 text-base font-semibold text-slate-900">
        {icon && <Icon name={icon} size={18} className="text-slate-500" />}
        {children}
      </As>
      {aside}
    </div>
  );
}
