import { Alert, Badge, Card, KeyValue, Meter, SectionTitle } from '@/Components/ui';
import { Icon } from '@/Components/ui/Icon';
import { DOCS, fmtDateTime, fmtDayLong, fmtInt, formatPhone } from '@/Lib/domain';
import { EVENT_META, opLabel, statusMeta, terminalLabel } from './status';
import { fmtSize } from './helpers';

const slotLabel = (slot) => `${fmtDayLong(`${slot.date}T12:00:00Z`)} · ${slot.start}–${slot.end}`;

function StatusBadge({ status }) {
    const meta = statusMeta(status);
    return <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>;
}

function TruckCard({ truck }) {
    const { driver, vehicle, container } = truck;

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                    Camion {truck.position}
                </p>
                <Badge tone="neutral" size="sm" icon="truck">{vehicle.country}</Badge>
            </div>
            <KeyValue
                dense
                items={[
                    ['Chauffeur', `${driver.first} ${driver.last}`],
                    ['Téléphone', formatPhone(driver.phone)],
                    ['Permis', driver.license],
                    ['Tracteur', vehicle.tractor],
                    vehicle.trailer ? ['Remorque', vehicle.trailer] : null,
                    container.number ? ['Conteneur', `${container.number} · ${container.iso}`] : ['Conteneur', 'Vide (MTP)'],
                    container.bl ? ['Connaissement', container.bl] : null,
                    container.goods ? ['Marchandise', container.goods] : null,
                    container.vgm ? ['VGM', `${fmtInt(container.vgm)} kg`] : null,
                ]}
            />
        </div>
    );
}

export default function DemandeDetail({ demande, actions = null }) {
    const status = statusMeta(demande.status);
    const usage = demande.usage || {};

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Référence</p>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{demande.reference}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {opLabel(demande.operation)} · {terminalLabel(demande.terminal)}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={demande.status} />
                        {actions}
                    </div>
                </div>

                <div className="mt-5">
                    <KeyValue
                        items={[
                            ['Créneau', slotLabel(demande.slot)],
                            ['Camions', `${demande.trucks_count} camion${demande.trucks_count > 1 ? 's' : ''}`],
                            ['Envoyée le', fmtDateTime(demande.submitted_at)],
                            ['Dernière mise à jour', fmtDateTime(demande.updated_at)],
                        ]}
                    />
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-800">Occupation du créneau</span>
                        <span className="text-slate-500">
                            {fmtInt(usage.used || 0)} / {fmtInt(usage.capacity || 0)} camions
                        </span>
                    </div>
                    <Meter
                        rate={usage.rate || 0}
                        closed={!usage.capacity}
                        className="mt-2"
                        label={`${fmtInt(usage.used || 0)} camions sur ${fmtInt(usage.capacity || 0)}`}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                        {fmtInt(usage.remaining || 0)} place{usage.remaining > 1 ? 's' : ''} restante{usage.remaining > 1 ? 's' : ''}
                    </p>
                </div>
            </Card>

            {demande.decision ? (
                <Alert
                    tone={demande.status === 'validee' ? 'ok' : 'bad'}
                    title={demande.status === 'validee' ? 'Demande validée' : 'Demande rejetée'}
                >
                    {demande.decision.reason && <p>Motif : {demande.decision.reason}</p>}
                    {demande.decision.comment && <p>Commentaire : {demande.decision.comment}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                        Décision de {demande.decision.by || 'l’administration'} le {fmtDateTime(demande.decision.at)}
                    </p>
                </Alert>
            ) : null}

            {demande.cancelled_at ? (
                <Alert tone="neutral" title="Demande annulée">
                    {demande.cancel_reason && <p>Motif : {demande.cancel_reason}</p>}
                    <p className="mt-1 text-xs text-slate-500">Annulée le {fmtDateTime(demande.cancelled_at)}</p>
                </Alert>
            ) : null}

            <Card>
                <SectionTitle icon="truck" aside={<Badge tone="neutral">{demande.trucks.length} camion{demande.trucks.length > 1 ? 's' : ''}</Badge>}>
                    Camions
                </SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                    {demande.trucks.map((truck) => <TruckCard key={truck.id} truck={truck} />)}
                </div>
            </Card>

            <Card>
                <SectionTitle icon="file-text">Documents</SectionTitle>
                <div className="grid gap-2 sm:grid-cols-2">
                    {DOCS.map((doc) => {
                        const file = demande.documents?.[doc.key];

                        return (
                            <div key={doc.key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <Icon name={doc.icon} size={17} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">{doc.label}</p>
                                    <p className="truncate text-xs text-slate-500">
                                        {file ? `${file.name} · ${fmtSize(file.size)}` : 'Non fourni'}
                                    </p>
                                </div>
                                {file ? (
                                    <a
                                        href={file.url}
                                        className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 hover:underline"
                                    >
                                        Télécharger
                                    </a>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </Card>

            {demande.notes || demande.transitaire || demande.mandated?.type ? (
                <Card>
                    <SectionTitle icon="info">Informations complémentaires</SectionTitle>
                    <KeyValue
                        items={[
                            demande.notes ? ['Notes', demande.notes] : null,
                            demande.transitaire ? ['Transitaire', demande.transitaire] : null,
                            demande.mandated?.type === 'entreprise' && demande.mandated.company
                                ? ['Transporteur mandaté', demande.mandated.company]
                                : null,
                            demande.mandated?.type === 'particulier' && (demande.mandated.first || demande.mandated.last)
                                ? ['Transporteur mandaté', `${demande.mandated.first || ''} ${demande.mandated.last || ''}`.trim()]
                                : null,
                            demande.mandated?.phone ? ['Téléphone mandaté', demande.mandated.phone] : null,
                        ]}
                    />
                </Card>
            ) : null}

            <Card>
                <SectionTitle icon="history">Historique</SectionTitle>
                {demande.history.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun événement enregistré.</p>
                ) : (
                    <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-5">
                        {demande.history.map((event, index) => {
                            const meta = EVENT_META[event.type] || { label: event.type, tone: 'neutral', icon: 'info' };

                            return (
                                <li key={`${event.type}-${event.at}-${index}`} className="relative">
                                    <span className="absolute -left-[27px] top-0.5 flex h-3 w-3 rounded-full border-2 border-white bg-slate-400" aria-hidden="true" />
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone={meta.tone} size="sm" icon={meta.icon}>{meta.label}</Badge>
                                        <span className="text-xs text-slate-500">{fmtDateTime(event.at)}</span>
                                    </div>
                                    {event.by ? <p className="mt-1 text-sm text-slate-600">Par {event.by}</p> : null}
                                    {event.detail ? <p className="mt-0.5 text-sm text-slate-500">{event.detail}</p> : null}
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Card>
        </div>
    );
}
