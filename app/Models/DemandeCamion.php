<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DemandeCamion extends Model
{
    use HasFactory;

    public const REVIEW_PENDING = 'en_attente';
    public const REVIEW_APPROVED = 'validee';
    public const REVIEW_REJECTED = 'rejetee';

    protected $fillable = [
        'demande_rdv_id',
        'position',
        'review_status',
        'decided_at',
        'decided_by',
        'rejection_reason',
        'rejection_comment',
        'driver_first',
        'driver_last',
        'driver_phone',
        'driver_license',
        'vehicle_country',
        'vehicle_tractor',
        'vehicle_trailer',
        'container_number',
        'container_iso',
        'container_bl',
        'container_goods',
        'container_vgm',
        'rdv_hash',
    ];

    protected $casts = [
        'position' => 'integer',
        'container_vgm' => 'integer',
        'decided_at' => 'datetime',
    ];

    public function demande(): BelongsTo
    {
        return $this->belongsTo(DemandeRdv::class, 'demande_rdv_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(DemandeDocument::class, 'demande_camion_id');
    }

    public function decideur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function isApproved(): bool
    {
        if ($this->review_status === self::REVIEW_APPROVED) {
            return true;
        }

        return $this->review_status === self::REVIEW_PENDING
            && ($this->relationLoaded('demande') ? $this->demande : $this->demande()->first())?->isApproved() === true;
    }

    public function isRejected(): bool
    {
        return $this->review_status === self::REVIEW_REJECTED;
    }

    public function hasAllDocumentsValidated(): bool
    {
        $documents = $this->relationLoaded('documents') ? $this->documents : $this->documents()->get();

        return $documents->isNotEmpty()
            && $documents->every(fn (DemandeDocument $document) => $document->isValidated());
    }
}
