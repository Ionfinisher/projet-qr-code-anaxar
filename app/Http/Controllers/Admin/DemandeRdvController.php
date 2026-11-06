<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transporteur\RejectDemandeRdvRequest;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use App\Services\CreneauUsageService;
use App\Services\DemandeRdvService;
use App\Support\DemandeRdvPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DemandeRdvController extends Controller
{
    public function __construct(
        private readonly DemandeRdvService $service,
        private readonly CreneauUsageService $usage
    ) {
    }

    public function index(Request $request): Response
    {
        $status = $request->query('status', 'en_attente');
        $search = trim((string) $request->query('q', ''));
        $selectedId = $request->query('id');

        $counts = [
            'all' => DemandeRdv::query()->count(),
            'en_attente' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_PENDING)->count(),
            'validee' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_APPROVED)->count(),
            'rejetee' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_REJECTED)->count(),
            'annulee' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_CANCELLED)->count(),
        ];

        $query = DemandeRdv::query()
            ->with([
                'user',
                'creneau',
                'camions',
                'documents',
                'evenements.actor',
                'decideur',
            ]);

        if ($status !== 'all' && in_array($status, [
            DemandeRdv::STATUS_PENDING,
            DemandeRdv::STATUS_APPROVED,
            DemandeRdv::STATUS_REJECTED,
            DemandeRdv::STATUS_CANCELLED,
        ], true)) {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('raisonsociale', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('camions', function ($cq) use ($search) {
                        $cq->where('container_number', 'like', "%{$search}%")
                            ->orWhere('vehicle_tractor', 'like', "%{$search}%")
                            ->orWhere('vehicle_trailer', 'like', "%{$search}%")
                            ->orWhere('container_bl', 'like', "%{$search}%");
                    });
            });
        }

        if ($status === DemandeRdv::STATUS_PENDING) {
            $query->leftJoin('creneaux', 'demandes_rdv.creneau_id', '=', 'creneaux.id')
                ->select('demandes_rdv.*')
                ->orderBy('creneaux.date', 'asc')
                ->orderBy('creneaux.start', 'asc')
                ->orderBy('demandes_rdv.submitted_at', 'asc');
        } else {
            $query->orderBy('demandes_rdv.updated_at', 'desc');
        }

        $demandes = $query->get();

        $creneaux = $demandes->pluck('creneau')->filter()->unique('id');
        $usages = $this->usage->forCreneaux($creneaux);

        $viewer = $request->user();

        $items = $demandes->map(function (DemandeRdv $demande) use ($viewer, $usages) {
            $slotUsage = $usages[$demande->creneau_id] ?? [
                'capacity' => $demande->creneau?->capacity ?? 40,
                'pending' => 0,
                'approved' => 0,
                'used' => 0,
                'remaining' => $demande->creneau?->capacity ?? 40,
                'rate' => 0.0,
            ];

            return DemandeRdvPresenter::detail($demande, $viewer, $slotUsage);
        });

        $selectedDemande = null;
        if ($selectedId) {
            $foundInList = $items->firstWhere('reference', $selectedId);
            if ($foundInList) {
                $selectedDemande = $foundInList;
            } else {
                $extra = DemandeRdv::query()
                    ->with([
                        'user',
                        'creneau',
                        'camions',
                        'documents',
                        'evenements.actor',
                        'decideur',
                    ])
                    ->where('reference', $selectedId)
                    ->first();

                if ($extra) {
                    $extraUsage = $extra->creneau
                        ? $this->usage->forCreneau($extra->creneau, $extra->id)
                        : [
                            'capacity' => 40,
                            'pending' => 0,
                            'approved' => 0,
                            'used' => 0,
                            'remaining' => 40,
                            'rate' => 0.0,
                        ];
                    $selectedDemande = DemandeRdvPresenter::detail($extra, $viewer, $extraUsage);
                }
            }
        }

        return Inertia::render('Admin/Demandes/Index', [
            'demandes' => $items,
            'counts' => $counts,
            'filters' => [
                'status' => $status,
                'q' => $search,
                'id' => $selectedId,
            ],
            'selected' => $selectedDemande,
        ]);
    }

    public function show(Request $request, DemandeRdv $demande): RedirectResponse|JsonResponse
    {
        if ($request->wantsJson()) {
            $usage = $demande->creneau
                ? $this->usage->forCreneau($demande->creneau, $demande->id)
                : [
                    'capacity' => 40,
                    'pending' => 0,
                    'approved' => 0,
                    'used' => 0,
                    'remaining' => 40,
                    'rate' => 0.0,
                ];

            return response()->json(DemandeRdvPresenter::detail($demande, $request->user(), $usage));
        }

        return redirect()->route('admin.demandes.index', ['id' => $demande->reference]);
    }

    public function approve(Request $request, DemandeRdv $demande): RedirectResponse
    {
        $validated = $request->validate([
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->service->approve($demande, $request->user(), $validated['comment'] ?? null);

        return back()->with('success', 'Demande validée.');
    }

    public function reject(RejectDemandeRdvRequest $request, DemandeRdv $demande): RedirectResponse
    {
        $this->service->reject(
            $demande,
            $request->user(),
            $request->validated('reason'),
            $request->validated('comment')
        );

        return back()->with('success', 'Demande rejetée.');
    }

    public function downloadDocument(DemandeRdv $demande, DemandeDocument $document): StreamedResponse
    {
        abort_unless($document->demande_rdv_id === $demande->id, 404);
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download(
            $document->path,
            basename($document->original_name),
            ['Content-Type' => $document->mime]
        );
    }
}
