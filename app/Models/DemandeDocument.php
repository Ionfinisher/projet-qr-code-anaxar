<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandeDocument extends Model
{
    use HasFactory;

    public const CHECK_PASSE = 'passe';

    public const CHECK_REFUSE = 'refuse';

    protected $fillable = [
        'demande_rdv_id',
        'demande_camion_id',
        'type',
        'original_name',
        'path',
        'mime',
        'size',
        'sha256',
        'check_result',
        'checked_at',
        'checked_by',
        'check_note',
    ];

    protected $casts = [
        'size' => 'integer',
        'demande_rdv_id' => 'integer',
        'demande_camion_id' => 'integer',
        'checked_at' => 'datetime',
    ];

    public function demande(): BelongsTo
    {
        return $this->belongsTo(DemandeRdv::class, 'demande_rdv_id');
    }

    public function camion(): BelongsTo
    {
        return $this->belongsTo(DemandeCamion::class, 'demande_camion_id');
    }

    public function checker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }
}
