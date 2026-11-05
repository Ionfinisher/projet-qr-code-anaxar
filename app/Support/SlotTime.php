<?php

namespace App\Support;

use App\Models\Creneau;
use Carbon\Carbon;

final class SlotTime
{
    public static function start(Creneau $creneau): Carbon
    {
        return Carbon::parse(
            $creneau->date->format('Y-m-d').' '.$creneau->start,
            config('app.timezone')
        );
    }

    public static function end(Creneau $creneau): Carbon
    {
        $date = $creneau->date->format('Y-m-d');
        $start = self::start($creneau);

        if ($creneau->end === '24:00') {
            return Carbon::parse($date, config('app.timezone'))->addDay()->startOfDay();
        }

        $end = Carbon::parse($date.' '.$creneau->end, config('app.timezone'));

        if ($end->lessThanOrEqualTo($start)) {
            $end->addDay();
        }

        return $end;
    }

    /**
     * Un créneau est considéré comme passé 30 minutes avant sa fin.
     */
    public static function isPast(Creneau $creneau, ?Carbon $now = null): bool
    {
        return self::end($creneau)
            ->copy()
            ->subMinutes(30)
            ->lessThan($now ?? now());
    }
}
