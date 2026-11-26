<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RejectDemandeCamionRequest;
use App\Models\DemandeCamion;
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
use Symfony\Component\HttpFoundation\BinaryFileResponse;
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
            'partiellement_validee' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_PARTIALLY_APPROVED)->count(),
            'validee' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_APPROVED)->count(),
            'rejetee' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_REJECTED)->count(),
            'annulee' => DemandeRdv::query()->where('status', DemandeRdv::STATUS_CANCELLED)->count(),
        ];

        $query = DemandeRdv::query()
            ->with([
                'user',
                'creneau',
                'camions.documents',
                'documents',
                'evenements.actor',
                'decideur',
            ]);

        if ($status !== 'all' && in_array($status, [
            DemandeRdv::STATUS_PENDING,
            DemandeRdv::STATUS_PARTIALLY_APPROVED,
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

    public function rejectTruck(
        RejectDemandeCamionRequest $request,
        DemandeRdv $demande,
        DemandeCamion $camion
    ): RedirectResponse {
        abort_unless($camion->demande_rdv_id === $demande->id, 404);
        $this->service->rejectTruck(
            $demande,
            $camion,
            $request->user(),
            $request->validated('reason'),
            $request->validated('comment')
        );

        return back()->with('success', "Camion {$camion->position} rejeté.");
    }

    public function validateDocument(DemandeRdv $demande, DemandeDocument $document, Request $request): RedirectResponse
    {
        abort_unless($document->demande_rdv_id === $demande->id, 404);
        abort_unless(
            $document->demande_camion_id === null
                || $document->camion?->demande_rdv_id === $demande->id,
            404
        );

        $this->service->validateDocument($document, $request->user());

        $demande->refresh();
        $document->loadMissing('camion.documents');
        if ($document->camion?->isApproved() && $document->camion->hasAllDocumentsValidated()) {
            return back()->with('success', "Documents du camion {$document->camion->position} validés : son rendez-vous et son QR code sont disponibles.");
        }

        if ($demande->isApproved()) {
            return back()->with('success', 'Tous les documents sont validés : la demande a été validée et les QR codes ont été générés.');
        }

        return back()->with('success', 'Document validé avec succès.');
    }

    public function previewDocument(DemandeRdv $demande, DemandeDocument $document): BinaryFileResponse
    {
        abort_unless($document->demande_rdv_id === $demande->id, 404);
        abort_unless(
            $document->demande_camion_id === null
                || $document->camion?->demande_rdv_id === $demande->id,
            404
        );
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        $path = Storage::disk('local')->path($document->path);
        $mime = $document->mime ?: (Storage::disk('local')->mimeType($document->path) ?: 'application/octet-stream');

        return response()->file($path, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.addslashes(basename($document->original_name)).'"',
        ]);
    }

    public function downloadDocument(DemandeRdv $demande, DemandeDocument $document): StreamedResponse
    {
        abort_unless($document->demande_rdv_id === $demande->id, 404);
        abort_unless(
            $document->demande_camion_id === null
                || $document->camion?->demande_rdv_id === $demande->id,
            404
        );
        abort_unless(Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download(
            $document->path,
            DemandeRdvPresenter::downloadName($document),
            ['Content-Type' => $document->mime]
        );
    }
}
