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

    public const TYPE_PARTICULIER = 'particulier';

    public const TYPE_ALL = 'all';

    public const STATUS_ACTIVE = 'active';

    public const DEFAULT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

    protected $table = 'piece_a_fournir';

    protected string $keyColumn = 'keypieceafournir';

    protected $fillable = [
        'keypieceafournir',
        'libelle',
        'description',
        'isrequired',
        'extension',
        'statut',
        'type_de_piece',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'isrequired' => 'boolean',
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
