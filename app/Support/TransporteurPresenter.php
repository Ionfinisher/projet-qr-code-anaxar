<?php

namespace App\Support;

use App\Models\PieceAFournir;
use App\Models\User;

final class TransporteurPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function me(User $user): array
    {
        $user->loadMissing('transporteur');

        $type = $user->user_type;

        return [
            'id' => $user->id,
            'name' => $user->name
                ?: trim(($user->prenom ?? '').' '.($user->nom ?? '')),
            'first' => $user->prenom,
            'last' => $user->nom,
            'email' => $user->email,
            'phone' => $user->telephone,
            'company' => $user->transporteur?->raisonsociale,
            'type' => $type,
            'acct' => $type === PieceAFournir::TYPE_PARTICULIER
                ? 'particulier'
                : ($type === PieceAFournir::TYPE_TRANSITAIRE ? 'transit' : 'societe'),
        ];
    }
}
