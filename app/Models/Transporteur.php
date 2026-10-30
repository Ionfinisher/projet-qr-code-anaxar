<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transporteur extends Model
{
    use HasFactory;
    protected $table = 'transporteur';

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
}
