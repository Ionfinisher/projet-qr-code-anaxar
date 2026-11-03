import { ICONS } from '../../Lib/icons.js';
import { cn } from '../../Lib/cn.js';

/**
 * Icône Lucide par son nom (« scan-line », « truck »…). Décorative par défaut ;
 * avec `label`, elle est annoncée par les lecteurs d'écran.
 */
export function Icon({ name, size = 20, strokeWidth = 2, label, className, ...rest }) {
  const C = ICONS[name] || ICONS.circle;
  return (
    <C size={size} strokeWidth={strokeWidth} className={cn('shrink-0', className)} focusable="false"
      aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined} {...rest} />
  );
}
