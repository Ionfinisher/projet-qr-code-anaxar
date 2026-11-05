<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandeDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'demande_rdv_id',
        'type',
        'original_name',
        'path',
        'mime',
        'size',
        'sha256',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function demande(): BelongsTo
    {
        return $this->belongsTo(DemandeRdv::class, 'demande_rdv_id');
    }
}
