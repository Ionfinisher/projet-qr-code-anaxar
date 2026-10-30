<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transporteur extends Model
{
    use HasFactory, HasGeneratedKey;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $table = 'transporteur';

    protected string $keyColumn = 'keytransporteur';

    protected $fillable = [
        'keytransporteur',
        'nom',
        'prenom',
        'email',
        'raisonsociale',
        'typetransporteur',
        'telephone',
        'adresse',
        'statut',
        'created_by',
        'updated_by',
    ];

    public function user()
    {
        return $this->hasOne(User::class, 'idtransporteur');
    }

    public function inscriptions()
    {
        return $this->hasMany(Inscription::class, 'idtransporteur');
    }
}
