<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandeDocument extends Model
{
    use HasFactory;

    public const STATUT_EN_ATTENTE = 'en_attente';
    public const STATUT_VALIDE = 'valide';
    public const STATUT_REJETE = 'rejete';

    public const TYPE_LABELS = [
        'bc' => 'Bon de chargement',
        'bf' => 'Bon de fret',
        'as' => 'Assurance',
        'vt' => 'Visite technique',
        'gp' => 'Gate pass',
        'ta' => 'Accès terminal',
        'BL' => 'Connaissement',
        'CG' => 'Carte grise',
    ];

    protected $fillable = [
        'demande_rdv_id',
        'demande_camion_id',
        'piece_a_fournir_id',
        'type',
        'original_name',
        'path',
        'mime',
        'size',
        'sha256',
        'statut',
        'validated_at',
        'validated_by',
    ];

    protected $casts = [
        'size' => 'integer',
        'validated_at' => 'datetime',
    ];

    public function demande(): BelongsTo
    {
        return $this->belongsTo(DemandeRdv::class, 'demande_rdv_id');
    }

    public function pieceAFournir(): BelongsTo
    {
        return $this->belongsTo(PieceAFournir::class, 'piece_a_fournir_id');
    }

    public function camion(): BelongsTo
    {
        return $this->belongsTo(DemandeCamion::class, 'demande_camion_id');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function isValidated(): bool
    {
        return $this->statut === self::STATUT_VALIDE;
    }

    public function isPending(): bool
    {
        return $this->statut === self::STATUT_EN_ATTENTE;
    }

    public function typeLabel(): string
    {
        if ($this->relationLoaded('pieceAFournir') && $this->pieceAFournir?->libelle) {
            return $this->pieceAFournir->libelle;
        }

        if ($this->piece_a_fournir_id) {
            $piece = PieceAFournir::find($this->piece_a_fournir_id);
            if ($piece?->libelle) {
                return $piece->libelle;
            }
        }

        return self::TYPE_LABELS[$this->type] ?? strtoupper($this->type);
    }
}
