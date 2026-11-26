<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DemandeCamion extends Model
{
    use HasFactory;

    protected $fillable = [
        'demande_rdv_id',
        'position',
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
    ];

    public function demande(): BelongsTo
    {
        return $this->belongsTo(DemandeRdv::class, 'demande_rdv_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(DemandeDocument::class, 'demande_camion_id');
    }
}
