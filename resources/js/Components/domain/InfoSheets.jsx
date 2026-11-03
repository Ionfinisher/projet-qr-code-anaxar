// Panneaux d'information : cas d'utilisation couverts et standards appliqués.
import { USE_CASES } from '../../Lib/domain.js';
import { Drawer } from '../ui/Overlay.jsx';

export const PLATFORM_STANDARDS = [
  ['RBAC', 'Profils et habilitations', 'Chaque écran et chaque action sont autorisés selon le profil de l’utilisateur ; le contrôle est fait par le serveur.'],
  ['Argon2id · bcrypt', 'Mots de passe', 'Hachés sur le serveur, jamais stockés en clair ; 12 caractères et 4 types de caractères minimum.'],
  ['Anti-force brute', 'Connexion', '5 essais par identifiant puis blocage de 60 secondes, plafond par adresse IP ; message identique que le compte existe ou non.'],
  ['Sessions sécurisées', 'Cookies et jeton anti-CSRF', 'Cookie HttpOnly, Secure, SameSite ; jeton vérifié à chaque action ; déconnexion après inactivité.'],
  ['Loi n° 2019-014', 'Données personnelles (Togo)', 'Consentement recueilli à l’inscription ; données limitées à la finalité du service.'],
  ['RFC 7515 · ES256', 'QR code signé', 'Émis seulement après validation, signé sur le serveur (ECDSA P-256) : la clé privée ne quitte jamais le serveur.'],
  ['ISO 6346', 'Identification des conteneurs', 'Code propriétaire, numéro de série et chiffre de contrôle vérifiés à la saisie et sur le serveur.'],
  ['ISO 3166-1 · E.164', 'Pays et téléphones', 'Plaques du corridor et numéros au format international pour les SMS et WhatsApp.'],
  ['ISO 8601', 'Horodatage', 'Chaque décision est datée en UTC, heure de Lomé.'],
  ['SHA-256', 'Empreinte des pièces', 'Chaque fichier est identifié par son empreinte, contrôlé (type réel, 10 Mo) et stocké hors du site, réservé aux personnes habilitées.'],
  ['WCAG 2.2 AA', 'Accessibilité', 'Contrastes, navigation clavier, cibles tactiles de 44 px.'],
];

/** Standards appliqués : items [[code, titre, description]]. */
export function StandardsDrawer({ open, onClose, items = PLATFORM_STANDARDS, intro = 'Règles appliquées par la plateforme.' }) {
  return (
    <Drawer open={open} onClose={onClose} title="Standards appliqués" size="lg">
      {intro && <p className="text-sm text-slate-500">{intro}</p>}
      <ul className="flex flex-col divide-y divide-slate-100">
        {items.map(([code, t, d]) => (
          <li key={code + t} className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
            <span className="font-mono text-xs font-semibold text-brand-700">{code}</span>
            <span><span className="block text-sm font-semibold text-slate-900">{t}</span><span className="text-sm text-slate-600">{d}</span></span>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

/** Les 27 cas d'utilisation et l'écran où chacun est réalisé. */
export function UseCasesDrawer({ open, onClose }) {
  const total = USE_CASES.reduce((n, p) => n + p.items.length, 0);
  return (
    <Drawer open={open} onClose={onClose} title="Cas d’utilisation" description={`${total} cas couverts par la plateforme et l’application Guérite.`} size="lg">
      {USE_CASES.map(p => (
        <section key={p.pkg}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{p.pkg}</h3>
          <ul className="flex flex-col gap-2">
            {p.items.map(([uc, actors, where]) => (
              <li key={uc} className="rounded-xl border border-slate-200 px-3.5 py-2.5">
                <p className="text-sm font-semibold text-slate-900">{uc}</p>
                <p className="text-[13px] text-slate-500">{actors}</p>
                <p className="mt-1 text-[13px] text-slate-700">{where}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Drawer>
  );
}
