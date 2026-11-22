import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/ui/Navigation';
import { Button, IconButton } from '@/Components/ui/Button';
import { EmptyState } from '@/Components/ui/Feedback';
import { addDays, dayStr, fmtDayLong, fmtDayNum, fmtInt } from '@/Lib/domain';
import { WeekGrid } from './WeekGrid';
import { SlotDrawer } from './SlotDrawer';
import { AddSlotsDrawer } from './AddSlotsDrawer';
import { cn } from '@/Lib/cn';

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const noon = (d) => new Date(d + 'T12:00:00Z');

const formatWeekLabel = (days) => {
    if (!days || days.length < 7) return '';
    const d0 = noon(days[0]);
    const d6 = noon(days[6]);
    return `Semaine du ${fmtDayNum(d0)} ${MONTH.format(d0)} au ${fmtDayNum(d6)} ${MONTH.format(d6)}`;
};

// Monday of the week of a given date (YYYY-MM-DD)
const mondayOf = (d) => {
    const dt = new Date(d + 'T12:00:00Z');
    const day = (dt.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
    return addDays(d, -day);
};

export default function Index({ auth, week, days = [], slots = [], terminals = [], selected_terminal_id, stats = {} }) {
    const today = dayStr();
    const currentWeekMonday = mondayOf(today);

    const [openSlot, setOpenSlot] = useState(null);
    const [adding, setAdding] = useState(false);

    const changeTerminal = (terminalId) => {
        router.get(
            route('admin.creneaux.index'),
            { week, terminal_id: terminalId },
            { preserveState: true, preserveScroll: true }
        );
    };

    const changeWeek = (offsetDays) => {
        const target = addDays(week, offsetDays);
        router.get(
            route('admin.creneaux.index'),
            { week: target, terminal_id: selected_terminal_id },
            { preserveState: true, preserveScroll: true }
        );
    };

    const goToCurrentWeek = () => {
        router.get(
            route('admin.creneaux.index'),
            { week: currentWeekMonday, terminal_id: selected_terminal_id },
            { preserveState: true, preserveScroll: true }
        );
    };

    const addAction = (
        <Button icon="calendar-plus" onClick={() => setAdding(true)}>
            Ajouter des créneaux
        </Button>
    );

    const activeTerminal = terminals.find((t) => t.id === selected_terminal_id);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestion des créneaux" />

            <div className="flex flex-col gap-5">
                <PageHeader
                    title="Créneaux"
                    subtitle={`${activeTerminal ? `${activeTerminal.label} (${activeTerminal.code})` : 'Tous les terminaux'} · plan ouvert jusqu’au ${fmtDayLong(
                        (stats.last_date || today) + 'T12:00:00Z'
                    )}`}
                    actions={addAction}
                    className="mb-0"
                />

                {/* Terminals Tabs */}
                {terminals.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
                            Terminal :
                        </span>
                        {terminals.map((t) => {
                            const selected = t.id === selected_terminal_id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => changeTerminal(t.id)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                                        selected
                                            ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    )}
                                >
                                    <span>{t.code}</span>
                                    <span className={cn('text-[11px] font-normal', selected ? 'text-brand-100' : 'text-slate-400')}>
                                        ({t.short})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Week Navigation Toolbar & Stats */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <IconButton
                            icon="chevron-left"
                            label="Semaine précédente"
                            onClick={() => changeWeek(-7)}
                        />
                        <b className="px-1 text-sm font-semibold text-slate-900 sm:text-base">
                            {formatWeekLabel(days)}
                        </b>
                        <IconButton
                            icon="chevron-right"
                            label="Semaine suivante"
                            onClick={() => changeWeek(7)}
                        />
                        {week !== currentWeekMonday && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={goToCurrentWeek}
                                className="ml-1"
                            >
                                Cette semaine
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
                        <span>
                            <b className="tabular-nums text-slate-900 font-bold">{stats.total_slots || 0}</b>{' '}
                            créneaux
                        </span>
                        <span>
                            <b className="tabular-nums text-slate-900 font-bold">
                                {fmtInt(stats.total_capacity || 0)}
                            </b>{' '}
                            places
                        </span>
                        <span>
                            <b className="tabular-nums text-slate-900 font-bold">
                                {stats.reserved_percentage || 0} %
                            </b>{' '}
                            réservées
                        </span>
                    </div>
                </div>

                {/* Content */}
                {slots.length === 0 ? (
                    <EmptyState
                        icon="calendar-x"
                        title="Aucun créneau cette semaine"
                        action={addAction}
                    >
                        Ajoutez des créneaux pour ouvrir les réservations aux transporteurs.
                    </EmptyState>
                ) : (
                    <WeekGrid
                        days={days}
                        slots={slots}
                        today={today}
                        onOpen={(slot) => setOpenSlot(slot)}
                    />
                )}

                {/* Modals / Drawers */}
                {openSlot && (
                    <SlotDrawer
                        slot={openSlot}
                        onClose={() => setOpenSlot(null)}
                    />
                )}

                <AddSlotsDrawer
                    open={adding}
                    terminals={terminals}
                    selectedTerminalId={selected_terminal_id}
                    lastDate={stats.last_date}
                    onClose={() => setAdding(false)}
                />
            </div>
        </AuthenticatedLayout>
    );
}

