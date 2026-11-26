import { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { TransporteurLayout } from '@/Layouts/TransporteurLayout';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, Select, buttonClass } from '@/Components/ui';
import { getRdvDocs, ISO_TYPES } from '@/Lib/domain';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

export default function CorrectTruck({ demande, reference, camion, docs: existingDocs = {}, me }) {
    const { doc_types } = usePage().props;
    const rdvDocs = getRdvDocs(doc_types);
    const truckKey = String(camion.id);
    const truck = {
        key: truckKey,
        rdvId: camion.id,
        driver: {
            first: camion.driver?.first || '',
            last: camion.driver?.last || '',
            phone: camion.driver?.phone || '',
            license: camion.driver?.license || '',
        },
        vehicle: {
            country: camion.vehicle?.country || 'TG',
            tractor: camion.vehicle?.tractor || '',
            trailer: camion.vehicle?.trailer || '',
        },
        container: {
            number: camion.container?.number || '',
            iso: camion.container?.iso || '22G1',
            bl: camion.container?.bl || '',
            goods: camion.container?.goods || '',
            vgm: camion.container?.vgm ?? '',
        },
    };
    const form = useForm({
        op: demande.op,
        terminal: demande.terminal,
        date: demande.date,
        start: demande.start,
        notes: demande.notes || '',
        transitaire: demande.transitaire || '',
        mandated: demande.mandated || {},
        trucks: [truck],
        docs: {
            [truckKey]: Object.fromEntries(rdvDocs.map((doc) => [doc.key, existingDocs[doc.key]?.id || ''])),
        },
    });
    const [uploading, setUploading] = useState({});
    const [uploadErrors, setUploadErrors] = useState({});
    const [uploadedFiles, setUploadedFiles] = useState({});

    const setTruckField = (section, field, value) => {
        form.setData('trucks', [{
            ...form.data.trucks[0],
            [section]: { ...form.data.trucks[0][section], [field]: value },
        }]);
    };

    const uploadDocument = async (type, file) => {
        if (!file) return;
        setUploading((current) => ({ ...current, [type]: true }));
        setUploadErrors((current) => ({ ...current, [type]: null }));

        const body = new FormData();
        body.append('type', type);
        body.append('truck_key', truckKey);
        body.append('file', file);

        try {
            const { data } = await axios.post(route('transporteur.uploads.store'), body);
            form.setData((current) => ({
                ...current,
                docs: {
                    ...current.docs,
                    [truckKey]: { ...current.docs[truckKey], [type]: data.token },
                },
            }));
            setUploadedFiles((current) => ({ ...current, [type]: data }));
            form.clearErrors(`docs.${truckKey}.${type}`);
        } catch (error) {
            setUploadErrors((current) => ({
                ...current,
                [type]: error.response?.data?.message || 'Le téléversement du document a échoué.',
            }));
        } finally {
            setUploading((current) => ({ ...current, [type]: false }));
        }
    };

    const restoreCurrentDocument = (type) => {
        form.setData((current) => ({
            ...current,
            docs: {
                ...current.docs,
                [truckKey]: { ...current.docs[truckKey], [type]: existingDocs[type]?.id || '' },
            },
        }));
        setUploadedFiles((current) => {
            const next = { ...current };
            delete next[type];
            return next;
        });
    };

    const submit = () => {
        if (Object.values(uploading).some(Boolean)) return;
        form.put(route('transporteur.demandes.camions.resubmit', [reference, camion.id]), {
            preserveScroll: true,
        });
    };

    return (
        <TransporteurLayout inertia>
            <Head title={`Corriger le camion ${camion.position} · ${reference}`} />
            <PageHeader
                eyebrow={`Demande ${reference}`}
                title={`Corriger le camion ${camion.position}`}
                subtitle="Modifiez uniquement ce camion et renvoyez ses documents. Les autres camions de la demande ne seront pas modifiés."
                actions={(
                    <Link href={route('transporteur.demandes.sent', reference)} className={buttonClass({ variant: 'secondary' })}>
                        Retour à la demande
                    </Link>
                )}
            />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                <Alert tone="bad" title="Corrections demandées">
                    <p>{camion.rejection_reason}</p>
                    {camion.rejection_comment && <p className="mt-1">{camion.rejection_comment}</p>}
                    <p className="mt-2 text-xs">Le créneau initial reste réservé pendant la correction.</p>
                </Alert>

                <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Prénom du chauffeur" error={form.errors['trucks.0.driver.first']}>
                            <Input value={form.data.trucks[0].driver.first} onChange={(event) => setTruckField('driver', 'first', event.target.value)} />
                        </Field>
                        <Field label="Nom du chauffeur" error={form.errors['trucks.0.driver.last']}>
                            <Input value={form.data.trucks[0].driver.last} onChange={(event) => setTruckField('driver', 'last', event.target.value)} />
                        </Field>
                        <Field label="Téléphone (format international)" error={form.errors['trucks.0.driver.phone']}>
                            <Input value={form.data.trucks[0].driver.phone} onChange={(event) => setTruckField('driver', 'phone', event.target.value)} placeholder="+228..." />
                        </Field>
                        <Field label="N° de permis" error={form.errors['trucks.0.driver.license']}>
                            <Input value={form.data.trucks[0].driver.license} onChange={(event) => setTruckField('driver', 'license', event.target.value)} />
                        </Field>
                        <Field label="Pays du véhicule" error={form.errors['trucks.0.vehicle.country']}>
                            <Input value={form.data.trucks[0].vehicle.country} onChange={(event) => setTruckField('vehicle', 'country', event.target.value.toUpperCase())} maxLength={2} />
                        </Field>
                        <Field label="Immatriculation du tracteur" error={form.errors['trucks.0.vehicle.tractor']}>
                            <Input value={form.data.trucks[0].vehicle.tractor} onChange={(event) => setTruckField('vehicle', 'tractor', event.target.value)} />
                        </Field>
                        <Field label="Immatriculation de la remorque" error={form.errors['trucks.0.vehicle.trailer']}>
                            <Input value={form.data.trucks[0].vehicle.trailer} onChange={(event) => setTruckField('vehicle', 'trailer', event.target.value)} />
                        </Field>
                        <Field label="N° de conteneur" error={form.errors['trucks.0.container.number']}>
                            <Input value={form.data.trucks[0].container.number} onChange={(event) => setTruckField('container', 'number', event.target.value)} />
                        </Field>
                        <Field label="Type ISO" error={form.errors['trucks.0.container.iso']}>
                            <Select value={form.data.trucks[0].container.iso} onChange={(event) => setTruckField('container', 'iso', event.target.value)}>
                                {ISO_TYPES.map((iso) => <option key={iso.code} value={iso.code}>{iso.label}</option>)}
                            </Select>
                        </Field>
                        <Field label="Connaissement" error={form.errors['trucks.0.container.bl']}>
                            <Input value={form.data.trucks[0].container.bl} onChange={(event) => setTruckField('container', 'bl', event.target.value)} />
                        </Field>
                        <Field label="Marchandise" error={form.errors['trucks.0.container.goods']}>
                            <Input value={form.data.trucks[0].container.goods} onChange={(event) => setTruckField('container', 'goods', event.target.value)} />
                        </Field>
                        <Field label="VGM (kg)" error={form.errors['trucks.0.container.vgm']}>
                            <Input type="number" value={form.data.trucks[0].container.vgm} onChange={(event) => setTruckField('container', 'vgm', event.target.value)} />
                        </Field>
                    </div>
                </Card>

                <Card>
                    <h2 className="mb-4 text-base font-semibold text-slate-900">Documents de ce camion</h2>
                    <div className="flex flex-col gap-4">
                        {rdvDocs.map((doc) => {
                            const currentFile = uploadedFiles[doc.key];
                            const storedFile = existingDocs[doc.key];
                            const error = uploadErrors[doc.key] || form.errors[`docs.${truckKey}.${doc.key}`];

                            return (
                                <Field key={doc.key} label={doc.label} error={error}>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            disabled={uploading[doc.key]}
                                            onChange={(event) => {
                                                uploadDocument(doc.key, event.target.files?.[0]);
                                                event.target.value = '';
                                            }}
                                            className={inputClass}
                                        />
                                        <span className="text-xs text-slate-500">
                                            {currentFile?.name || storedFile?.name || 'Aucun fichier'}
                                        </span>
                                        {currentFile && storedFile && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => restoreCurrentDocument(doc.key)}>
                                                Restaurer le fichier actuel
                                            </Button>
                                        )}
                                        {uploading[doc.key] && <Badge tone="info">Téléversement…</Badge>}
                                    </div>
                                </Field>
                            );
                        })}
                    </div>
                </Card>

                {form.errors.trucks && <Alert tone="bad">{form.errors.trucks}</Alert>}
                <div className="flex justify-end gap-2">
                    <Link href={route('transporteur.demandes.sent', reference)} className={buttonClass({ variant: 'secondary' })}>
                        Annuler
                    </Link>
                    <Button
                        type="button"
                        icon="send"
                        loading={form.processing}
                        disabled={form.processing || Object.values(uploading).some(Boolean)}
                        onClick={submit}
                    >
                        Renvoyer le camion
                    </Button>
                </div>
            </div>
        </TransporteurLayout>
    );
}
