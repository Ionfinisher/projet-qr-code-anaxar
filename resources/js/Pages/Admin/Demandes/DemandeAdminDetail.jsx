import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    OPS,
    TERMINALS,
    DOCS,
    getRdvDocs,
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
import {
    UrgencyBadge,
    DecisionBar,
    calculateDemandeChecks,
    documentsByTruckMap,
    legacyDocuments,
} from './DemandesParts';

function DocumentLine({ docDef, meta, demande, truckStatus, truckLabel, onPreview, onValidate, validatingId }) {
    const canValidate = truckStatus
        ? truckStatus === 'en_attente' || (truckStatus === 'validee' && demande?.status === 'validee')
        : demande?.status === 'en_attente' || demande?.status === 'validee';
    const isDocValide = meta?.statut === 'valide';
    const isValidating = validatingId === meta?.id;

    return (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
                <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isDocValide
                        ? 'bg-emerald-50 text-emerald-700'
                        : meta
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                >
                    <Icon name={isDocValide ? 'circle-check' : meta ? 'file-text' : 'file-x'} size={18} />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{docDef.label}</p>
                    <p className="mt-0.5 flex flex-col flex-wrap gap-x-2 text-[13px] text-slate-500">
                        {meta ? (
                            <>
                                <span className="truncate">{meta.name}・{meta.size > 0 && <span>{fmtSize(meta.size)}</span>}</span>

                                {isDocValide && meta.validated_at && (
                                    <span className="text-emerald-700 font-medium">
                                        Validé {fmtDateTime(meta.validated_at)}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span>Non fournie</span>
                        )}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {meta?.preview_url ? (
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon="eye"
                        onClick={() => onPreview({ ...meta, label: docDef.label, truckLabel, truckStatus })}
                    >
                        Voir
                    </Button>
                ) : null}

                {meta ? (
                    isDocValide ? (
                        <Button
                            type="button"
                            variant="primary"
                            disabled
                            size="sm"
                            icon="check"
                        >
                            Valider
                        </Button>
                    ) : canValidate ? (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            icon="check"
                            loading={isValidating}
                            onClick={() => onValidate(meta)}
                        >
                            Valider
                        </Button>
                    ) : (
                        <Badge tone="warn" icon="clock">
                            En attente de validation
                        </Badge>
                    )
                ) : (
                    <Badge tone="bad" icon="triangle-alert">
                        Manquante
                    </Badge>
                )}
            </div>
        </li>
    );
}

export function DemandeAdminDetail({ demande: d, now = Date.now(), onClose }) {
    const { doc_types } = usePage().props;
    const rdvDocs = getRdvDocs(doc_types);
    const [confirmRejectTruck, setConfirmRejectTruck] = useState(null);
    const [confirmTruckDoc, setConfirmTruckDoc] = useState(null);
    const [rejectReason, setRejectReason] = useState(DEM_REJECT[0]);
    const [rejectComment, setRejectComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [viewingPassRdv, setViewingPassRdv] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [validatingDocId, setValidatingDocId] = useState(null);

    if (!d) return null;

    const { checks, allOk } = calculateDemandeChecks(d, now);
    const trucks = d.trucks || [];
    const owner = d.owner;
    const op = d.operation || d.op;
    const opLabel = OPS[op]?.label || op;
    const termLabel = TERMINALS[d.terminal]?.label || d.terminal;
    const slot = d.slot;
    const usage = d.usage;
    const docsByTruck = documentsByTruckMap(d);
    const inheritedDocs = legacyDocuments(d);
    const docsFor = (truckId) => docsByTruck[String(truckId)] || {};
    const countUploadedDocs = trucks.reduce((sum, truck) => (
        sum + rdvDocs.filter((def) => docsFor(truck.id)[def.key]).length
    ), 0) + (trucks.length ? 0 : rdvDocs.filter((def) => docsByTruck.legacy?.[def.key]).length);
    const totalDocs = Math.max(trucks.length, 1) * rdvDocs.length;
    const hasPendingTrucks = trucks.some((truck) => truck.review_status === 'en_attente');
    const isPending = d.status === 'en_attente' || d.status === 'partiellement_validee';

    const handleValidateDocument = (doc, closePreviewAfter = false) => {
        if (!doc?.id) return;
        setValidatingDocId(doc.id);
        router.post(
            route('admin.demandes.documents.validate', [d.reference, doc.id]),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (closePreviewAfter) setPreviewDoc(null);
                },
                onFinish: () => {
                    setValidatingDocId(null);
                },
            }
        );
    };

    const handleRejectTruck = () => {
        if (!confirmRejectTruck) return;
        setSubmitting(true);
        router.post(
            route('admin.demandes.camions.reject', [d.reference, confirmRejectTruck.id]),
            {
                reason: rejectReason,
                comment: rejectComment,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmRejectTruck(null);
                    setRejectComment('');
                },
                onFinish: () => {
                    setSubmitting(false);
                },
            }
        );
    };

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
                {trucks.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        <span className="text-xs font-medium text-slate-500">Validation des documents :</span>
                        {trucks.map((truck, index) => {
                            const docs = docsFor(truck.id);
                            const validatedCount = rdvDocs.filter((def) => docs[def.key]?.statut === 'valide').length;
                            const totalTruckDocs = rdvDocs.length;
                            const isAllValidated = validatedCount === totalTruckDocs && totalTruckDocs > 0;

                            return (
                                <Badge
                                    key={truck.id}
                                    tone={isAllValidated ? 'ok' : 'bad'}
                                    icon={isAllValidated ? 'circle-check' : 'file-text'}
                                >
                                    Camion {index + 1}
                                    {truck.vehicle?.tractor ? ` (${truck.vehicle.tractor})` : ''} : {validatedCount}/{totalTruckDocs} validés
                                </Badge>
                            );
                        })}
                    </div>
                )}

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
            {hasPendingTrucks && (
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
                                    name={c.ok ? 'circle-check' : 'triangle-alert'}
                                    size={18}
                                    className={c.ok ? 'mt-0.5 text-emerald-600' : 'mt-0.5 text-amber-500'}
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
                            <p className="flex items-center gap-1.5 text-xs text-slate-500 pl-1">
                                <Icon name="info" size={14} className="shrink-0 text-slate-400" />
                                <span>Validez les documents ou rejetez un camion individuellement. Chaque camion conforme reçoit son rendez-vous et son QR code sans attendre les autres.</span>
                            </p>
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
                                                    name={c.valid ? 'circle-check' : 'triangle-alert'}
                                                    size={15}
                                                    className={
                                                        c.valid ? 'text-emerald-600' : 'text-amber-500'
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
                                // Ratio de documents validés sur tous les documents par camion
                                key: 'dcs',
                                header: 'Documents',
                                render: (t) =>
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-[13px] text-slate-700">
                                            {rdvDocs.filter((def) => docsFor(t.id)[def.key]?.statut === 'valide').length} / {rdvDocs.length} Validé(s)
                                        </span>
                                        <Badge
                                            size="sm"
                                            tone={t.review_status === 'validee' ? 'ok' : t.review_status === 'rejetee' ? 'bad' : 'warn'}
                                        >
                                            {t.review_status === 'validee' ? 'Validé' : t.review_status === 'rejetee' ? 'Rejeté' : 'À traiter'}
                                        </Badge>
                                    </div>
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
                                                {r.review_status === 'validee' ? 'Documents à vérifier' : 'Non émis'}
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
                        d.pending_documents?.length === 0 ? (
                            <Badge tone="ok" icon="circle-check">
                                Tous les documents sont validés
                            </Badge>
                        ) : (
                            <span className="text-[13px] tabular-nums text-slate-500">
                                {countUploadedDocs}/{totalDocs}
                            </span>
                        )
                    }
                >
                    Documents déposés par camion
                </SectionTitle>

                <div className="flex flex-col gap-5">
                    {trucks.map((truck, index) => {
                        const docs = docsFor(truck.id);
                        const count = rdvDocs.filter((def) => docs[def.key]).length;

                        return (
                            <section key={truck.id} className="rounded-2xl border border-slate-200 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                        Camion {index + 1}
                                        {truck.vehicle?.tractor ? (
                                            <span className="ml-2 font-mono text-xs text-slate-500">
                                                {truck.vehicle.tractor}
                                            </span>
                                        ) : null}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            tone={truck.review_status === 'validee' ? 'ok' : truck.review_status === 'rejetee' ? 'bad' : 'warn'}
                                        >
                                            {truck.review_status === 'validee' ? 'Validé' : truck.review_status === 'rejetee' ? 'Rejeté' : 'À traiter'}
                                        </Badge>
                                        <Badge tone={count === rdvDocs.length ? 'ok' : 'neutral'}>
                                            {count}/{rdvDocs.length}
                                        </Badge>
                                        {truck.review_status === 'en_attente' && (
                                            <Button
                                                type="button"
                                                variant="danger-outline"
                                                size="sm"
                                                icon="x"
                                                onClick={() => setConfirmRejectTruck(truck)}
                                            >
                                                Rejeter ce camion
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {truck.review_status === 'rejetee' && (
                                    <Alert tone="bad" title="Camion rejeté" className="mb-3">
                                        <p>{truck.rejection_reason}</p>
                                        {truck.rejection_comment && <p className="mt-1">{truck.rejection_comment}</p>}
                                    </Alert>
                                )}
                                <ul className="flex flex-col divide-y divide-slate-100">
                                    {rdvDocs.map((docDef) => (
                                        <DocumentLine
                                            key={docDef.key}
                                            docDef={docDef}
                                            meta={docs[docDef.key]}
                                            demande={d}
                                            truckStatus={truck.review_status}
                                            truckLabel={`Camion ${index + 1}${truck.vehicle?.tractor ? ` (${truck.vehicle.tractor})` : ''}`}
                                            onPreview={setPreviewDoc}
                                            onValidate={(doc) => setConfirmTruckDoc({
                                                doc: { ...doc, label: docDef.label },
                                                truckLabel: `Camion ${index + 1}${truck.vehicle?.tractor ? ` (${truck.vehicle.tractor})` : ''}`,
                                            })}
                                            validatingId={validatingDocId}
                                        />
                                    ))}
                                </ul>
                            </section>
                        );
                    })}

                    {inheritedDocs.length ? (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3">
                            <p className="mb-2 text-sm font-semibold text-amber-900">
                                Documents hérités (sans camion)
                            </p>
                            <ul className="flex flex-col divide-y divide-amber-100">
                                {inheritedDocs.map((file) => (
                                    <DocumentLine
                                        key={file.id}
                                        docDef={{ key: file.type, label: rdvDocs.find((doc) => doc.key === file.type)?.label || file.label || file.type }}
                                        meta={file}
                                        demande={d}
                                        onPreview={setPreviewDoc}
                                        onValidate={handleValidateDocument}
                                        validatingId={validatingDocId}
                                    />
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {!trucks.length && !inheritedDocs.length ? (
                        <ul className="flex flex-col divide-y divide-slate-100">
                            {rdvDocs.map((docDef) => (
                                <DocumentLine
                                    key={docDef.key}
                                    docDef={docDef}
                                    meta={docsByTruck.legacy?.[docDef.key]}
                                />
                            ))}
                        </ul>
                    ) : null}
                </div>
            </Card>

            {/* Historique */}
            <Card>
                <SectionTitle icon="history">Historique du dossier</SectionTitle>
                <HistoryTimeline items={d.history || []} />
            </Card>

            {/* Confirmation de validation d'un document camion */}
            <Modal
                open={!!confirmTruckDoc}
                onClose={() => setConfirmTruckDoc(null)}
                title="Confirmer la validation du document"
            >
                {confirmTruckDoc && (
                    <>
                        <p className="text-sm text-slate-600">
                            Confirmez-vous la validation de <strong className="text-slate-900">{confirmTruckDoc.doc.label}</strong>
                            {' '}pour <strong className="text-slate-900">{confirmTruckDoc.truckLabel}</strong> ?
                        </p>
                        <p className="text-sm text-slate-500">{confirmTruckDoc.doc.name}</p>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setConfirmTruckDoc(null)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                icon="check"
                                loading={validatingDocId === confirmTruckDoc.doc.id}
                                onClick={() => {
                                    const doc = confirmTruckDoc.doc;
                                    setConfirmTruckDoc(null);
                                    handleValidateDocument(doc, confirmTruckDoc.closePreviewAfter);
                                }}
                            >
                                Confirmer la validation
                            </Button>
                        </div>
                    </>
                )}
            </Modal>

            {/* Modal de rejet d'un camion */}
            <Modal
                open={!!confirmRejectTruck}
                onClose={() => !submitting && setConfirmRejectTruck(null)}
                title={`Rejeter le camion ${confirmRejectTruck?.position || ''}`}
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-600">
                        Le rejet concerne uniquement ce camion. Le transporteur pourra le corriger et le renvoyer; les autres camions et leurs rendez-vous ne seront pas modifiés.
                    </p>

                    <Field id="reject-reason" label="Motif du rejet" required>
                        <Select
                            id="reject-reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        >
                            {DEM_REJECT.map((motif) => (
                                <option key={motif} value={motif}>
                                    {motif}
                                </option>
                            ))}
                        </Select>
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
                            onClick={() => setConfirmRejectTruck(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            icon="x"
                            loading={submitting}
                            onClick={handleRejectTruck}
                        >
                            Confirmer le rejet
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal d'aperçu d'un document */}
            {previewDoc && (
                <Modal
                    open={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    title={previewDoc.label || 'Aperçu du document'}
                    description={previewDoc.name}
                    size="xl"
                    bodyClassName="bg-slate-100"
                >
                    <div className="flex flex-col gap-4">
                        {previewDoc.mime === 'application/pdf' ? (
                            <iframe
                                title={previewDoc.name}
                                src={previewDoc.preview_url}
                                className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
                            />
                        ) : (
                            <img
                                src={previewDoc.preview_url}
                                alt={previewDoc.name}
                                className="mx-auto max-h-[70vh] max-w-full rounded-xl object-contain shadow-sm"
                            />
                        )}
                        <div className="flex justify-end gap-2">
                            {previewDoc.camion_id
                                && previewDoc.statut !== 'valide'
                                && (previewDoc.truckStatus === 'en_attente'
                                    || (previewDoc.truckStatus === 'validee' && d.status === 'validee')) && (
                                    <Button
                                        variant="primary"
                                        icon="check"
                                        disabled={validatingDocId === previewDoc.id}
                                        onClick={() => {
                                            setConfirmTruckDoc({
                                                doc: previewDoc,
                                                truckLabel: previewDoc.truckLabel || `Camion ${previewDoc.position || ''}`,
                                                closePreviewAfter: true,
                                            });
                                            setPreviewDoc(null);
                                        }}
                                    >
                                        Valider le document
                                    </Button>
                                )}
                            <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
                                Fermer
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

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

