import { useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Drawer } from '@/Components/ui/Overlay';
import { Button } from '@/Components/ui/Button';
import { Field, Input, Select } from '@/Components/ui/Field';
import { Segmented } from '@/Components/ui/Choice';
import { Meter } from '@/Components/ui/Data';
import { fmtDayLong } from '@/Lib/domain';
import { Icon } from '@/Components/ui/Icon';
import Swal from 'sweetalert2';

const HOURS = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export function SlotDrawer({ slot, onClose }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        capacity: slot?.capacity ?? 40,
        open: slot?.open ?? true,
        close_reason: slot?.close_reason ?? '',
        start: slot?.start ?? '08:00',
        end: slot?.end ?? '10:00',
    });

    useEffect(() => {
        if (slot) {
            setData({
                capacity: slot.capacity,
                open: slot.open,
                close_reason: slot.close_reason || '',
                start: slot.start,
                end: slot.end,
            });
        }
    }, [slot]);

    if (!slot) return null;

    const used = slot.used || 0;
    const remaining = Math.max(0, Number(data.capacity) - used);
    const rate = Number(data.capacity) > 0 ? used / Number(data.capacity) : 0;
    const dateFormatted = fmtDayLong(`${slot.date}T12:00:00Z`);

    const submit = (e) => {
        e?.preventDefault();
        put(route('admin.creneaux.update', slot.id), {
            onSuccess: () => onClose(),
        });
    };

    const remove = async () => {
        const result = await Swal.fire({
            title: 'Supprimer ce créneau ?',
            text: `Voulez-vous supprimer le créneau du ${dateFormatted} (${slot.start}–${slot.end}) ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Supprimer',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#e11d48',
        });

        if (result.isConfirmed) {
            router.delete(route('admin.creneaux.destroy', slot.id), {
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <Drawer
            open={!!slot}
            onClose={onClose}
            title={`Créneau · ${slot.start}–${slot.end}`}
            description={dateFormatted}
            footer={
                <div className="flex w-full items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        icon="trash-2"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={remove}
                    >
                        Supprimer
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Fermer
                        </Button>
                        <Button
                            type="button"
                            icon="check"
                            loading={processing}
                            onClick={submit}
                        >
                            Enregistrer
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-5">
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="flex flex-col rounded-xl bg-slate-50 p-3">
                        <b className="text-xl font-bold tabular-nums text-slate-900">{used}</b>
                        <small className="text-xs text-slate-500">places réservées</small>
                    </div>
                    <div className="flex flex-col rounded-xl bg-slate-50 p-3">
                        <b className="text-xl font-bold tabular-nums text-slate-900">{remaining}</b>
                        <small className="text-xs text-slate-500">places restantes</small>
                    </div>
                    <div className="flex flex-col rounded-xl bg-slate-50 p-3 col-span-2 sm:col-span-1">
                        <b className="text-xl font-bold tabular-nums text-slate-900">{data.capacity}</b>
                        <small className="text-xs text-slate-500">capacité totale</small>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Taux de remplissage</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                            {Math.round(rate * 100)} %
                        </span>
                    </div>
                    <Meter rate={rate} closed={!data.open} segments={16} />
                </div>

                <form onSubmit={submit} className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field
                            id="sl-cap"
                            label="Capacité (camions)"
                            required
                            error={errors.capacity}
                            hint={`Au moins ${used} : réservations existantes.`}
                        >
                            <Input
                                id="sl-cap"
                                type="number"
                                min={Math.max(1, used)}
                                max={500}
                                value={data.capacity}
                                onChange={(e) => setData('capacity', e.target.value)}
                                className="tabular-nums"
                                required
                            />
                        </Field>

                        <Field id="sl-status" label="Statut d’ouverture">
                            <Segmented
                                label="Statut du créneau"
                                value={data.open ? 'open' : 'closed'}
                                onChange={(val) => setData('open', val === 'open')}
                                options={[
                                    { value: 'open', label: 'Ouvert', icon: 'lock-open' },
                                    { value: 'closed', label: 'Fermé', icon: 'lock' },
                                ]}
                            />
                        </Field>
                    </div>

                    {!data.open && (
                        <Field
                            id="sl-reason"
                            label="Motif de fermeture"
                            required
                            error={errors.close_reason}
                            hint="Sera affiché aux transporteurs pour expliquer la fermeture."
                        >
                            <Input
                                id="sl-reason"
                                placeholder="Ex. Travaux de voirie, maintenance portique..."
                                value={data.close_reason}
                                onChange={(e) => setData('close_reason', e.target.value)}
                                required
                            />
                        </Field>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field id="sl-start" label="Heure de début" error={errors.start}>
                            <Select
                                id="sl-start"
                                value={data.start}
                                onChange={(e) => setData('start', e.target.value)}
                                className="tabular-nums"
                            >
                                {HOURS.slice(0, 24).map((h) => (
                                    <option key={h} value={h}>
                                        {h}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field id="sl-end" label="Heure de fin" error={errors.end}>
                            <Select
                                id="sl-end"
                                value={data.end}
                                onChange={(e) => setData('end', e.target.value)}
                                className="tabular-nums"
                            >
                                {HOURS.slice(1).map((h) => (
                                    <option key={h} value={h}>
                                        {h}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                </form>
            </div>
        </Drawer>
    );
}

