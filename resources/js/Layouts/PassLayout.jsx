// Pass chauffeur : page publique ouverte depuis le lien WhatsApp ou SMS (mobile d'abord).
import { Logo } from '../components/domain/Logo.jsx';
import { SkipLink, TopBar } from './parts.jsx';

export function PassLayout({ children }) {
  return (
    <div lang="fr" className="min-h-screen bg-slate-100 text-slate-900">
      <SkipLink />
      <TopBar><Logo sub="Pass chauffeur" /></TopBar>
      <main id="pf-main" tabIndex={-1} className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6 focus:outline-none">{children}</main>
    </div>
  );
}
