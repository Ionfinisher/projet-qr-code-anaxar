import { Link } from '@inertiajs/react';
import {
    DOCS,
    OPS,
    TERMINALS,
    ISO_TYPE,
    KID,
    checkCounts,
    statusOf,
    slotRange,
    fmtDayLong,
    fmtTime,
    fmtSize,
    fmtDuration,
    relDay,
    dayStr,
    driverName,
    transporterName,
    formatPhone,
} from '@/Lib/domain';
import { Alert } from '@/Components/ui/Feedback';
import { Badge } from '@/Components/ui/Badge';
import { Card, SectionTitle } from '@/Components/ui/Card';
import { KeyValue } from '@/Components/ui/Data';
import { Icon } from '@/Components/ui/Icon';
import { GatePass } from './GatePass';
import { RdvStatusBadge, ContainerNumber, Plate } from './Rdv';
import { PassActions } from './PassActions';
import { LotChip } from './RdvRow';
import { cn } from '@/Lib/cn';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const latestCheck = (r) =>
    DOCS.map((d) => r.checks?.[d.key]?.at)
        .filter(Boolean)
        .sort()
        .pop() || null;

export function RdvTimeline({ rdv: r, now }) {
    const st = statusOf(r, now);
    const { ok, ko } = checkCounts(r);
    const steps = [
        {
            t: 'Demande soumise',
            d: `${OPS[r.op]?.label || r.op} · ${TERMINALS[r.terminal]?.short || r.terminal}`,
            at: r.createdAt,
            done: true,
        },
        {
            t: 'Demande validée · QR signé émis',
            d: `JWS ES256 · clé ${KID || 'pf-2026'}`,
            at: r.issuedAt,
            done: !!r.issuedAt,
        },
        {
            t: 'Arrivée à la guérite',
            d: r.arrivedAt
                ? 'QR scanné, signature vérifiée'
                : st === 'manque'
                ? 'Créneau dépassé sans présentation'
                : `Attendu ${relDay(r.slot?.date).toLowerCase()} entre ${r.slot?.start} et ${
                      r.slot?.end
                  }`,
            at: r.arrivedAt,
            done: !!r.arrivedAt,
            bad: st === 'manque',
        },
        {
            t: 'Contrôle des 6 documents',
            d: ko
                ? `${ok}/6 validés · ${ko} rejeté${ko > 1 ? 's' : ''}`
                : `${ok}/6 validés`,
            at: ok === 6 ? latestCheck(r) : null,
            done: ok === 6,
            bad: ko > 0,
            now: !!r.arrivedAt && ok < 6 && !ko,
        },
        {
            t: 'Entrée dans le port',
            d: r.entryAt ? 'Barrière ouverte' : 'Après validation des 6 documents',
            at: r.entryAt,
            done: !!r.entryAt,
            now: ok === 6 && !r.entryAt,
        },
        {
            t: 'Sortie',
            d: r.exitAt
                ? `Durée dans le port : ${fmtDuration(
                      Date.parse(r.exitAt) - Date.parse(r.entryAt)
                  )}`
                : r.entryAt
                ? `Dans le port depuis ${fmtDuration(now - Date.parse(r.entryAt))}`
                : '',
            at: r.exitAt,
            done: !!r.exitAt,
            now: !!r.entryAt && !r.exitAt,
        },
    ];

    return (
        <ol className="flex flex-col">
            {steps.map((x, i) => {
                const state = x.done
                    ? 'done'
                    : x.bad
                    ? 'bad'
                    : x.now
                    ? 'now'
                    : 'todo';
                return (
                    <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < steps.length - 1 && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5',
                                    x.done ? 'bg-emerald-300' : 'bg-slate-200'
                                )}
                            />
                        )}
                        <span
                            className={cn(
                                'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                                state === 'done'
                                    ? 'bg-emerald-600 text-white'
                                    : state === 'bad'
                                    ? 'bg-rose-600 text-white'
                                    : state === 'now'
                                    ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500'
                                    : 'bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200'
                            )}
                        >
                            <Icon
                                name={
                                    state === 'done'
                                        ? 'check'
                                        : state === 'bad'
                                        ? 'x'
                                        : state === 'now'
                                        ? 'circle-dot'
                                        : 'circle'
                                }
                                size={14}
                                strokeWidth={2.6}
                            />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 pt-0.5">
                            <div className="min-w-0">
                                <p
                                    className={cn(
                                        'text-sm font-semibold',
                                        state === 'todo' ? 'text-slate-500' : 'text-slate-900'
                                    )}
                                >
                                    {x.t}
                                </p>
                                {x.d && (
                                    <p
                                        className={cn(
                                            'text-[13px]',
                                            state === 'bad' ? 'text-rose-700' : 'text-slate-500'
                                        )}
                                    >
                                        {x.d}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs tabular-nums text-slate-500">
                                {x.at
                                    ? `${
                                          relDay(dayStr(x.at)) === 'Aujourd’hui'
                                              ? ''
                                              : relDay(dayStr(x.at)) + ' '
                                      }${fmtTime(x.at)}`
                                    : ''}
                            </span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

export function DocStatusRow({ doc: d, meta, check }) {
    const tone = check?.s === 'ok' ? 'ok' : check?.s === 'ko' ? 'bad' : 'neutral';
    return (
        <li
            className={cn(
                'flex items-start gap-3 py-3 first:pt-0 last:pb-0',
                check?.s === 'ko' && 'rounded-xl bg-rose-50/60 px-2 first:pt-2 last:pb-2'
            )}
        >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Icon name={d.icon || 'file-text'} size={18} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{d.label}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-slate-500">
                    {meta ? (
                        <>
                            <span className="max-w-[220px] truncate">{meta.name}</span>
                            {meta.size > 0 && <span>{fmtSize(meta.size)}</span>}
                            {meta.sha256 && (
                                <span className="font-mono">
                                    SHA-256 {meta.sha256.slice(0, 10)}…
                                </span>
                            )}
                        </>
                    ) : (
                        <span>Non déposé</span>
                    )}
                </p>
            </div>
            <Badge
                tone={tone}
                icon={check?.s === 'ok' ? 'check' : check?.s === 'ko' ? 'x' : 'clock'}
                className="max-w-[45%] shrink-0"
            >
                {check?.s === 'ok'
                    ? `Validé · ${fmtTime(check.at)}`
                    : check?.s === 'ko'
                    ? check.reason || 'Rejeté'
                    : 'À contrôler'}
            </Badge>
        </li>
    );
}

export function RdvDetail({ rdv: r, rdvs = [], now = Date.now(), onSelectRdv }) {
    if (!r) return null;

    const st = statusOf(r, now);
    const siblings = r.lot
        ? rdvs.filter((x) => x.lot === r.lot).sort((a, b) => a.lotIndex - b.lotIndex)
        : [];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
                <RdvStatusBadge rdv={r} now={now} />
                {r.lot && <LotChip index={r.lotIndex} size={r.lotSize} prefix="Camion " />}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                    <Icon name="list-todo" size={14} /> Demande {r.demandeId}
                </span>
            </div>

            {st !== 'annule' ? (
                <div className="flex flex-col gap-4">
                    <GatePass rdv={r} now={now} />
                    <PassActions rdv={r} />
                </div>
            ) : (
                <Alert tone="info" title="Rendez-vous annulé">
                    Le QR code n’est plus accepté à la guérite.
                </Alert>
            )}

            <Card>
                <SectionTitle icon="route">Suivi du passage</SectionTitle>
                <RdvTimeline rdv={r} now={now} />
            </Card>

            <Card>
                <SectionTitle
                    icon="file-check"
                    aside={
                        <span className="text-[13px] tabular-nums text-slate-500">
                            {checkCounts(r).ok}/6 validés à la guérite
                        </span>
                    }
                >
                    Contrôle documentaire
                </SectionTitle>
                <ul className="flex flex-col divide-y divide-slate-100">
                    {DOCS.map((d) => (
                        <DocStatusRow
                            key={d.key}
                            doc={d}
                            meta={r.docs?.[d.key]}
                            check={r.checks?.[d.key]}
                        />
                    ))}
                </ul>
            </Card>

            <Card>
                <SectionTitle icon="info">Informations</SectionTitle>
                <KeyValue
                    items={[
                        [
                            'Transporteur',
                            <>
                                {transporterName(r.transporter)}{' '}
                                <span className="text-slate-500">
                                    ·{' '}
                                    {r.transporter?.type === 'entreprise'
                                        ? 'Entreprise'
                                        : 'Particulier'}
                                </span>
                            </>,
                        ],
                        r.transitaire && ['Transitaire', r.transitaire],
                        [
                            'Opération',
                            `${OPS[r.op]?.label || r.op} · ${
                                TERMINALS[r.terminal]?.label || r.terminal
                            }`,
                        ],
                        [
                            'Créneau',
                            `${cap(fmtDayLong(slotRange(r.slot).start))} · ${r.slot?.start}–${
                                r.slot?.end
                            }`,
                        ],
                        [
                            'Chauffeur',
                            <>
                                {driverName(r.driver)}
                                {r.driver?.phone && (
                                    <span className="tabular-nums text-slate-500">
                                        {' '}
                                        · {formatPhone(r.driver.phone)}
                                    </span>
                                )}
                            </>,
                        ],
                        r.driver?.license && [
                            'Permis de conduire',
                            <span className="font-mono">{r.driver.license}</span>,
                        ],
                        [
                            'Tracteur',
                            <Plate
                                country={r.vehicle?.country || 'TG'}
                                value={r.vehicle?.tractor}
                                size="sm"
                            />,
                        ],
                        r.vehicle?.trailer && [
                            'Remorque',
                            <Plate
                                country={r.vehicle?.country || 'TG'}
                                value={r.vehicle.trailer}
                                size="sm"
                            />,
                        ],
                        [
                            'Conteneur',
                            <span className="inline-flex flex-wrap items-center gap-2">
                                <ContainerNumber value={r.container?.number} />{' '}
                                <span className="rounded-[4px] bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                                    {r.container?.iso || '—'}
                                </span>{' '}
                                <span className="text-slate-500">
                                    {ISO_TYPE[r.container?.iso]?.label}
                                </span>
                            </span>,
                        ],
                        r.container?.bl && [
                            'Connaissement',
                            <span className="font-mono">{r.container.bl}</span>,
                        ],
                        r.container?.goods && ['Marchandise', r.container.goods],
                        r.container?.vgm && [
                            'VGM (SOLAS)',
                            <span className="tabular-nums">
                                {Number(r.container.vgm).toLocaleString('fr-FR')} kg
                            </span>,
                        ],
                        r.notes && ['Instructions', r.notes],
                    ].filter(Boolean)}
                />
            </Card>

            {siblings.length > 1 && (
                <Card>
                    <SectionTitle icon="layers">
                        Camions de la demande {r.demandeId}
                    </SectionTitle>
                    <ul className="flex flex-col gap-2">
                        {siblings.map((x) => (
                            <li key={x.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelectRdv?.(x)}
                                    aria-current={x.id === r.id ? 'true' : undefined}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                        x.id === r.id
                                            ? 'border-brand-400 bg-brand-50/60'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    )}
                                >
                                    <span className="flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-slate-900 px-1.5 text-xs font-bold tabular-nums text-white">
                                        {x.lotIndex}/{x.lotSize}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <ContainerNumber value={x.container?.number} size="sm" />
                                        <span className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-slate-500">
                                            <span>{x.vehicle?.tractor}</span>
                                            <span>{driverName(x.driver)}</span>
                                            <span className="font-mono">{x.id}</span>
                                        </span>
                                    </span>
                                    <RdvStatusBadge rdv={x} now={now} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}

