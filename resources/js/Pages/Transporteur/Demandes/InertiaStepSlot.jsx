import { useMemo, useState } from 'react';
import { Field, Input, RadioCards, Textarea } from '@/Components/ui';
import { Meter } from '@/Components/ui';
import { addDays, dayStr, fmtDayNum, fmtDayLong, fmtWeekday, OPS, slotRange, TERMINALS } from '@/Lib/domain';
import { cn } from '@/Lib/cn';

function SlotPicker({ slots, value, onPick, need }) {
    const now = new Date();
    const today = dayStr(now);
    const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(today, index)), [today]);
    const [date, setDate] = useState(value ? value.slice(0, 10) : today);
    const list = slots.filter((slot) => slot.date === date).sort((a, b) => a.start.localeCompare(b.start));

    return (
        <div className="flex flex-col gap-4">
            <div role="radiogroup" aria-label="Date du rendez-vous" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                {dates.map((item, index) => {
                    const daySlots = slots.filter((slot) => slot.date === item);
                    const free = daySlots.filter((slot) => slot.open && !slot.past).reduce((sum, slot) => sum + slot.remaining, 0);
                    const selected = date === item;

                    return (
                        <button
                            key={item}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setDate(item)}
                            className={cn(
                                'flex w-[74px] shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-2 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                            )}
                        >
                            <small className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {index === 0 ? 'Auj.' : index === 1 ? 'Demain' : fmtWeekday(`${item}T12:00:00Z`)}
                            </small>
                            <strong className="text-xl font-bold tabular-nums leading-tight text-slate-900">{fmtDayNum(`${item}T12:00:00Z`)}</strong>
                            <span className={cn('text-[11px] font-medium', daySlots.length ? (free ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400')}>
                                {daySlots.length ? `${free} pl.` : 'Fermé'}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div role="radiogroup" aria-label="Créneaux" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((slot) => {
                    const usage = { remaining: slot.remaining, rate: slot.rate };
                    const past = slot.past || slotRange(slot).end.getTime() - 30 * 60000 < now.getTime();
                    const closed = !slot.open;
                    const insufficient = usage.remaining < need;
                    const selected = value === `${slot.date}|${slot.start}`;
                    const state = past ? 'Passé' : closed ? 'Fermé' : usage.remaining === 0 ? 'Complet' : `${usage.remaining} place${usage.remaining > 1 ? 's' : ''}`;

                    return (
                        <button
                            key={slot.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={past || closed || insufficient}
                            onClick={() => onPick(slot)}
                            className={cn(
                                'flex min-h-[92px] cursor-pointer flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed',
                                selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : closed ? 'border-dashed border-slate-300 bg-slate-50' : past || insufficient ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                            )}
                        >
                            <span className="text-[15px] font-bold tabular-nums text-slate-900">{slot.start}–{slot.end}</span>
                            <Meter rate={usage.rate} closed={closed} />
                            <span className={cn('text-xs font-medium', closed || past ? 'text-slate-500' : usage.remaining === 0 ? 'text-rose-700' : 'text-slate-700')}>{state}</span>
                            {closed && slot.close_reason ? <span className="text-[11px] leading-snug text-slate-500">{slot.close_reason}</span> : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function InertiaStepSlot({ form, slots, truckCount, isTransit }) {
    const selected = form.data.slot;

    return (
        <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">Opération</h2>
                <RadioCards
                    label="Type d’opération"
                    columns={2}
                    value={form.data.op}
                    onChange={(value) => form.setData('op', value)}
                    options={Object.entries(OPS).map(([value, operation]) => ({ value, label: operation.label, description: operation.hint }))}
                />
                <RadioCards
                    label="Terminal"
                    columns={3}
                    value={form.data.terminal}
                    onChange={(value) => form.setData('terminal', value)}
                    options={Object.entries(TERMINALS).map(([value, terminal]) => ({ value, label: terminal.label, description: 'Port de Lomé · TGLFW' }))}
                />
            </section>
            {!isTransit ? (
                <Field id="transitaire" label="Commissionnaire en douane / transitaire" optional>
                    <Input value={form.data.transitaire} onChange={(event) => form.setData('transitaire', event.target.value)} placeholder="Ex. Atlantique Transit" />
                </Field>
            ) : null}
            <section className="flex flex-col gap-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">Date et créneau</h2>
                <SlotPicker
                    slots={slots}
                    value={selected}
                    need={truckCount}
                    onPick={(slot) => form.setData('slot', `${slot.date}|${slot.start}`)}
                />
                {form.errors.slot ? <p role="alert" className="text-sm text-rose-700">{form.errors.slot}</p> : <p className="text-sm text-slate-500">Places restantes en temps réel · {truckCount} place{truckCount > 1 ? 's' : ''} nécessaire{truckCount > 1 ? 's' : ''}. Tolérance de 15 min à la guérite.</p>}
                <Field id="notes" label="Instructions particulières" optional hint="Conteneur frigorifique à brancher, hors gabarit, marchandises dangereuses (classe IMDG)…">
                    <Textarea id="notes" rows={3} maxLength={1000} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                </Field>
            </section>
        </div>
    );
}
