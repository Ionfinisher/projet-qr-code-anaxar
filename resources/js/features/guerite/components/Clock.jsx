import { fmtTimeS } from '../../../lib/domain.js';
import { useNow } from '../../../hooks/useNow.js';
import { cn } from '../../../lib/cn.js';

/** Horloge de la guérite (heure de Lomé, à la seconde). */
export function Clock({ className }) {
  const now = useNow(1000);
  return (
    <span aria-label={`Heure de Lomé ${fmtTimeS(now)}`} className={cn('font-mono text-sm font-semibold tabular-nums tracking-wide text-slate-200', className)}>
      {fmtTimeS(now)}
    </span>
  );
}
