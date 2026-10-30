<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inscription extends Model
{
    use HasFactory;

    protected $table = 'inscription';

    protected $fillable = ['keyinscription', 'email', 'statut', 'token', 'numero_dossier', 'idtransporteur', 'created_by', 'updated_by'];

    public function pieceinscriptions()
    {
        return $this->hasMany(PieceInscription::class, 'idinscription');
    }

    public function transporteur()
    {
        return $this->belongsTo(Transporteur::class, 'idtransporteur');
    }

    public function piecesafournir()
    {
        return $this->belongsToMany(PieceAFournir::class, 'piece_inscription', 'idinscription', 'idpieceafournir')
            ->withPivot(['id', 'keypieceinscription', 'piece', 'statut', 'created_by', 'updated_by'])
            ->withTimestamps();
    }

    public function rejetinscriptions()
    {
        return $this->hasMany(RejetInscription::class, 'idinscription');
    }

    public function latestRejection()
    {
        return $this->hasOne(RejetInscription::class, 'idinscription')->latestOfMany();
    }
}
