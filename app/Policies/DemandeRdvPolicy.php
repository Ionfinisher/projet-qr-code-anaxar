<?php

namespace App\Policies;

use App\Models\DemandeRdv;
use App\Models\DemandeCamion;
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
        return $this->ownsPendingEditable($user, $demande)
            && ! $demande->camions()->where('review_status', DemandeCamion::REVIEW_REJECTED)->exists();
    }

    public function cancel(User $user, DemandeRdv $demande): bool
    {
        return $demande->user_id === $user->id
            && in_array($demande->status, [DemandeRdv::STATUS_PENDING, DemandeRdv::STATUS_REJECTED], true)
            && $demande->creneau !== null
            && ! SlotTime::isPast($demande->creneau);
    }

    public function updateTruck(User $user, DemandeRdv $demande, DemandeCamion $camion): bool
    {
        return $demande->user_id === $user->id
            && $camion->demande_rdv_id === $demande->id
            && $camion->isRejected()
            && $demande->isActive();
    }

    private function ownsPendingEditable(User $user, DemandeRdv $demande): bool
    {
        return $demande->user_id === $user->id
            && $demande->isPending()
            && $demande->creneau !== null
            && ! SlotTime::isPast($demande->creneau);
    }
}
