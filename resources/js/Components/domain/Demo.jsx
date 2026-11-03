import { confirmAction, notify } from '../../Lib/alerts.js';
import { useServerConfig } from '../../providers/PortFlowProvider.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../Lib/cn.js';

/**
 * Bandeau du mode démonstration (affiché seulement si le serveur est en mode démo).
 * `onReset` : réinitialisation des données (réservée au super administrateur).
 */
export function DemoBanner({ onReset, className, dark = false }) {
  const config = useServerConfig();
  if (!config.demo) return null;
  const reset = async () => {
    const ok = await confirmAction({
      title: 'Réinitialiser la démonstration ?',
      text: 'Toutes les saisies sont effacées et les exemples rechargés. Les utilisateurs connectés devront se reconnecter.',
      confirmText: 'Réinitialiser', tone: 'danger',
    });
    if (!ok) return;
    try {
      await onReset();
      notify('Démonstration réinitialisée : reconnectez-vous', 'ok');
    } catch (e) {
      notify(e?.message || 'Réinitialisation impossible', 'bad');
    }
  };
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 text-xs', dark ? 'text-slate-400' : 'text-slate-500', className)}>
      <span className="inline-flex items-center gap-1.5 font-medium"><Icon name="sparkles" size={14} className="text-brand-500" /> Démonstration · données fictives</span>
      {onReset && <Button variant="ghost" size="sm" icon="rotate-ccw" onClick={reset}>Réinitialiser la démo</Button>}
    </div>
  );
}
