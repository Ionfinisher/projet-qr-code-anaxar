<?php

namespace App\Policies;

use App\Models\DemandeRdv;
use App\Models\User;
use App\Support\SlotTime;

class DemandeRdvPolicy
{
    public function view(User $user, DemandeRdv $demande): bool
    {
        return $user->isAdmin() || $demande->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->isTransporteur() && $user->isApproved();
    }

    public function update(User $user, DemandeRdv $demande): bool
    {
        return $this->ownsPendingEditable($user, $demande);
    }

    public function cancel(User $user, DemandeRdv $demande): bool
    {
        return $this->ownsPendingEditable($user, $demande);
    }

    public function approve(User $user, DemandeRdv $demande): bool
    {
        return $user->isAdmin() && $demande->isPending();
    }

    public function reject(User $user, DemandeRdv $demande): bool
    {
        return $user->isAdmin() && $demande->isPending();
    }

    private function ownsPendingEditable(User $user, DemandeRdv $demande): bool
    {
        return $demande->user_id === $user->id
            && $demande->isPending()
            && $demande->creneau !== null
            && ! SlotTime::isPast($demande->creneau);
    }
}
