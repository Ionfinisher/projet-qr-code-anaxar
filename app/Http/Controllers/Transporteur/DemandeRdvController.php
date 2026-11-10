<?php

namespace App\Http\Controllers\Transporteur;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transporteur\CancelDemandeRdvRequest;
use App\Http\Requests\Transporteur\StoreDemandeRdvRequest;
use App\Http\Requests\Transporteur\UpdateDemandeRdvRequest;
use App\Models\DemandeRdv;
use App\Services\CreneauCalendarService;
use App\Services\CreneauUsageService;
use App\Services\DemandeRdvService;
use App\Support\DemandeRdvPresenter;
use App\Support\TransporteurPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DemandeRdvController extends Controller
{
    public function __construct(
        private readonly DemandeRdvService $service,
        private readonly CreneauCalendarService $calendar,
        private readonly CreneauUsageService $usage
    ) {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $allowedStatuses = [
            'all',
            DemandeRdv::STATUS_PENDING,
            DemandeRdv::STATUS_APPROVED,
            DemandeRdv::STATUS_REJECTED,
            DemandeRdv::STATUS_CANCELLED,
        ];
        $status = (string) $request->query('status', 'all');
        $status = in_array($status, $allowedStatuses, true) ? $status : 'all';
        $search = mb_substr(trim((string) $request->query('q', '')), 0, 50);

        $query = $user->demandesRdv()
            ->with(['creneau', 'camions'])
            ->latest('updated_at');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $needle = '%'.Str::upper($search).'%';

            $query->where(function ($query) use ($needle) {
                $query->whereRaw('UPPER(reference) LIKE ?', [$needle])
                    ->orWhereHas('camions', function ($query) use ($needle) {
                        $query->whereRaw('UPPER(container_number) LIKE ?', [$needle])
                            ->orWhereRaw('UPPER(vehicle_tractor) LIKE ?', [$needle])
                            ->orWhereRaw('UPPER(driver_last) LIKE ?', [$needle])
                            ->orWhereRaw('UPPER(driver_first) LIKE ?', [$needle]);
                    });
            });
        }

        $demandes = $query
            ->paginate(20)
            ->withQueryString()
            ->through(fn (DemandeRdv $demande) => DemandeRdvPresenter::summary($demande, $user));

        $rawCounts = $user->demandesRdv()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $counts = [
            'all' => array_sum($rawCounts),
            DemandeRdv::STATUS_PENDING => (int) ($rawCounts[DemandeRdv::STATUS_PENDING] ?? 0),
            DemandeRdv::STATUS_APPROVED => (int) ($rawCounts[DemandeRdv::STATUS_APPROVED] ?? 0),
            DemandeRdv::STATUS_REJECTED => (int) ($rawCounts[DemandeRdv::STATUS_REJECTED] ?? 0),
            DemandeRdv::STATUS_CANCELLED => (int) ($rawCounts[DemandeRdv::STATUS_CANCELLED] ?? 0),
        ];

        $selected = null;
        $reference = $request->query('demande');

        if (is_string($reference) && $reference !== '') {
            $selectedDemande = $user->demandesRdv()
                ->with(['creneau', 'camions', 'documents', 'evenements.actor', 'decideur'])
                ->where('reference', $reference)
                ->first();

            if ($selectedDemande) {
                $selected = DemandeRdvPresenter::detail(
                    $selectedDemande,
                    $user,
                    $this->usage->forCreneau($selectedDemande->creneau)
                );
            }
        }

        return Inertia::render('Transporteur/Demandes/Index', [
            'demandes' => $demandes,
            'counts' => $counts,
            'filters' => [
                'status' => $status,
                'q' => $search,
                'demande' => is_string($reference) ? $reference : null,
            ],
            'selected' => $selected,
            'me' => TransporteurPresenter::me($user),
        ]);
    }

    public function show(Request $request, DemandeRdv $demande): Response
    {
        $this->authorize('view', $demande);

        $demande->load(['creneau', 'camions', 'documents', 'evenements.actor', 'decideur', 'user']);

        return Inertia::render('Transporteur/Demandes/Show', [
            'demande' => DemandeRdvPresenter::detail(
                $demande,
                $request->user(),
                $this->usage->forCreneau($demande->creneau)
            ),
            'me' => TransporteurPresenter::me($request->user()),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();
        $slots = $this->calendar->upcoming($user);
        $initialSlot = null;
        $date = $request->query('date');
        $start = $request->query('start');

        if (is_string($date) && is_string($start)) {
            foreach ($slots as $slot) {
                if ($slot['date'] === $date
                    && $slot['start'] === $start
                    && $slot['open']
                    && ! $slot['past']
                    && $slot['remaining'] > 0) {
                    $initialSlot = ['date' => $date, 'start' => $start];

                    break;
                }
            }
        }

        return Inertia::render('Transporteur/Demandes/Create', [
            'slots' => $slots,
            'initialSlot' => $initialSlot,
            'me' => TransporteurPresenter::me($user),
        ]);
    }

    public function store(StoreDemandeRdvRequest $request): RedirectResponse
    {
        $demande = $this->service->create($request->user(), $request->validated());

        return redirect()
            ->route('transporteur.demandes.sent', $demande)
            ->with('success', 'Votre demande de rendez-vous a été envoyée.');
    }

    public function edit(Request $request, DemandeRdv $demande): Response
    {
        $this->authorize('update', $demande);

        $demande->load(['creneau', 'camions', 'documents']);

        return Inertia::render('Transporteur/Demandes/Edit', [
            'demande' => DemandeRdvPresenter::form($demande),
            'slots' => $this->calendar->upcoming(
                $request->user(),
                14,
                $demande->id,
                $demande->creneau
            ),
            'me' => TransporteurPresenter::me($request->user()),
        ]);
    }

    public function update(UpdateDemandeRdvRequest $request, DemandeRdv $demande): RedirectResponse
    {
        $this->service->update($demande, $request->validated(), $request->user());

        return redirect()
            ->route('transporteur.demandes.sent', ['demande' => $demande, 'edited' => 1])
            ->with('success', 'Votre demande a été mise à jour.');
    }

    public function cancel(CancelDemandeRdvRequest $request, DemandeRdv $demande): RedirectResponse
    {
        $this->service->cancel($demande, $request->user(), $request->validated('reason'));

        return back()->with('success', 'Votre demande a été annulée.');
    }

    public function sent(Request $request, DemandeRdv $demande): Response
    {
        $this->authorize('view', $demande);

        $demande->load(['creneau', 'camions', 'documents', 'evenements.actor', 'decideur']);

        return Inertia::render('Transporteur/Demandes/Sent', [
            'demande' => DemandeRdvPresenter::detail(
                $demande,
                $request->user(),
                $this->usage->forCreneau($demande->creneau)
            ),
            'edited' => $request->boolean('edited'),
            'notified_email' => $request->user()->email,
            'me' => TransporteurPresenter::me($request->user()),
        ]);
    }
}
