import { Alert, Badge, Button, Icon, KeyValue } from '@/Components/ui';
import { cn } from '@/Lib/cn';
import {
    COUNTRY,
    DOCS,
    ISO_TYPE,
    OPS,
    TERMINALS,
    fmtDayLong,
    fmtInt,
    formatPhone,
    parseBL,
    parseContainer,
    toE164,
} from '@/Lib/domain';
import { docSlot } from './helpers';

const dash = (value) => (value === null || value === undefined || String(value).trim() === '' ? '—' : value);

/** Bloc de récapitulatif : titre, action « Modifier » (retour à l'étape) et contenu. */
function ReviewSection({ title, icon, step, onEdit, aside, children }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                    {icon ? <Icon name={icon} size={16} className="text-slate-400" /> : null}
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    {aside}
                    {onEdit ? (
                        <Button type="button" size="sm" variant="ghost" icon="pencil" onClick={() => onEdit(step)}>
                            Modifier
                        </Button>
                    ) : null}
                </div>
            </div>
            {children}
        </section>
    );
}

function TruckReview({ truck, index }) {
    const { driver, vehicle, container } = truck;
    const phone = driver.phone_national.trim()
        ? formatPhone(toE164(driver.phone_cc, driver.phone_national))
        : '';
    const country = COUNTRY[vehicle.country];
    const iso = ISO_TYPE[container.iso];
    const vgm = container.vgm === '' || container.vgm === null || container.vgm === undefined
        ? ''
        : `${fmtInt(Number(container.vgm))} kg`;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{index + 1}</span>
                <p className="text-sm font-semibold text-slate-900">
                    {dash(`${driver.last.trim().toUpperCase()} ${driver.first.trim()}`.trim())}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chauffeur</p>
                    <KeyValue dense items={[
                        ['Nom et prénom', dash(`${driver.last.trim().toUpperCase()} ${driver.first.trim()}`.trim())],
                        ['Téléphone', dash(phone)],
                        ['N° de permis', dash(driver.license.trim().toUpperCase())],
                    ]} />
                </div>

                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Véhicule</p>
                    <KeyValue dense items={[
                        ['Pays', dash(country ? `${country.name} (${country.code})` : '')],
                        ['Tracteur', dash(vehicle.tractor.trim())],
                        ['Remorque', dash(vehicle.trailer.trim())],
                    ]} />
                </div>

                <div className="sm:col-span-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Conteneur</p>
                    <KeyValue dense items={[
                        ['N° de conteneur', dash(parseContainer(container.number).raw)],
                        ['Type ISO', dash(iso ? `${iso.code} · ${iso.label}` : container.iso)],
                        ['Connaissement (B/L)', dash(parseBL(container.bl).raw)],
                        ['Marchandise', dash(container.goods.trim())],
                        ['VGM', dash(vgm)],
                    ]} />
                </div>
            </div>
        </div>
    );
}

/**
 * Étape de vérification : relit les informations saisies avant l'envoi.
 * `onEdit(step)` ramène à l'étape concernée du formulaire.
 */
export default function DemandeReview({ data, selectedSlot, isTransit, uploaded, onEdit }) {
    const op = OPS[data.op];
    const terminal = TERMINALS[data.terminal];
    const slotLabel = selectedSlot
        ? `${fmtDayLong(`${selectedSlot.date}T12:00:00Z`)} · ${selectedSlot.start}–${selectedSlot.end}`
        : 'Créneau non choisi';

    const provided = (data.trucks || []).reduce((total, truck) => (
        total + DOCS.filter((doc) => data.docs?.[String(truck.key)]?.[doc.key]).length
    ), 0);
    const expected = (data.trucks || []).length * DOCS.length;

    const mandatedName = data.mandated.type === 'entreprise'
        ? data.mandated.company.trim()
        : `${data.mandated.last} ${data.mandated.first}`.trim();
    const mandatedPhone = data.mandated.phone_national.trim()
        ? formatPhone(toE164(data.mandated.phone_cc, data.mandated.phone_national))
        : '';

    const opItems = [
        ['Opération', dash(op?.label || data.op)],
        ['Terminal', dash(terminal?.label || data.terminal)],
        ['Créneau', dash(slotLabel)],
    ];
    if (data.notes?.trim()) opItems.push(['Instructions', data.notes.trim()]);

    return (
        <div className="flex flex-col gap-4">
            <ReviewSection title="Opération et créneau" icon="calendar-clock" step={0} onEdit={onEdit}>
                <KeyValue items={opItems} />

                {isTransit ? (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Transporteur mandaté</p>
                        <KeyValue dense items={[
                            ['Type', data.mandated.type === 'entreprise' ? 'Entreprise de transport' : 'Transporteur particulier'],
                            ['Entreprise / conducteur', dash(mandatedName)],
                            ['Téléphone', dash(mandatedPhone)],
                            ['Votre société (transitaire)', dash(data.transitaire.trim())],
                        ]} />
                    </div>
                ) : null}
            </ReviewSection>

            <ReviewSection title={`Camions (${data.trucks.length})`} icon="truck" step={1} onEdit={onEdit}>
                <div className="flex flex-col gap-3">
                    {data.trucks.map((truck, index) => <TruckReview key={index} truck={truck} index={index} />)}
                </div>
            </ReviewSection>

            <ReviewSection
                title="Documents par camion"
                icon="file-up"
                step={2}
                onEdit={onEdit}
                aside={<Badge tone={provided === expected ? 'ok' : 'neutral'}>{provided}/{expected}</Badge>}
            >
                <div className="flex flex-col gap-4">
                    {(data.trucks || []).map((truck, index) => {
                        const truckKey = String(truck.key);
                        const count = DOCS.filter((doc) => data.docs?.[truckKey]?.[doc.key]).length;

                        return (
                            <div key={truckKey} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                        Camion {index + 1}
                                        {truck.vehicle?.tractor ? (
                                            <span className="ml-2 font-mono text-xs text-slate-500">{truck.vehicle.tractor}</span>
                                        ) : null}
                                    </p>
                                    <Badge tone={count === DOCS.length ? 'ok' : 'neutral'}>{count}/{DOCS.length}</Badge>
                                </div>
                                <ul className="flex flex-col gap-1.5">
                                    {DOCS.map((doc) => {
                                        const ok = Boolean(data.docs?.[truckKey]?.[doc.key]);
                                        const meta = uploaded?.[docSlot(truckKey, doc.key)];

                                        return (
                                            <li key={doc.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <Icon name={ok ? 'circle-check' : 'circle'} size={16} className={ok ? 'text-emerald-600' : 'text-slate-400'} />
                                                    <span className="truncate text-sm text-slate-800">{doc.label}</span>
                                                </span>
                                                <span className={cn('shrink-0 text-xs', ok ? 'text-slate-500' : 'font-medium text-rose-700')}>
                                                    {meta?.name || (ok ? 'Déposé' : 'Manquant')}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </ReviewSection>

            <Alert tone="info" title="Note">
                La demande sera examinée par l’administration. Elle ne sera définitive qu’après validation.
            </Alert>
        </div>
    );
}
