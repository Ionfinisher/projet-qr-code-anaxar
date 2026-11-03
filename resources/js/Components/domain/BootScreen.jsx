import { getPortFlowConfig } from '../../config.js';
import { Icon } from '../ui/Icon.jsx';
import { Button } from '../ui/Button.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { LogoMark } from './Logo.jsx';

/** Écran de démarrage : chargement, serveur injoignable ou PortFlow non installé. */
export function BootScreen({ error, dark = false }) {
  const notInstalled = error?.reason === 'not_installed';
  const installUrl = getPortFlowConfig().apiBase.replace(/api\/index\.php.*$/, 'install/');
  return (
    <div lang="fr" className={dark ? 'flex min-h-screen items-center justify-center bg-slate-950 p-6' : 'flex min-h-screen items-center justify-center bg-slate-50 p-6'}>
      <div className="flex max-w-md flex-col items-center gap-3 text-center" role={error ? 'alert' : 'status'}>
        {!error ? (
          <>
            <LogoMark size={48} />
            <p className={dark ? 'mt-2 text-base font-semibold text-white' : 'mt-2 text-base font-semibold text-slate-900'}>Connexion à PortFlow…</p>
            <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner size={16} /> Chargement des créneaux et des rendez-vous</p>
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Icon name={notInstalled ? 'settings' : 'wifi-off'} size={26} /></span>
            <p className={dark ? 'text-base font-semibold text-white' : 'text-base font-semibold text-slate-900'}>{notInstalled ? 'PortFlow n’est pas encore installé' : 'Serveur injoignable'}</p>
            <p className="text-sm text-slate-500">
              {notInstalled ? 'Lancez l’installateur : il crée la base de données, la clé de signature des QR codes et le compte super administrateur.' : (error.error || 'Vérifiez la connexion puis réessayez.')}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {notInstalled && <Button href={installUrl}>Ouvrir l’installateur</Button>}
              <Button variant="secondary" icon="refresh-cw" onClick={() => window.location.reload()}>Réessayer</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
