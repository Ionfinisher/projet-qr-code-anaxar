import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    OPS,
    TERMINALS,
    DOCS,
    DEM_STATUS,
    DEM_REJECT,
    ACCOUNT_KINDS,
    fmtDayLong,
    fmtDateTime,
    accountName,
    formatPhone,
    driverName,
    fmtSize,
    parseContainer,
    licenseValid,
} from '@/Lib/domain';
import { Card, SectionTitle } from '@/Components/ui/Card';
import { KeyValue, Meter, DataTable } from '@/Components/ui/Data';
import { Badge } from '@/Components/ui/Badge';
import { Alert } from '@/Components/ui/Feedback';
import { Button } from '@/Components/ui/Button';
import { Icon } from '@/Components/ui/Icon';
import { Modal } from '@/Components/ui/Overlay';
import { Field, Select, Textarea } from '@/Components/ui/Field';
import { StatusTag, ContainerNumber, Plate, HistoryTimeline, GatePass, PassActions } from '@/Components/domain';
import { UrgencyBadge, DecisionBar, calculateDemandeChecks } from './DemandesParts';

export function DemandeAdminDetail({ demande: d, now = Date.now(), onClose }) {
    const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
    const [approveComment, setApproveComment] = useState('');
    const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState(DEM_REJECT[0]);
    const [rejectComment, setRejectComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [viewingPassRdv, setViewingPassRdv] = useState(null);

    if (!d) return null;

    const { checks, allOk } = calculateDemandeChecks(d, now);
    const trucks = d.trucks || [];
    const owner = d.owner;
    const op = d.operation || d.op;
    const opLabel = OPS[op]?.label || op;
    const termLabel = TERMINALS[d.terminal]?.label || d.terminal;
    const slot = d.slot;
    const usage = d.usage;
    const docsMap = d.documents || d.docs || {};
    const isPending = d.status === 'en_attente';

    const handleApprove = () => {
        setSubmitting(true);
        router.post(
            route('admin.demandes.approve', d.reference),
            { comment: approveComment },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmApproveOpen(false);
                    setApproveComment('');
                },
                onFinish: () => {
                    setSubmitting(false);
                },
            }
        );
    };

    const handleReject = () => {
        setSubmitting(true);
        router.post(
            route('admin.demandes.reject', d.reference),
            {
                reason: rejectReason,
                comment: rejectComment,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmRejectOpen(false);
                    setRejectComment('');
                },
                onFinish: () => {
                    setSubmitting(false);
                },
            }
        );
    };

    const countUploadedDocs = DOCS.filter((def) => !!docsMap[def.key]).length;

    return (
        <div className="flex flex-col gap-6">
            {/* Entête */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
                    Demande de rendez-vous
                </p>
                <h2 className="mt-1 font-mono text-2xl font-bold text-slate-900">{d.reference}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusTag map={DEM_STATUS} status={d.status} />
                    {isPending && <UrgencyBadge demande={d} now={now} />}
                    <span className="text-[13px] text-slate-500">
                        Soumise le {fmtDateTime(d.submitted_at || d.submittedAt)}
                    </span>
                </div>
            </div>

            {/* Décision existante */}
            {d.decision && (
                <Alert
                    tone={d.status === 'validee' ? 'ok' : 'bad'}
                    icon={d.status === 'validee' ? 'circle-check' : 'circle-x'}
                    title={`${d.status === 'validee' ? 'Validée' : `Rejetée · ${d.decision.reason || d.decision.motif}`} le ${fmtDateTime(d.decision.at)} par ${d.decision.by || d.decision.byName || 'Administration'}`}
                >
                    <p>{d.decision.comment || (d.status === 'validee' ? `${trucks.length} QR code(s) sécurisé(s) émis pour cette demande.` : null)}</p>
                    {d.status === 'validee' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                icon="calendar-check"
                                onClick={() => router.get(route('admin.rdv.index'), { q: d.reference })}
                            >
                                Consulter les rendez-vous ({trucks.length})
                            </Button>
                        </div>
                    )}
                </Alert>
            )}

            {/* Annulation */}
            {d.status === 'annulee' && (
                <Alert
                    tone="info"
                    icon="circle-x"
                    title={`Annulée par le transporteur le ${fmtDateTime(d.cancelled_at || d.cancelledAt)}`}
                >
                    {d.cancel_reason || d.cancelMotif || null}
                </Alert>
            )}

            {/* Contrôles automatiques & Actions si en attente */}
            {isPending && (
                <Card>
                    <SectionTitle
                        icon="list-checks"
                        aside={
                            <Badge tone={allOk ? 'ok' : 'warn'} icon={allOk ? 'check' : 'triangle-alert'}>
                                {allOk ? 'Tout est conforme' : 'Points à vérifier'}
                            </Badge>
                        }
                    >
                        Contrôles automatiques
                    </SectionTitle>

                    <ul className="flex flex-col gap-2.5">
                        {checks.map((c) => (
                            <li key={c.t} className="flex items-start gap-3">
                                <Icon
                                    name={c.ok ? 'circle-check' : 'circle-x'}
                                    size={18}
                                    className={c.ok ? 'mt-0.5 text-emerald-600' : 'mt-0.5 text-rose-600'}
                                />
                                <span className="min-w-0 text-sm">
                                    <b className="block font-semibold text-slate-900">{c.t}</b>
                                    <small className="text-[13px] text-slate-500">{c.d}</small>
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-5">
                        <DecisionBar>
                            <Button
                                variant="ok"
                                icon="qr-code"
                                onClick={() => setConfirmApproveOpen(true)}
                            >
                                Valider · émettre {trucks.length} QR
                            </Button>
                            <Button
                                variant="danger-outline"
                                icon="x"
                                onClick={() => setConfirmRejectOpen(true)}
                            >
                                Rejeter
                            </Button>
                        </DecisionBar>
                    </div>
                </Card>
            )}

            {/* Demandeur */}
            <Card>
                <SectionTitle icon="building-2">Demandeur</SectionTitle>
                <KeyValue
                    dense
                    items={[
                        [
                            'Compte',
                            owner ? (
                                <>
                                    {accountName(owner)}{' '}
                                    <span className="text-slate-500">
                                        · {ACCOUNT_KINDS[owner.acct]?.short || owner.acct}
                                    </span>
                                </>
                            ) : (
                                '—'
                            ),
                        ],
                        owner?.company && ['Société', owner.company],
                        owner?.email && ['E-mail', owner.email],
                        owner?.phone && ['Téléphone', <span className="tabular-nums">{formatPhone(owner.phone)}</span>],
                        d.transitaire && ['Transitaire', d.transitaire],
                        d.mandated?.company && [
                            'Mandataire',
                            `${d.mandated.company} · ${d.mandated.first || ''} ${d.mandated.last || ''} (${formatPhone(d.mandated.phone)})`,
                        ],
                    ].filter(Boolean)}
                />
            </Card>

            {/* Créneau et opération */}
            <Card>
                <SectionTitle icon="calendar-clock">Créneau et opération</SectionTitle>
                <KeyValue
                    dense
                    items={[
                        [
                            'Créneau',
                            slot?.date
                                ? `${fmtDayLong(slot.date)} · ${slot.start}–${slot.end}`
                                : '—',
                        ],
                        usage && [
                            'Occupation',
                            <span key="occ" className="inline-flex flex-wrap items-center gap-2.5">
                                <Meter rate={usage.rate} closed={!slot?.open} />
                                <span className="tabular-nums">
                                    {usage.used}/{slot?.capacity || 40} places
                                </span>
                                <span className="text-xs text-slate-500">
                                    dont {usage.pending} en attente
                                </span>
                            </span>,
                        ],
                        ['Opération', opLabel],
                        ['Terminal', termLabel],
                        d.notes && ['Instructions', d.notes],
                    ].filter(Boolean)}
                />
            </Card>

            {/* Camions / Rendez-vous */}
            <section className="flex flex-col gap-3">
                <SectionTitle icon="truck">Camions · {trucks.length}</SectionTitle>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <DataTable
                        rows={trucks}
                        caption={`Camions de la demande ${d.reference}`}
                        columns={[
                            {
                                key: 'ctr',
                                header: 'Conteneur',
                                render: (r) => {
                                    const num = r.container?.number;
                                    const c = parseContainer(num);
                                    return (
                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                            <ContainerNumber value={num} size="sm" placeholder="Vide" />
                                            {num && (
                                                <Icon
                                                    name={c.valid ? 'circle-check' : 'circle-x'}
                                                    size={15}
                                                    className={
                                                        c.valid ? 'text-emerald-600' : 'text-rose-600'
                                                    }
                                                    label={
                                                        c.valid
                                                            ? 'ISO 6346 valide'
                                                            : 'ISO 6346 invalide'
                                                    }
                                                />
                                            )}
                                        </span>
                                    );
                                },
                            },
                            {
                                key: 'iso',
                                header: 'Type ISO',
                                render: (r) => (
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                                        {r.container?.iso || '—'}
                                    </span>
                                ),
                            },
                            {
                                key: 'bl',
                                header: 'Connaissement',
                                className: 'font-mono text-[13px]',
                                render: (r) => r.container?.bl || '—',
                            },
                            {
                                key: 'veh',
                                header: 'Tracteur',
                                render: (r) => (
                                    <Plate
                                        country={r.vehicle?.country || 'TG'}
                                        value={r.vehicle?.tractor}
                                        size="sm"
                                    />
                                ),
                            },
                            {
                                key: 'drv',
                                header: 'Chauffeur',
                                render: (r) => (
                                    <>
                                        <span className="font-medium text-slate-900">
                                            {driverName(r.driver)}
                                        </span>
                                        <span className="block text-xs tabular-nums text-slate-500">
                                            {formatPhone(r.driver?.phone)}
                                        </span>
                                    </>
                                ),
                            },
                            {
                                key: 'lic',
                                header: 'Permis',
                                render: (r) =>
                                    licenseValid(r.driver?.license) ? (
                                        <span className="font-mono text-[13px] text-slate-700">
                                            {r.driver.license}
                                        </span>
                                    ) : (
                                        <Badge tone="bad" icon="triangle-alert">
                                            Manquant
                                        </Badge>
                                    ),
                            },
                            {
                                key: 'pass',
                                header: 'Gate Pass',
                                render: (r) => {
                                    const rdv =
                                        d.rdvs?.find((x) => x.camion_id === r.id) ||
                                        (r.token
                                            ? {
                                                  id: r.rdv_id || `PF-${d.reference}-${r.position}`,
                                                  demandeId: d.reference,
                                                  lot: trucks.length > 1 ? d.reference : null,
                                                  lotIndex: r.position,
                                                  lotSize: trucks.length,
                                                  token: r.token,
                                                  terminal: d.terminal,
                                                  op: d.operation || d.op,
                                                  slot: d.slot,
                                                  transporter: {
                                                      company:
                                                          owner?.company || owner?.name || 'Transporteur',
                                                      type: owner?.acct || 'entreprise',
                                                  },
                                                  driver: r.driver,
                                                  vehicle: r.vehicle,
                                                  container: r.container,
                                                  issuedAt: d.decision?.at || d.updated_at,
                                              }
                                            : null);

                                    if (!rdv) {
                                        return (
                                            <span className="text-xs text-slate-400">
                                                {d.status === 'validee' ? 'Génération…' : 'Non émis'}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            icon="qr-code"
                                            onClick={() => setViewingPassRdv(rdv)}
                                        >
                                            Pass
                                        </Button>
                                    );
                                },
                            },
                        ]}
                    />
                </div>
            </section>

            {/* Documents */}
            <Card>
                <SectionTitle
                    icon="file-check"
                    aside={
                        <span className="text-[13px] tabular-nums text-slate-500">
                            {countUploadedDocs}/6
                        </span>
                    }
                >
                    Documents déposés
                </SectionTitle>

                <ul className="flex flex-col divide-y divide-slate-100">
                    {DOCS.map((docDef) => {
                        const meta = docsMap[docDef.key];
                        return (
                            <li
                                key={docDef.key}
                                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                            meta
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700'
                                        }`}
                                    >
                                        <Icon name={meta ? 'file-check' : 'file-x'} size={18} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900">
                                            {docDef.label}
                                        </p>
                                        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-slate-500">
                                            {meta ? (
                                                <>
                                                    <span className="truncate">{meta.name}</span>
                                                    {meta.size > 0 && (
                                                        <span>{fmtSize(meta.size)}</span>
                                                    )}
                                                    {meta.sha256 && (
                                                        <span className="font-mono text-xs">
                                                            SHA-256 {meta.sha256.slice(0, 10)}…
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span>Non fournie</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    {meta?.url ? (
                                        <a
                                            href={meta.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        >
                                            <Icon name="download" size={14} />
                                            <span>Télécharger</span>
                                        </a>
                                    ) : (
                                        <Badge tone="warn" icon="triangle-alert">
                                            Manquante
                                        </Badge>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </Card>

            {/* Historique */}
            <Card>
                <SectionTitle icon="history">Historique du dossier</SectionTitle>
                <HistoryTimeline items={d.history || []} />
            </Card>

            {/* Modal de validation */}
            <Modal
                open={confirmApproveOpen}
                onClose={() => !submitting && setConfirmApproveOpen(false)}
                title={`Valider la demande ${d.reference}`}
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-600">
                        Vous êtes sur le point de valider la demande{' '}
                        <strong className="font-mono text-slate-900">{d.reference}</strong> pour{' '}
                        <strong>{owner?.company || owner?.name || 'le transporteur'}</strong>.
                    </p>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                        <p>
                            • <strong>{trucks.length} QR code(s)</strong> seront émis avec signature
                            cryptographique sécurisée.
                        </p>
                        <p className="mt-1">
                            • Créneau assigné : <strong>{slot?.date}</strong> ({slot?.start}–{slot?.end}) au
                            terminal <strong>{termLabel}</strong>.
                        </p>
                        <p className="mt-1">
                            • Un e-mail et une notification seront envoyés au transporteur.
                        </p>
                    </div>

                    {!allOk && (
                        <Alert
                            tone="warn"
                            icon="triangle-alert"
                            title="Points de contrôle incomplets"
                        >
                            Certains contrôles automatiques ne sont pas validés. Assurez-vous d’avoir
                            vérifié les pièces avant de valider.
                        </Alert>
                    )}

                    <Field label="Commentaire de décision (facultatif)" hint="Visible par le transporteur">
                        <Textarea
                            rows={3}
                            value={approveComment}
                            onChange={(e) => setApproveComment(e.target.value)}
                            placeholder="Ex : Dossier vérifié et validé."
                        />
                    </Field>

                    <div className="mt-2 flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            disabled={submitting}
                            onClick={() => setConfirmApproveOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="ok"
                            icon="qr-code"
                            loading={submitting}
                            onClick={handleApprove}
                        >
                            Valider et émettre les QR codes
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de rejet */}
            <Modal
                open={confirmRejectOpen}
                onClose={() => !submitting && setConfirmRejectOpen(false)}
                title={`Rejeter la demande ${d.reference}`}
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-600">
                        Le rejet informera le transporteur du motif de non-conformité de sa demande{' '}
                        <strong className="font-mono text-slate-900">{d.reference}</strong>.
                    </p>

                    <Field label="Motif du rejet" required>
                        <Select
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            options={DEM_REJECT.map((motif) => ({
                                value: motif,
                                label: motif,
                            }))}
                        />
                    </Field>

                    <Field
                        label="Précisions / Explications pour le transporteur"
                        hint="Indiquez les pièces ou corrections attendues"
                    >
                        <Textarea
                            rows={3}
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="Ex : Conteneur non disponible au terminal Lomé Container Terminal, merci de vérifier le statut avant de reprogrammer."
                        />
                    </Field>

                    <div className="mt-2 flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            disabled={submitting}
                            onClick={() => setConfirmRejectOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            icon="x"
                            loading={submitting}
                            onClick={handleReject}
                        >
                            Confirmer le rejet
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de consultation du Gate Pass & QR code */}
            {viewingPassRdv && (
                <Modal
                    open={!!viewingPassRdv}
                    onClose={() => setViewingPassRdv(null)}
                    title={`Gate Pass · ${viewingPassRdv.id}`}
                    description={`${viewingPassRdv.slot?.date} (${viewingPassRdv.slot?.start}–${viewingPassRdv.slot?.end})`}
                    size="lg"
                >
                    <div className="flex flex-col gap-4">
                        <GatePass rdv={viewingPassRdv} now={now} />
                        <PassActions rdv={viewingPassRdv} />
                        <div className="mt-2 flex justify-end">
                            <Button variant="secondary" onClick={() => setViewingPassRdv(null)}>
                                Fermer
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

