<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandeEvenement extends Model
{
    use HasFactory;

    protected $fillable = [
        'demande_rdv_id',
        'type',
        'actor_id',
        'detail',
    ];

    public function demande(): BelongsTo
    {
        return $this->belongsTo(DemandeRdv::class, 'demande_rdv_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
