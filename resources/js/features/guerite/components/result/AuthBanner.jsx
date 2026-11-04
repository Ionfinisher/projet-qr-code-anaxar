import { fmtDateTime } from '../../../../lib/domain.js';
import { Badge, Icon } from '../../../../Components/ui/index.js';
import { cn } from '../../../../lib/cn.js';
import { SOURCE } from '../../constants.js';

/** Authenticité du dossier : QR signé vérifié (ES256), ou dossier ouvert sans QR (identité à confirmer). */
export function AuthBanner({ cur }) {
  const v = cur.verif;
  const timing = v?.ok ? (v.timing === 'early' ? 'QR pas encore valide à cette heure' : v.timing === 'expired' ? 'QR expiré' : null) : null;
  const ok = v?.ok && !timing;
  const title = v?.ok ? timing || 'QR authentique · signature valide' : 'Dossier ouvert sans QR code';
  const detail = v?.ok
    ? `ES256 · clé ${v.header?.kid} · émis le ${fmtDateTime((v.claims?.iat || 0) * 1000)} · ${SOURCE[cur.source] || ''}`
    : `${SOURCE[cur.source] || ''} · contrôlez la pièce d’identité du chauffeur et les plaques avant toute décision.`;
  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]', ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white', ok ? 'bg-emerald-600' : 'bg-amber-500')}>
        <Icon name={!v?.ok ? 'keyboard' : timing ? 'shield-alert' : 'shield-check'} size={24} />
      </span>
      <div className="min-w-0">
        <p className={cn('text-base font-bold', ok ? 'text-emerald-950' : 'text-amber-950')}>{title}</p>
        <p className="text-[13px] text-slate-600">{detail}</p>
      </div>
      <div className="col-start-2 sm:col-start-auto">
        {v?.ok
          ? <Badge tone={timing ? 'warn' : 'ok'} icon="fingerprint">Signature vérifiée</Badge>
          : <Badge tone="warn" icon="user-check">Identité à confirmer</Badge>}
      </div>
    </div>
  );
}
