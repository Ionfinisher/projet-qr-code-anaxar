<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PieceAFournir extends Model
{
    use HasFactory;

    protected $table = 'piece_a_fournir';
    protected $fillable = ['nom', 'user_type', 'obligatoire'];

    public function inscriptions()
    {
        return $this->belongsToMany(Inscription::class, 'piece_inscription', 'idpieceafournir', 'idinscription')
            ->withPivot(['id', 'keypieceinscription', 'piece', 'statut', 'created_by', 'updated_by'])
            ->withTimestamps();
    }
}
