<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inscription;
use App\Models\PieceInscription;
use App\Notifications\RegistrationApproved;
use App\Notifications\RegistrationComplementsRequested;
use App\Notifications\RegistrationRejected;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RegistrationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Registrations/Index', [
            'registrations' => Inscription::with(['transporteur', 'transitaire', 'latestRejection', 'pieceinscriptions.pieceafournir'])
                ->where(function ($query) {
                    $query->whereHas('transporteur.user', fn ($user) => $user->whereNotNull('email_verified_at'))
                        ->orWhereHas('transitaire.user', fn ($user) => $user->whereNotNull('email_verified_at'));
                })
                ->latest()
                ->paginate(20)
                ->through(function (Inscription $registration) {
                    $entity = $registration->registrationEntity();

                    return [
                        'id' => $registration->id,
                        'numero_dossier' => $registration->numero_dossier,
                        'email' => $registration->email,
                        'phone' => $entity?->telephone,
                        'submitted_at' => $registration->created_at,
                        'status' => $registration->statut,
                        'name' => $entity?->raisonsociale
                            ?: trim(($entity?->prenom ?? '') . ' ' . ($entity?->nom ?? '')),
                        'rejection_reason' => $registration->latestRejection?->raison,
                        'entity' => $this->registrationEntityData($registration),
                        'documents' => $registration->pieceinscriptions->map(fn(PieceInscription $piece) => [
                            'id' => $piece->id,
                            'label' => $piece->pieceafournir?->libelle ?? 'Pièce justificative',
                            'filename' => basename((string) $piece->piece),
                            'download_url' => $piece->piece ? route('admin.registrations.documents.download', $piece->getKey()) : null,
                        ])->values()->all(),
                    ];
                }),
        ]);
    }

    private function registrationEntityData(Inscription $registration): array
    {
        $entity = $registration->registrationEntity();

        return [
            'type' => $entity?->typetransporteur ?: ($registration->transitaire ? 'transitaire' : null),
            'name' => $entity?->raisonsociale ?: trim(($entity?->prenom ?? '') . ' ' . ($entity?->nom ?? '')),
            'email' => $registration->email,
            'phone' => $entity?->telephone,
            'address' => trim(collect([$entity?->adresse, $entity?->ville])->filter()->join(', ')),
            'nif' => $entity?->nif,
            'rccm' => $entity?->rccm,
            'representative' => trim(($entity?->prenom ?? '') . ' ' . ($entity?->nom ?? '')),
            'trucks' => $entity?->nombre_camions,
        ];
    }

    public function show(Inscription $inscription): Response
    {
        $inscription->load([
            'transporteur.user',
            'transitaire.user',
            'pieceinscriptions.pieceafournir',
            'latestRejection',
        ]);

        return Inertia::render('Admin/Registrations/Show', [
            'registration' => $inscription,
        ]);
    }

    public function approve(Inscription $inscription): RedirectResponse
    {
        if ($inscription->statut === Inscription::STATUS_APPROVED) {
            return back()->with('error', 'Ce dossier est déjà validé.');
        }

        DB::transaction(function () use ($inscription) {
            $entity = $inscription->registrationEntity();

            $inscription->update(['statut' => Inscription::STATUS_APPROVED]);
            $entity?->update(['statut' => Inscription::STATUS_APPROVED]);
            $entity?->user?->update(['statut' => Inscription::STATUS_APPROVED]);
            $entity?->user?->notify(new RegistrationApproved);
        });

        return back()->with('success', 'Dossier validé.');
    }

    public function reject(Request $request, Inscription $inscription): RedirectResponse
    {
        $validated = $request->validate(['raison' => ['required', 'string', 'max:2000']]);

        DB::transaction(function () use ($inscription, $validated) {
            $entity = $inscription->registrationEntity();

            $inscription->update(['statut' => Inscription::STATUS_REJECTED]);
            $entity?->update(['statut' => Inscription::STATUS_REJECTED]);
            $entity?->user?->update(['statut' => Inscription::STATUS_REJECTED]);

            $inscription->rejetinscriptions()
                ->where('statut', 'active')
                ->update(['statut' => 'inactive']);

            $inscription->rejetinscriptions()->create([
                'raison' => $validated['raison'],
                'statut' => 'active',
            ]);

            $entity?->user?->notify(
                new RegistrationRejected($validated['raison'], $inscription->numero_dossier)
            );
        });

        return back()->with('success', 'Dossier rejeté.');
    }

    public function requestComplements(Request $request, Inscription $inscription): RedirectResponse
    {
        $validated = $request->validate(['raison' => ['required', 'string', 'max:2000']]);

        DB::transaction(function () use ($inscription, $validated) {
            $entity = $inscription->registrationEntity();

            $inscription->update(['statut' => Inscription::STATUS_COMPLEMENTS_REQUESTED]);
            $entity?->update(['statut' => Inscription::STATUS_COMPLEMENTS_REQUESTED]);
            $entity?->user?->update(['statut' => Inscription::STATUS_COMPLEMENTS_REQUESTED]);

            $inscription->rejetinscriptions()
                ->where('statut', 'active')
                ->update(['statut' => 'inactive']);

            $inscription->rejetinscriptions()->create([
                'raison' => $validated['raison'],
                'statut' => 'active',
            ]);

            $entity?->user?->notify(
                new RegistrationComplementsRequested($validated['raison'], $inscription->numero_dossier)
            );
        });

        return back()->with('success', 'Demande de compléments envoyée.');
    }

    public function download(string $piece): StreamedResponse
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        $pieceInscription = ctype_digit($piece)
            ? PieceInscription::query()->whereKey((int) $piece)->firstOrFail()
            : PieceInscription::query()->where('keypieceinscription', $piece)->firstOrFail();

        abort_unless($pieceInscription->piece && Storage::disk('local')->exists($pieceInscription->piece), 404);

        $extension = pathinfo($pieceInscription->piece, PATHINFO_EXTENSION);
        $filename = trim(($pieceInscription->pieceafournir?->libelle ?? 'document') . ($extension ? '.' . $extension : ''));

        return Storage::disk('local')->download($pieceInscription->piece, $filename);
    }
}
