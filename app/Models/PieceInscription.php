<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PieceInscription extends Model
{
    use HasFactory;

    protected $table = 'piece_inscription';
    protected $primaryKey = 'keypieceinscription';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['keypieceinscription', 'piece', 'statut', 'idpieceafournir', 'idinscription', 'created_by', 'updated_by'];

    public function pieceafournir()
    {
        return $this->belongsTo(PieceAFournir::class, 'idpieceafournir');
    }

    /**
     * Check whether the pieceinscription is expired.
     *
     * Returns an associative array containing the expiration status and the remaining time 
     * if still valid.
     */
    // public function checkExpired()
    // {
    //     $expiration = $this->dateexpiration;

    //     if (empty($expiration)) {
    //         return [
    //             'expired' => false,
    //             'time_remaining' => null,
    //             'is_close' => false,
    //         ];
    //     }

    //     $expirationDate = \Illuminate\Support\Carbon::parse($expiration);
    //     $isExpired = $expirationDate->isPast();

    //     return [
    //         'expired' => $isExpired,
    //         'time_remaining' =>  now()->locale('fr')->diffForHumans($expirationDate, true),
    //         'is_close' => now()->diffInMonths($expirationDate) <= 5 && !$isExpired,
    //     ];
    // }
}
