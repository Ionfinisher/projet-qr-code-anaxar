import { Badge } from '@/Components/ui/Badge';
import { Icon } from '@/Components/ui/Icon';
import { cn } from '@/Lib/cn';
import { DOCS, parseBL, parseContainer, licenseValid, relDay } from '@/Lib/domain';

/**
 * Calcul du délai avant le début du créneau d'une demande en attente.
 */
export function urgencyOf(demande, now = Date.now()) {
    if (!demande?.slot || !demande?.slot?.start) {
        return { tone: 'neutral', label: '—' };
    }

    const slotDate = demande.slot.date;
    const slotStart = demande.slot.start;
    const [hStr = '0', mStr = '0'] = slotStart.split(':');
    const targetDate = new Date(`${slotDate}T${hStr.padStart(2, '0')}:${mStr.padStart(2, '0')}:00Z`);
    const nowMs = typeof now === 'number' ? now : new Date(now).getTime();
    const ms = targetDate.getTime() - nowMs;
    const h = ms / 3600000;

    const tone = h < 3 ? 'bad' : h < 12 ? 'warn' : 'neutral';
    const label =
        ms <= 0
            ? 'Créneau commencé'
            : h < 1
            ? `Dans ${Math.max(1, Math.round(ms / 60000))} min`
            : h < 48
            ? `Dans ${Math.round(h)} h`
            : `Dans ${Math.round(h / 24)} j`;

    return { tone, label };
}

/**
 * Badge d'urgence avant le début du créneau.
 */
export function UrgencyBadge({ demande, now, size }) {
    const u = urgencyOf(demande, now);
    return (
        <Badge tone={u.tone} icon="timer" size={size}>
            {u.label}
        </Badge>
    );
}

/**
 * Mention affichée en mode lecture seule.
 */
export function ReadOnlyNote({ children }) {
    return (
        <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <Icon name="lock" size={14} /> {children}
        </p>
    );
}

/**
 * Ligne cliquable de liste de demandes : repère horaire à gauche, infos au centre, statut / badge à droite.
 */
export function RecordRow({ leading, title, line2, line3, side, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'true' : undefined}
            className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:gap-4 sm:p-4',
                active
                    ? 'border-brand-400 ring-1 ring-brand-400'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
            )}
        >
            <span className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {leading}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-slate-900">{title}</span>
                {line2 && <span className="mt-0.5 block truncate text-[13px] text-slate-600">{line2}</span>}
                {line3 && <span className="mt-0.5 block truncate text-xs text-slate-500">{line3}</span>}
                {side && <span className="mt-2 flex sm:hidden">{side}</span>}
            </span>
            {side && <span className="hidden shrink-0 sm:block">{side}</span>}
        </button>
    );
}

/**
 * Barre d'outils d'une liste : filtres et recherche.
 */
export function ListTools({ children, className }) {
    return (
        <div className={cn('mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className)}>
            {children}
        </div>
    );
}

/**
 * Barre d'actions de décision (Valider / Rejeter).
 */
export function DecisionBar({ children }) {
    return (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {children}
        </div>
    );
}

/**
 * Contrôles automatiques d'aide à la décision avant validation.
 */
export function calculateDemandeChecks(d, now = Date.now()) {
    const owner = d.owner;
    const trucks = d.trucks || [];
    const slot = d.slot;
    const usage = d.usage;
    const op = d.operation || d.op;
    const needBL = op === 'IMP' || op === 'EXP';
    const withCtr = trucks.filter((r) => r.container?.number);
    const slotStartMs =
        slot?.date && slot?.start
            ? new Date(`${slot.date}T${slot.start.padStart(2, '0')}:00Z`).getTime()
            : 0;

    const checks = [
        {
            ok: !!owner?.active,
            t: 'Compte transporteur actif',
            d: owner ? owner.company || owner.name || 'Compte actif' : 'Compte introuvable',
        },
        {
            ok: !!slot?.open && (!usage || usage.remaining >= trucks.length),
            t: 'Créneau ouvert & capacité suffisante',
            d: slot
                ? `${slot.start}–${slot.end} · ${
                      usage
                          ? `${usage.used}/${slot.capacity || 40} places (${usage.remaining} restantes)`
                          : 'Créneau disponible'
                  }`
                : 'Créneau non assigné',
        },
        {
            ok: trucks.every(
                (r) =>
                    (op === 'MTP' && !r.container?.number) ||
                    (r.container?.number && parseContainer(r.container.number).valid)
            ),
            t: 'Conteneurs conformes ISO 6346',
            d: withCtr.length
                ? `${withCtr.filter((r) => parseContainer(r.container.number).valid).length}/${
                      withCtr.length
                  } numéros ISO 6346 valides`
                : 'Conteneurs vides attribués par le terminal',
        },
        needBL && {
            ok: trucks.length > 0 && trucks.every((r) => parseBL(r.container?.bl).valid),
            t: 'Connaissements renseignés',
            d:
                [...new Set(trucks.map((r) => parseBL(r.container?.bl).carrier).filter(Boolean))].join(', ') ||
                'Format de connaissement vérifié',
        },
        {
            ok: trucks.length > 0 && trucks.every((r) => licenseValid(r.driver?.license)),
            t: 'Permis de conduire renseignés',
            d: `${trucks.filter((r) => licenseValid(r.driver?.license)).length}/${
                trucks.length
            } n° de permis valide${trucks.length > 1 ? 's' : ''}`,
        },
        {
            ok: DOCS.every((x) => d.documents?.[x.key] || d.docs?.[x.key]),
            t: 'Dossier documentaire complet',
            d: `${
                DOCS.filter((x) => d.documents?.[x.key] || d.docs?.[x.key]).length
            }/6 documents déposés`,
        },
        {
            ok: slotStartMs > now,
            t: 'Créneau à venir',
            d: slot?.date ? `${relDay(slot.date)} · ${slot.start}` : 'Date non définie',
        },
    ].filter(Boolean);

    return {
        checks,
        allOk: checks.every((c) => c.ok),
    };
}

