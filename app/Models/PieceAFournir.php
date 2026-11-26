<?php

namespace App\Models;

use App\Models\Concerns\HasGeneratedKey;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PieceAFournir extends Model
{
    use HasFactory, HasGeneratedKey;

    public const TYPE_SOCIETE = 'societe';

    public const TYPE_TRANSITAIRE = 'transitaire';

    public const TYPE_PARTICULIER = 'particulier';

    public const TYPE_RDV = 'rdv'; // Add specific type for each terminal

    public const TYPE_ALL = 'all';

    public const STATUS_ACTIVE = 'active';

    public const DEFAULT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

    protected $table = 'piece_a_fournir';

    protected string $keyColumn = 'keypieceafournir';

    protected $fillable = [
        'keypieceafournir',
        'code',
        'libelle',
        'description',
        'isrequired',
        'extension',
        'statut',
        'post',
        'short',
        'icon',
        'hint',
        'type_de_piece',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'isrequired' => 'boolean',
        'post' => 'integer',
    ];

    public function inscriptions()
    {
        return $this->belongsToMany(Inscription::class, 'piece_inscription', 'idpieceafournir', 'idinscription')
            ->withPivot(['id', 'keypieceinscription', 'piece', 'statut', 'created_by', 'updated_by'])
            ->withTimestamps();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where(function (Builder $query) {
            $query->whereNull('statut')->orWhere('statut', self::STATUS_ACTIVE);
        });
    }

    public function scopeRdv(Builder $query): Builder
    {
        return $query->where('type_de_piece', self::TYPE_RDV);
    }

    public function scopeInscription(Builder $query, ?string $userType = null): Builder
    {
        $query->where(function (Builder $q) {
            $q->whereIn('type_de_piece', [self::TYPE_SOCIETE, self::TYPE_TRANSITAIRE, self::TYPE_PARTICULIER, self::TYPE_ALL])
                ->orWhereNull('type_de_piece');
        });

        if ($userType) {
            $query->where(function (Builder $q) use ($userType) {
                $q->where('type_de_piece', $userType)
                    ->orWhere('type_de_piece', self::TYPE_ALL)
                    ->orWhereNull('type_de_piece');
            });
        }

        return $query;
    }

    public function scopePourType(Builder $query, string $type): Builder
    {
        return $query->where(function (Builder $query) use ($type) {
            $query->where('type_de_piece', $type)
                ->orWhere('type_de_piece', self::TYPE_ALL)
                ->orWhereNull('type_de_piece');
        });
    }

    /**
     * Extensions autorisées pour cette pièce, restreintes à la liste blanche
     * de l'application.
     *
     * @return array<int, string>
     */
    public function allowedExtensions(): array
    {
        $extensions = array_values(array_unique(array_filter(
            array_map(
                fn (string $extension) => strtolower(trim($extension)),
                explode(',', (string) $this->extension)
            ),
            fn (string $extension) => in_array($extension, self::DEFAULT_EXTENSIONS, true)
        )));

        return $extensions === [] ? self::DEFAULT_EXTENSIONS : $extensions;
    }
}
