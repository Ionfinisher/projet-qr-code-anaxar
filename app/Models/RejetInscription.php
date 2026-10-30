<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RejetInscription extends Model
{
    use HasFactory, HasGeneratedKey;

    protected $table = 'rejet_inscription';

    protected string $keyColumn = 'keyrejetinscription';

    protected $fillable = [
        'keyrejetinscription',
        'idinscription',
        'raison',
        'statut',
        'created_by',
        'updated_by',
    ];

    public function inscription()
    {
        return $this->belongsTo(Inscription::class, 'idinscription');
    }
}
