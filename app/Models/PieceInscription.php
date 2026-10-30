<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PieceInscription extends Model
{
    use HasFactory, HasGeneratedKey;

    protected $table = 'piece_inscription';

    protected string $keyColumn = 'keypieceinscription';

    protected $fillable = [
        'keypieceinscription',
        'piece',
        'statut',
        'idpieceafournir',
        'idinscription',
        'created_by',
        'updated_by',
    ];

    public function pieceafournir()
    {
        return $this->belongsTo(PieceAFournir::class, 'idpieceafournir');
    }

    public function inscription()
    {
        return $this->belongsTo(Inscription::class, 'idinscription');
    }
}
