<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Creneau;
use App\Models\DemandeRdv;
use App\Models\Inscription;
use App\Services\CreneauUsageService;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly CreneauUsageService $usage)
    {
    }

    public function index(): Response
    {
        $today = Carbon::today();
        $todayString = $today->toDateString();
        $slots = Creneau::query()
            ->whereDate('date', $todayString)
            ->orderBy('start')
            ->get();
        $slotUsage = $this->usage->forCreneaux($slots);

        $pendingRegistrations = Inscription::query()
            ->where('statut', Inscription::STATUS_PENDING)
            ->where(function ($query) {
                $query->whereHas('transporteur.user', fn ($user) => $user->whereNotNull('email_verified_at'))
                    ->orWhereHas('transitaire.user', fn ($user) => $user->whereNotNull('email_verified_at'));
            })
            ->with(['transporteur', 'transitaire'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(function (Inscription $registration) {
                $entity = $registration->registrationEntity();

                return [
                    'id' => $registration->id,
                    'numero_dossier' => $registration->numero_dossier,
                    'name' => $entity?->raisonsociale
                        ?: trim(($entity?->prenom ?? '').' '.($entity?->nom ?? '')),
                    'submitted_at' => $registration->created_at?->toIso8601String(),
                ];
            })
            ->values();

        $pendingDemandes = DemandeRdv::query()
            ->where('status', DemandeRdv::STATUS_PENDING)
            ->with(['user', 'creneau'])
            ->leftJoin('creneaux', 'demandes_rdv.creneau_id', '=', 'creneaux.id')
            ->select('demandes_rdv.*')
            ->orderBy('creneaux.date')
            ->orderBy('creneaux.start')
            ->orderBy('demandes_rdv.submitted_at')
            ->limit(6)
            ->get()
            ->map(fn (DemandeRdv $demande) => [
                'reference' => $demande->reference,
                'owner' => $demande->user?->name
                    ?: $demande->user?->raisonsociale
                    ?: 'Demandeur sans nom',
                'slot' => $demande->creneau ? [
                    'date' => $demande->creneau->date->format('Y-m-d'),
                    'start' => $demande->creneau->start,
                ] : null,
                'trucks_count' => $demande->trucks_count,
                'operation' => $demande->operation,
            ])
            ->values();

        $todayAppointments = DemandeRdv::query()
            ->where('status', DemandeRdv::STATUS_APPROVED)
            ->whereHas('creneau', fn ($query) => $query->whereDate('date', $todayString))
            ->sum('trucks_count');

        $slotData = $slots->map(function (Creneau $slot) use ($slotUsage) {
            $usage = $slotUsage[$slot->id];

            return [
                'id' => $slot->id,
                'start' => $slot->start,
                'end' => $slot->end,
                'capacity' => $usage['capacity'],
                'used' => $usage['used'],
                'open' => $slot->open,
                'rate' => $usage['rate'],
            ];
        })->values();

        $capacityToday = $slotData->where('open', true)->sum('capacity');
        $usedToday = $slotData->where('open', true)->sum('used');

        return Inertia::render('Admin/Dashboard/Index', [
            'stats' => [
                'pending_registrations' => Inscription::query()
                    ->where('statut', Inscription::STATUS_PENDING)
                    ->where(function ($query) {
                        $query->whereHas('transporteur.user', fn ($user) => $user->whereNotNull('email_verified_at'))
                            ->orWhereHas('transitaire.user', fn ($user) => $user->whereNotNull('email_verified_at'));
                    })
                    ->count(),
                'pending_demandes' => DemandeRdv::query()
                    ->where('status', DemandeRdv::STATUS_PENDING)
                    ->count(),
                'today_appointments' => $todayAppointments,
                'today_capacity' => $capacityToday,
                'today_used' => $usedToday,
                'today_rate' => $capacityToday > 0
                    ? (int) round(($usedToday / $capacityToday) * 100)
                    : 0,
            ],
            'pendingRegistrations' => $pendingRegistrations,
            'pendingDemandes' => $pendingDemandes,
            'slots' => $slotData,
            'today' => $todayString,
        ]);
    }
}
