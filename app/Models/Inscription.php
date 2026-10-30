<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Inscription extends Model
{
    use HasFactory, HasGeneratedKey;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $table = 'inscription';

    protected string $keyColumn = 'keyinscription';

    protected $fillable = [
        'keyinscription',
        'email',
        'statut',
        'token',
        'numero_dossier',
        'idtransporteur',
        'created_by',
        'updated_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (Inscription $inscription) {
            if (empty($inscription->numero_dossier)) {
                $inscription->numero_dossier = static::generateNumeroDossier();
            }
        });
    }

    public static function generateNumeroDossier(): string
    {
        do {
            $numero = 'DOS-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
        } while (static::where('numero_dossier', $numero)->exists());

        return $numero;
    }

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
