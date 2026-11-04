import { Icon } from '../../../Components/ui/index.js';
import { cn } from '../../../lib/cn.js';

const SIZE = { sm: 'h-7 w-7 text-sm rounded-lg', md: 'h-9 w-9 text-base rounded-xl', lg: 'h-12 w-12 text-xl rounded-2xl' };

/** Numéro de poste (1 à 6) ou clé du superviseur. `inverted` : sur fond sombre. */
export function PostBadge({ post, size = 'md', inverted = false, className }) {
  const sup = post === 'sup';
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 items-center justify-center font-extrabold tabular-nums', SIZE[size],
      sup ? 'bg-brand-600 text-white' : inverted ? 'bg-white text-slate-900' : 'bg-slate-900 text-white', className)}>
      {sup ? <Icon name="key-round" size={size === 'lg' ? 22 : size === 'sm' ? 15 : 18} /> : post}
    </span>
  );
}
