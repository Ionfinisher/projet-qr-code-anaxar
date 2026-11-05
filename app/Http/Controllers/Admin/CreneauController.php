<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Creneau;
use App\Services\CreneauUsageService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CreneauController extends Controller
{
    public function __construct(private readonly CreneauUsageService $usage)
    {
    }

    public function index(Request $request): Response
    {
        $weekParam = $request->query('week');
        $weekStart = $weekParam
            ? Carbon::parse($weekParam)->startOfWeek(Carbon::MONDAY)
            : Carbon::now()->startOfWeek(Carbon::MONDAY);

        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $days[] = $weekStart->copy()->addDays($i)->format('Y-m-d');
        }

        $slotModels = Creneau::query()
            ->forWeek($days[0], $days[6])
            ->get();

        $usage = $this->usage->forCreneaux($slotModels);

        $slots = $slotModels->map(fn (Creneau $slot) => [
            'id' => $slot->id,
            'code' => $slot->code,
            'date' => $slot->date->format('Y-m-d'),
            'start' => $slot->start,
            'end' => $slot->end,
            'capacity' => $slot->capacity,
            'open' => $slot->open,
            'close_reason' => $slot->close_reason,
            'used' => $usage[$slot->id]['used'],
            'pending' => $usage[$slot->id]['pending'],
            'approved' => $usage[$slot->id]['approved'],
        ]);

        $totalSlots = $slots->count();
        $openSlots = $slots->where('open', true);
        $totalCapacity = $openSlots->sum('capacity');
        $totalUsed = $openSlots->sum('used');
        $reservedPercentage = $totalCapacity > 0 ? (int) round(($totalUsed / $totalCapacity) * 100) : 0;

        $lastDate = Creneau::max('date');
        if ($lastDate instanceof Carbon) {
            $lastDate = $lastDate->format('Y-m-d');
        } elseif (! $lastDate) {
            $lastDate = Carbon::now()->format('Y-m-d');
        }

        return Inertia::render('Admin/Creneaux/Index', [
            'week' => $days[0],
            'days' => $days,
            'slots' => $slots,
            'stats' => [
                'total_slots' => $totalSlots,
                'total_capacity' => $totalCapacity,
                'total_used' => $totalUsed,
                'reserved_percentage' => $reservedPercentage,
                'last_date' => (string) $lastDate,
            ],
        ]);
    }

    public function batchStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'days' => ['required', 'array', 'min:1'],
            'days.*' => ['integer', 'between:0,6'],
            'start_h' => ['required', 'integer', 'between:0,23'],
            'end_h' => ['required', 'integer', 'between:1,24', 'gt:start_h'],
            'duration' => ['required', 'integer', 'in:1,2,3,4'],
            'capacity' => ['required', 'integer', 'between:1,500'],
        ]);

        $from = Carbon::parse($validated['from']);
        $to = Carbon::parse($validated['to']);
        $selectedDays = array_map('intval', $validated['days']);
        $startH = (int) $validated['start_h'];
        $endH = (int) $validated['end_h'];
        $duration = (int) $validated['duration'];
        $capacity = (int) $validated['capacity'];
        $userId = $request->user()?->id;

        if ($from->diffInDays($to) > 62) {
            return back()->with('error', 'La période maximale autorisée par opération est de 62 jours.');
        }

        $created = 0;
        $skipped = 0;

        $current = $from->copy();
        while ($current->lte($to)) {
            $dayOfWeek = $current->dayOfWeek; // 0 (Sunday) to 6 (Saturday)
            if (in_array($dayOfWeek, $selectedDays, true)) {
                $dateStr = $current->format('Y-m-d');

                for ($h = $startH; $h + $duration <= $endH; $h += $duration) {
                    $start = sprintf('%02d:00', $h);
                    $end = sprintf('%02d:00', $h + $duration);

                    $exists = Creneau::where('date', $dateStr)
                        ->where(function ($q) use ($start, $end) {
                            $q->where('start', '<', $end)
                              ->where('end', '>', $start);
                        })
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    Creneau::create([
                        'date' => $dateStr,
                        'start' => $start,
                        'end' => $end,
                        'capacity' => $capacity,
                        'open' => true,
                        'created_by' => $userId,
                    ]);
                    $created++;
                }
            }
            $current->addDay();
        }

        $msg = "{$created} " . ($created > 1 ? 'créneaux créés' : 'créneau créé');
        if ($skipped > 0) {
            $msg .= " ({$skipped} ignoré" . ($skipped > 1 ? 's' : '') . ' car existant' . ($skipped > 1 ? 's' : '') . ')';
        }

        return back()->with('success', $msg);
    }

    public function update(Request $request, Creneau $creneau): RedirectResponse
    {
        $validated = $request->validate([
            'capacity' => ['required', 'integer', 'between:1,500'],
            'open' => ['required', 'boolean'],
            'close_reason' => ['nullable', 'string', 'max:255'],
            'start' => ['nullable', 'string', 'max:5'],
            'end' => ['nullable', 'string', 'max:5'],
        ]);

        $usage = $this->usage->forCreneau($creneau);

        if ((int) $validated['capacity'] < $usage['used']) {
            return back()->with(
                'error',
                'La capacité ne peut pas être inférieure aux '.$usage['used'].' camions déjà réservés.'
            );
        }

        $creneau->update([
            'capacity' => $validated['capacity'],
            'open' => $validated['open'],
            'close_reason' => $validated['open'] ? null : ($validated['close_reason'] ?? null),
            'start' => $validated['start'] ?? $creneau->start,
            'end' => $validated['end'] ?? $creneau->end,
        ]);

        return back()->with('success', 'Créneau mis à jour.');
    }

    public function destroy(Creneau $creneau): RedirectResponse
    {
        if ($creneau->demandes()->exists()) {
            return back()->with('error', 'Ce créneau est utilisé par au moins une demande de rendez-vous.');
        }

        $creneau->delete();

        return back()->with('success', 'Créneau supprimé.');
    }
}

