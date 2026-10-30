<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inscription;
use App\Models\PieceInscription;
use App\Notifications\RegistrationApproved;
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
            'registrations' => Inscription::with(['transporteur', 'latestRejection'])
                ->latest()
                ->paginate(20)
                ->through(fn (Inscription $registration) => [
                    'id' => $registration->id,
                    'numero_dossier' => $registration->numero_dossier,
                    'email' => $registration->email,
                    'status' => $registration->statut,
                    'name' => $registration->transporteur?->raisonsociale
                        ?: trim(($registration->transporteur?->prenom ?? '').' '.($registration->transporteur?->nom ?? '')),
                    'rejection_reason' => $registration->latestRejection?->raison,
                ]),
        ]);
    }

    public function show(Inscription $inscription): Response
    {
        $inscription->load([
            'transporteur.user',
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
            $inscription->update(['statut' => Inscription::STATUS_APPROVED]);
            $inscription->transporteur?->update(['statut' => Inscription::STATUS_APPROVED]);
            $inscription->transporteur?->user?->update(['statut' => Inscription::STATUS_APPROVED]);
            $inscription->transporteur?->user?->notify(new RegistrationApproved);
        });

        return back()->with('success', 'Dossier validé.');
    }

    public function reject(Request $request, Inscription $inscription): RedirectResponse
    {
        $validated = $request->validate(['raison' => ['required', 'string', 'max:2000']]);

        DB::transaction(function () use ($inscription, $validated) {
            $inscription->update(['statut' => Inscription::STATUS_REJECTED]);
            $inscription->transporteur?->update(['statut' => Inscription::STATUS_REJECTED]);
            $inscription->transporteur?->user?->update(['statut' => Inscription::STATUS_REJECTED]);

            $inscription->rejetinscriptions()
                ->where('statut', 'active')
                ->update(['statut' => 'inactive']);

            $inscription->rejetinscriptions()->create([
                'raison' => $validated['raison'],
                'statut' => 'active',
            ]);

            $inscription->transporteur?->user?->notify(
                new RegistrationRejected($validated['raison'], $inscription->numero_dossier)
            );
        });

        return back()->with('success', 'Dossier rejeté.');
    }

    public function download(string $piece): StreamedResponse
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        $pieceInscription = ctype_digit($piece)
            ? PieceInscription::query()->whereKey((int) $piece)->firstOrFail()
            : PieceInscription::query()->where('keypieceinscription', $piece)->firstOrFail();

        abort_unless($pieceInscription->piece && Storage::disk('local')->exists($pieceInscription->piece), 404);

        $extension = pathinfo($pieceInscription->piece, PATHINFO_EXTENSION);
        $filename = trim(($pieceInscription->pieceafournir?->libelle ?? 'document').($extension ? '.'.$extension : ''));

        return Storage::disk('local')->download($pieceInscription->piece, $filename);
    }
}
