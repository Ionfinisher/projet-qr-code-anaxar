<?php

namespace App\Services;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use App\Models\User;
use Illuminate\Support\Collection;

class CreneauUsageService
{
    /**
     * @return array{capacity: int, pending: int, approved: int, used: int, remaining: int, rate: float}
     */
    public function forCreneau(Creneau $creneau, ?int $exceptDemandeId = null): array
    {
        $usage = $this->forCreneaux(collect([$creneau]), $exceptDemandeId);

        return $usage[$creneau->id] ?? $this->emptyUsage($creneau);
    }

    /**
     * Compte en une requête les camions des demandes actives de plusieurs créneaux.
     *
     * @param  Collection<int, Creneau>  $creneaux
     * @return array<int, array{capacity: int, pending: int, approved: int, used: int, remaining: int, rate: float}>
     */
    public function forCreneaux(Collection $creneaux, ?int $exceptDemandeId = null): array
    {
        $ids = $creneaux->pluck('id')->all();
        $result = [];

        foreach ($creneaux as $creneau) {
            $result[$creneau->id] = $this->emptyUsage($creneau);
        }

        if ($ids === []) {
            return $result;
        }

        $rows = DemandeCamion::query()
            ->join('demandes_rdv', 'demandes_rdv.id', '=', 'demande_camions.demande_rdv_id')
            ->whereIn('demandes_rdv.creneau_id', $ids)
            ->whereIn('demandes_rdv.status', DemandeRdv::ACTIVE_STATUSES)
            ->when($exceptDemandeId, fn ($query) => $query->where('demandes_rdv.id', '!=', $exceptDemandeId))
            ->selectRaw('demandes_rdv.creneau_id as creneau_id, demandes_rdv.status as status, COUNT(*) as total')
            ->groupBy('demandes_rdv.creneau_id', 'demandes_rdv.status')
            ->get();

        foreach ($rows as $row) {
            $id = (int) $row->creneau_id;

            if (! isset($result[$id])) {
                continue;
            }

            if ($row->status === DemandeRdv::STATUS_PENDING) {
                $result[$id]['pending'] += (int) $row->total;
            } elseif ($row->status === DemandeRdv::STATUS_APPROVED) {
                $result[$id]['approved'] += (int) $row->total;
            }
        }

        foreach ($result as &$usage) {
            $usage['used'] = $usage['pending'] + $usage['approved'];
            $usage['remaining'] = max(0, $usage['capacity'] - $usage['used']);
            $usage['rate'] = $usage['capacity'] > 0
                ? round($usage['used'] / $usage['capacity'], 4)
                : 1.0;
        }
        unset($usage);

        return $result;
    }

    /**
     * Camions déjà réservés par l'utilisateur sur chaque créneau.
     *
     * @param  Collection<int, Creneau>  $creneaux
     * @return array<int, int>
     */
    public function mineForCreneaux(User $user, Collection $creneaux, ?int $exceptDemandeId = null): array
    {
        $ids = $creneaux->pluck('id')->all();
        $result = array_fill_keys($ids, 0);

        if ($ids === []) {
            return $result;
        }

        $rows = DemandeCamion::query()
            ->join('demandes_rdv', 'demandes_rdv.id', '=', 'demande_camions.demande_rdv_id')
            ->where('demandes_rdv.user_id', $user->id)
            ->whereIn('demandes_rdv.creneau_id', $ids)
            ->whereIn('demandes_rdv.status', DemandeRdv::ACTIVE_STATUSES)
            ->when($exceptDemandeId, fn ($query) => $query->where('demandes_rdv.id', '!=', $exceptDemandeId))
            ->selectRaw('demandes_rdv.creneau_id as creneau_id, COUNT(*) as total')
            ->groupBy('demandes_rdv.creneau_id')
            ->pluck('total', 'creneau_id');

        foreach ($rows as $id => $total) {
            $result[(int) $id] = (int) $total;
        }

        return $result;
    }

    /**
     * @return array{capacity: int, pending: int, approved: int, used: int, remaining: int, rate: float}
     */
    private function emptyUsage(Creneau $creneau): array
    {
        return [
            'capacity' => (int) $creneau->capacity,
            'pending' => 0,
            'approved' => 0,
            'used' => 0,
            'remaining' => (int) $creneau->capacity,
            'rate' => 0.0,
        ];
    }
}
