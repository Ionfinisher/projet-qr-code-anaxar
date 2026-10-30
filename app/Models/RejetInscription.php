<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RejetInscription extends Model
{
    protected $table = 'rejet_inscription';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'keyrejetinscription',
        'idinscription',
        'raison',
        'statut',
        'created_by',
        'updated_by',
    ];

    public function inscription()
    {
        return $this->belongsTo(Inscription::class, 'idinscription');
    }
}
