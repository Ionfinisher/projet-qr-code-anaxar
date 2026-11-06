<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transitaire extends Model
{
    use HasFactory, HasGeneratedKey;

    public const TYPE = 'transitaire';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $table = 'transitaire';

    protected string $keyColumn = 'keytransitaire';

    protected $fillable = [
        'keytransitaire',
        'nom',
        'prenom',
        'email',
        'telephone',
        'adresse',
        'raisonsociale',
        'nif',
        'rccm',
        'fonction_representant',
        'ville',
        'nombre_camions',
        'statut',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'nombre_camions' => 'integer',
    ];

    public function user()
    {
        return $this->hasOne(User::class, 'idtransitaire');
    }

    public function inscriptions()
    {
        return $this->hasMany(Inscription::class, 'idtransitaire');
    }
}
