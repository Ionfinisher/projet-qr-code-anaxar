<?php

namespace App\Services;

use App\Models\Creneau;
use App\Models\User;
use App\Support\SlotTime;
use Illuminate\Support\Collection;

class CreneauCalendarService
{
    public function __construct(private readonly CreneauUsageService $usage)
    {
    }

    /**
     * Créneaux des prochains jours avec l'occupation réelle et la part de l'utilisateur.
     *
     * @return array<int, array<string, mixed>>
     */
    public function upcoming(
        User $user,
        int $days = 14,
        ?int $exceptDemandeId = null,
        ?Creneau $include = null
    ): array {
        $days = max(1, min(60, $days));
        $from = now()->format('Y-m-d');
        $to = now()->addDays($days - 1)->format('Y-m-d');

        $slots = Creneau::query()->forWeek($from, $to)->get();

        if ($include && ! $slots->contains('id', $include->id)) {
            $slots->push($include);
        }

        $slots = $slots
            ->sortBy([
                ['date', 'asc'],
                ['start', 'asc'],
            ])
            ->values();

        $usage = $this->usage->forCreneaux($slots, $exceptDemandeId);
        $mine = $this->usage->mineForCreneaux($user, $slots, $exceptDemandeId);

        return $slots->map(function (Creneau $slot) use ($usage, $mine) {
            $slotUsage = $usage[$slot->id];

            return [
                'id' => $slot->id,
                'code' => $slot->code,
                'date' => $slot->date->format('Y-m-d'),
                'start' => $slot->start,
                'end' => $slot->end,
                'capacity' => $slotUsage['capacity'],
                'open' => $slot->open,
                'close_reason' => $slot->close_reason,
                'pending' => $slotUsage['pending'],
                'approved' => $slotUsage['approved'],
                'used' => $slotUsage['used'],
                'remaining' => $slotUsage['remaining'],
                'rate' => $slotUsage['rate'],
                'mine' => $mine[$slot->id] ?? 0,
                'past' => SlotTime::isPast($slot),
            ];
        })->all();
    }
}
