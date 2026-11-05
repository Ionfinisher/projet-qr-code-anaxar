<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Creneau extends Model
{
    use HasFactory;

    protected $table = 'creneaux';

    protected $fillable = [
        'code',
        'date',
        'start',
        'end',
        'capacity',
        'open',
        'close_reason',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'open' => 'boolean',
        'capacity' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (Creneau $creneau) {
            if (empty($creneau->code)) {
                $creneau->code = static::generateCode($creneau->date, $creneau->start);
            }
        });
    }

    public static function generateCode($date, string $start): string
    {
        $dateStr = $date instanceof Carbon
            ? $date->format('Ymd')
            : str_replace('-', '', (string) substr((string) $date, 0, 10));

        $startStr = str_replace(':', '', $start);

        return "S-{$dateStr}-{$startStr}";
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeForWeek(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->orderBy('start');
    }
}

