import { hasPerm } from '../../../lib/domain.js';
import { notify } from '../../../lib/alerts.js';
import { useCurrentUser } from '../../../providers/PortFlowProvider.jsx';
import { Icon } from '../../../Components/ui/index.js';
import { Logo } from '../../../Components/domain/index.js';
import { TopBar, Spacer, SkipLink } from '../../../layouts/parts.jsx';
import { useAuthApi } from '../../auth/api.js';
import { useGateApi } from '../api.js';
import { postLabel } from '../../../lib/domain.js';
import { Clock } from '../components/Clock.jsx';
import { PostGrid } from '../components/PostGrid.jsx';

/** Première étape après la connexion : choix du poste (un document par poste, ou superviseur). */
export function PostPickerPage() {
  const { user, profile } = useCurrentUser();
  const auth = useAuthApi();
  const gate = useGateApi();
  const supervisor = hasPerm(profile, 'guerite.supervision');
  const pick = async p => {
    const r = await gate.setPost(p);
    if (!r.ok) { notify(r.error, 'bad'); return; }
    notify(`Poste actif : ${postLabel(p)}`, 'neutral');
  };
  const bye = async () => { await auth.logout(); notify('Session de guérite fermée', 'neutral'); };
  return (
    <div lang="fr" className="min-h-screen bg-slate-100 text-slate-900">
      <SkipLink />
      <TopBar dark>
        <Logo sub="Guérite · porte principale" dark />
        <Spacer />
        <Clock className="hidden sm:inline" />
        <button type="button" onClick={bye}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Icon name="log-out" size={18} /> Se déconnecter
        </button>
      </TopBar>
      <main id="pf-main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 py-8 focus:outline-none sm:px-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">Bonjour {user?.first}</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Choisissez votre poste</h1>
          <p className="mt-1 text-[15px] text-slate-500">Un poste vérifie un seul document. {supervisor ? 'Le superviseur voit l’ensemble et commande la barrière.' : 'La barrière est commandée par le chef de guérite.'}</p>
        </div>
        <PostGrid current={null} supervisor={supervisor} onPick={pick} />
      </main>
    </div>
  );
}
