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

export default function Index({ auth, week, days = [], slots = [], stats = {} }) {
    const today = dayStr();
    const currentWeekMonday = mondayOf(today);

    const [openSlot, setOpenSlot] = useState(null);
    const [adding, setAdding] = useState(false);

    const changeWeek = (offsetDays) => {
        const target = addDays(week, offsetDays);
        router.get(
            route('admin.creneaux.index'),
            { week: target },
            { preserveState: true, preserveScroll: true }
        );
    };

    const goToCurrentWeek = () => {
        router.get(
            route('admin.creneaux.index'),
            { week: currentWeekMonday },
            { preserveState: true, preserveScroll: true }
        );
    };

    const addAction = (
        <Button icon="calendar-plus" onClick={() => setAdding(true)}>
            Ajouter des créneaux
        </Button>
    );

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestion des créneaux" />

            <div className="flex flex-col gap-5">
                <PageHeader
                    title="Créneaux"
                    subtitle={`Porte principale · plan ouvert jusqu’au ${fmtDayLong(
                        (stats.last_date || today) + 'T12:00:00Z'
                    )}`}
                    actions={addAction}
                    className="mb-0"
                />

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
                    lastDate={stats.last_date}
                    onClose={() => setAdding(false)}
                />
            </div>
        </AuthenticatedLayout>
    );
}

