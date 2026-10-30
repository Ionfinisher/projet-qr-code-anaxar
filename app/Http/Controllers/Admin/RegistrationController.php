<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inscription;
use App\Models\PieceInscription;
use App\Notifications\RegistrationApproved;
use App\Notifications\RegistrationRejected;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

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
        return Inertia::render('Admin/Registrations/Show', [
            'registration' => $inscription->load(['transporteur.user', 'piecesafournir', 'pieceinscriptions', 'latestRejection']),
        ]);
    }

    public function approve(Inscription $inscription): RedirectResponse
    {
        $inscription->update(['statut' => 'approved']);
        $inscription->transporteur?->update(['statut' => 'approved']);
        $inscription->transporteur?->user?->update(['statut' => 'approved']);
        $inscription->transporteur?->user?->notify(new RegistrationApproved());

        return back()->with('status', 'Dossier validé.');
    }

    public function reject(Request $request, Inscription $inscription): RedirectResponse
    {
        $validated = $request->validate(['raison' => ['required', 'string', 'max:2000']]);
        $inscription->update(['statut' => 'rejected']);
        $inscription->transporteur?->update(['statut' => 'rejected']);
        $inscription->transporteur?->user?->update(['statut' => 'rejected']);
        $inscription->rejetinscriptions()->create(['raison' => $validated['raison'], 'statut' => 'active']);
        $inscription->transporteur?->user?->notify(new RegistrationRejected($validated['raison'], $inscription->numero_dossier));

        return back()->with('status', 'Dossier rejeté.');
    }

    public function download(string $piece): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        abort_unless(auth()->user()->hasRole('admin'), 403);
        $piece = PieceInscription::query()
            ->where('id', $piece)
            ->orWhere('keypieceinscription', $piece)
            ->firstOrFail();
        abort_unless(Storage::exists($piece->piece), 404);

        return Storage::download($piece->piece);
    }
}
