import { fmtAgo } from '../../../lib/domain.js';
import { Alert } from '../../../Components/ui/index.js';

/** Tâche planifiée (bin/cron.php) : relance des envois, purges, réinitialisation de la démonstration. */
export function CronStatus({ cron, now, demo }) {
  const last = cron?.last ? Date.parse(cron.last) : null;
  const late = !last || now - last > 3600000;
  const title = !last ? 'Tâche planifiée jamais exécutée'
    : late ? `Tâche planifiée en retard · dernière exécution ${fmtAgo(cron.last, now)}` : `Tâche planifiée active · dernière exécution ${fmtAgo(cron.last, now)}`;
  return (
    <Alert tone={late ? 'warn' : 'ok'} icon={late ? 'triangle-alert' : 'timer'} role="status" title={title}>
      {late ? (
        <>
          À ajouter dans cPanel › Tâches Cron, toutes les 15 minutes :{' '}
          <code className="break-all rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[12px] text-slate-900 ring-1 ring-inset ring-amber-200">{cron?.cmd || 'php …/portflow-app/bin/cron.php'}</code>.{' '}
          {demo ? 'Sans elle, la démonstration n’est pas réinitialisée chaque nuit.' : 'Sans elle, les e-mails et SMS en échec ne sont pas relancés.'}
        </>
      ) : cron.summary}
    </Alert>
  );
}
