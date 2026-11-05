import { useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Drawer } from '@/Components/ui/Overlay';
import { Button } from '@/Components/ui/Button';
import { Field, Input, Select } from '@/Components/ui/Field';
import { Alert } from '@/Components/ui/Feedback';
import { addDays, dayStr, fmtInt } from '@/Lib/domain';
import { cn } from '@/Lib/cn';

const HOURS = Array.from({ length: 25 }, (_, h) => h);
const DAY_LABELS = [
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mer' },
    { value: 4, label: 'Jeu' },
    { value: 5, label: 'Ven' },
    { value: 6, label: 'Sam' },
    { value: 0, label: 'Dim' },
];

export function AddSlotsDrawer({ open, lastDate, onClose }) {
    const today = dayStr();
    const defaultFrom = lastDate && lastDate >= today ? addDays(lastDate, 1) : today;
    const defaultTo = addDays(defaultFrom, 6);

    const { data, setData, post, processing, errors, reset } = useForm({
        from: defaultFrom,
        to: defaultTo,
        days: [1, 2, 3, 4, 5, 6],
        start_h: 6,
        end_h: 20,
        duration: 2,
        capacity: 40,
    });

    const toggleDay = (d) => {
        setData(
            'days',
            data.days.includes(d)
                ? data.days.filter((x) => x !== d)
                : [...data.days, d]
        );
    };

    const preview = useMemo(() => {
        if (!data.from || !data.to || data.to < data.from) {
            return { total: 0, places: 0, error: 'Les dates renseignées sont invalides.' };
        }

        const startH = Number(data.start_h);
        const endH = Number(data.end_h);
        const duration = Number(data.duration);
        const capacity = Number(data.capacity);

        if (endH - startH < duration) {
            return { total: 0, places: 0, error: 'La plage horaire doit être supérieure à la durée d’un créneau.' };
        }
        if (data.days.length === 0) {
            return { total: 0, places: 0, error: 'Sélectionnez au moins un jour d’ouverture.' };
        }

        const slotsPerDay = Math.floor((endH - startH) / duration);

        let matchingDays = 0;
        let cur = new Date(data.from + 'T00:00:00Z');
        const end = new Date(data.to + 'T00:00:00Z');

        while (cur <= end) {
            const dayOfWeek = cur.getUTCDay(); // 0 is Sunday, 1 is Monday
            if (data.days.includes(dayOfWeek)) {
                matchingDays++;
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
        }

        const total = matchingDays * slotsPerDay;
        const places = total * capacity;

        return { total, places, error: null };
    }, [data.from, data.to, data.days, data.start_h, data.end_h, data.duration, data.capacity]);

    const submit = (e) => {
        e?.preventDefault();
        post(route('admin.creneaux.batch'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Ajouter des créneaux en série"
            description="Générez un ensemble de créneaux sur une période avec répétition automatique."
            size="lg"
            footer={
                <div className="flex w-full items-center justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        icon="calendar-plus"
                        loading={processing}
                        disabled={processing || !!preview.error || preview.total === 0}
                        onClick={submit}
                    >
                        {processing
                            ? 'Création…'
                            : `Créer ${preview.total} ${preview.total > 1 ? 'créneaux' : 'créneau'}`}
                    </Button>
                </div>
            }
        >
            <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="as-from" label="Du" required error={errors.from}>
                        <Input
                            id="as-from"
                            type="date"
                            value={data.from}
                            onChange={(e) => setData('from', e.target.value)}
                            className="tabular-nums"
                            required
                        />
                    </Field>

                    <Field id="as-to" label="Au" required error={errors.to}>
                        <Input
                            id="as-to"
                            type="date"
                            value={data.to}
                            onChange={(e) => setData('to', e.target.value)}
                            className="tabular-nums"
                            required
                        />
                    </Field>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-800">
                        Jours d’ouverture de la semaine
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DAY_LABELS.map(({ value, label }) => {
                            const selected = data.days.includes(value);

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => toggleDay(value)}
                                    className={cn(
                                        'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                                        selected
                                            ? 'border-brand-500 bg-brand-50 text-brand-800 font-semibold'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        readOnly
                                        className="h-4 w-4 rounded accent-brand-600"
                                    />
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {errors.days && (
                        <p role="alert" className="mt-1 text-xs text-rose-600">
                            {errors.days}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <Field id="as-sh" label="Première heure" error={errors.start_h}>
                        <Select
                            id="as-sh"
                            value={data.start_h}
                            onChange={(e) => setData('start_h', Number(e.target.value))}
                            className="tabular-nums"
                        >
                            {HOURS.slice(0, 24).map((h) => (
                                <option key={h} value={h}>
                                    {String(h).padStart(2, '0')}:00
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field id="as-eh" label="Dernière heure" error={errors.end_h}>
                        <Select
                            id="as-eh"
                            value={data.end_h}
                            onChange={(e) => setData('end_h', Number(e.target.value))}
                            className="tabular-nums"
                        >
                            {HOURS.slice(1).map((h) => (
                                <option key={h} value={h}>
                                    {String(h).padStart(2, '0')}:00
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field id="as-du" label="Durée d’un créneau" error={errors.duration}>
                        <Select
                            id="as-du"
                            value={data.duration}
                            onChange={(e) => setData('duration', Number(e.target.value))}
                        >
                            {[1, 2, 3, 4].map((h) => (
                                <option key={h} value={h}>
                                    {h} h
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field id="as-cap" label="Capacité par créneau" error={errors.capacity}>
                        <Input
                            id="as-cap"
                            type="number"
                            min="1"
                            max="500"
                            value={data.capacity}
                            onChange={(e) => setData('capacity', Number(e.target.value))}
                            className="tabular-nums"
                            required
                        />
                    </Field>
                </div>

                {preview.error ? (
                    <Alert tone="warn" role="status">
                        {preview.error}
                    </Alert>
                ) : (
                    <Alert
                        tone={preview.total > 0 ? 'info' : 'warn'}
                        icon="calendar-plus"
                        role="status"
                        title={`${preview.total} ${
                            preview.total > 1 ? 'créneaux à créer' : 'créneau à créer'
                        } · ${fmtInt(preview.places)} places disponibles`}
                    >
                        Les créneaux qui chevaucheraient des créneaux déjà existants seront automatiquement ignorés.
                    </Alert>
                )}
            </form>
        </Drawer>
    );
}

