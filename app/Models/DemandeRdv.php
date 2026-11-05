<?php

namespace App\Models;

use App\Support\SlotTime;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DemandeRdv extends Model
{
    use HasFactory;

    protected $table = 'demandes_rdv';

    public const STATUS_PENDING = 'en_attente';

    public const STATUS_APPROVED = 'validee';

    public const STATUS_REJECTED = 'rejetee';

    public const STATUS_CANCELLED = 'annulee';

    public const ACTIVE_STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED];

    public const OPERATIONS = ['IMP', 'EXP', 'MTR', 'MTP'];

    public const TERMINALS = ['LCT', 'TGT', 'QCV'];

    public const DOC_TYPES = ['bc', 'bf', 'as', 'vt', 'gp', 'ta'];

    public const CONTAINER_ISO_TYPES = [
        '22G1', '42G1', '45G1', 'L5G1', '22R1', '45R1',
        '22U1', '42U1', '22P1', '42P1', '22T1',
    ];

    protected $fillable = [
        'reference',
        'user_id',
        'creneau_id',
        'status',
        'operation',
        'terminal',
        'notes',
        'transitaire',
        'mandated_type',
        'mandated_company',
        'mandated_first',
        'mandated_last',
        'mandated_phone',
        'trucks_count',
        'submitted_at',
        'decided_at',
        'decided_by',
        'decision_comment',
        'rejection_reason',
        'cancelled_at',
        'cancel_reason',
    ];

    protected $casts = [
        'trucks_count' => 'integer',
        'submitted_at' => 'datetime',
        'decided_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (DemandeRdv $demande) {
            if (empty($demande->reference)) {
                $demande->reference = static::generateReference();
            }
        });
    }

    public static function generateReference(): string
    {
        do {
            $reference = 'DR-'.Str::upper(Str::random(6));
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }

    public function getRouteKeyName(): string
    {
        return 'reference';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creneau(): BelongsTo
    {
        return $this->belongsTo(Creneau::class);
    }

    public function camions(): HasMany
    {
        return $this->hasMany(DemandeCamion::class)->orderBy('position');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(DemandeDocument::class);
    }

    public function evenements(): HasMany
    {
        return $this->hasMany(DemandeEvenement::class)->latest();
    }

    public function decideur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', self::ACTIVE_STATUSES);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::ACTIVE_STATUSES, true);
    }

    public function slotStart(): ?Carbon
    {
        return $this->creneau ? SlotTime::start($this->creneau) : null;
    }

    public function slotEnd(): ?Carbon
    {
        return $this->creneau ? SlotTime::end($this->creneau) : null;
    }
}
