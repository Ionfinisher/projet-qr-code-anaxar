import { Fragment } from 'react';
import { fmtDayLong, fmtDayNum, fmtWeekday } from '@/Lib/domain';
import { Meter } from '@/Components/ui/Data';
import { cn } from '@/Lib/cn';

const noon = (d) => new Date(d + 'T12:00:00Z');

export function WeekGrid({ days, slots = [], today, now = Date.now(), onOpen }) {
    const times = [...new Set(slots.map((x) => x.start))].sort();

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div
                role="grid"
                aria-label="Créneaux de la semaine"
                className="grid min-w-[760px] grid-cols-[64px_repeat(7,minmax(92px,1fr))] gap-1.5"
            >
                {/* Empty corner */}
                <span aria-hidden="true" className="sticky left-0 z-10 bg-white" />

                {/* Day Headers */}
                {days.map((d) => (
                    <span
                        key={d}
                        role="columnheader"
                        className={cn(
                            'flex flex-col items-center rounded-xl py-2 leading-tight',
                            d === today ? 'bg-brand-50 text-brand-800' : 'text-slate-600'
                        )}
                    >
                        <small className="text-[11px] font-semibold uppercase tracking-wide">
                            {fmtWeekday(noon(d))}
                        </small>
                        <b className="text-lg font-bold tabular-nums">{fmtDayNum(noon(d))}</b>
                    </span>
                ))}

                {/* Rows per time slot */}
                {times.map((t) => (
                    <Fragment key={t}>
                        <span className="sticky left-0 z-10 flex items-center justify-end bg-white pr-2 text-xs font-semibold tabular-nums text-slate-500">
                            {t}
                        </span>

                        {days.map((d) => {
                            const slot = slots.find((y) => y.date === d && y.start === t);
                            if (!slot) {
                                return (
                                    <span
                                        key={d}
                                        aria-hidden="true"
                                        className="rounded-xl border border-dashed border-slate-100 min-h-[64px]"
                                    />
                                );
                            }

                            const used = slot.used || 0;
                            const capacity = slot.capacity || 1;
                            const rate = capacity > 0 ? used / capacity : 0;
                            const slotEndTime = new Date(`${slot.date}T${slot.end}:00Z`).getTime();
                            const isPast = slotEndTime < now;

                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => onOpen(slot)}
                                    aria-label={`${fmtDayLong(noon(d))} ${slot.start}–${slot.end} : ${
                                        slot.open ? `${used} sur ${capacity} places` : 'fermé'
                                    }`}
                                    className={cn(
                                        'flex min-h-[64px] cursor-pointer flex-col items-start justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                        !slot.open
                                            ? 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200/70'
                                            : rate >= 1
                                            ? 'border-rose-200 bg-rose-50 hover:border-rose-300'
                                            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40',
                                        isPast && 'opacity-60'
                                    )}
                                >
                                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                                        {slot.open ? (
                                            <>
                                                {used}
                                                <small className="text-xs font-medium text-slate-500">
                                                    /{slot.capacity}
                                                </small>
                                            </>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-500">Fermé</span>
                                        )}
                                    </span>

                                    <Meter rate={rate} closed={!slot.open} segments={8} />

                                    {slot.end && (
                                        <span className="text-[11px] text-slate-500">
                                            → {slot.end}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}

