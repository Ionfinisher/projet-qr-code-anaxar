<?php

namespace App\Http\Controllers;

use App\Models\Inscription;
use App\Models\PieceAFournir;
use App\Notifications\RegistrationPending;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationEditController extends Controller
{
    public function edit(Request $request, string $numeroDossier): Response
    {
        $request->validate(['email' => ['required', 'email']]);
        $inscription = $this->findRejected($request->email, $numeroDossier);

        return Inertia::render('Registration/Edit', [
            'registration' => [
                'numero_dossier' => $inscription->numero_dossier,
                'email' => $inscription->email,
                'user_type' => $inscription->transporteur?->typetransporteur,
                'nom' => $inscription->transporteur?->nom,
                'prenom' => $inscription->transporteur?->prenom,
                'raison_sociale' => $inscription->transporteur?->raisonsociale,
            ],
            'pieces' => PieceAFournir::where('user_type', $inscription->transporteur?->typetransporteur)->get(['id', 'nom', 'obligatoire']),
        ]);
    }

    public function update(Request $request, string $numeroDossier): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
        ]);
        $inscription = $this->findRejected($request->email, $numeroDossier);
        $transporteur = $inscription->transporteur;

        DB::transaction(function () use ($request, $inscription, $transporteur) {
            $transporteur->update($request->only(['nom', 'prenom', 'raisonsociale']));
            foreach ($request->file('documents', []) as $pieceId => $file) {
                $piece = $inscription->pieceinscriptions()->where('idpieceafournir', $pieceId)->first();
                if ($piece) {
                    $piece->update(['piece' => $file->store('registrations/'.$inscription->getKey()), 'statut' => 'pending']);
                }
            }
            $inscription->update(['statut' => 'pending']);
            $inscription->transporteur?->update(['statut' => 'pending']);
            $inscription->transporteur?->user?->update(['statut' => 'pending']);
            $inscription->transporteur?->user?->notify(new RegistrationPending($inscription->numero_dossier));
            if ($request->filled('password')) {
                $transporteur->user?->update(['password' => Hash::make($request->password)]);
            }
        });

        return redirect()->route('registration.status')->with('status', 'Votre dossier a été resoumis.');
    }

    private function findRejected(string $email, string $numeroDossier): Inscription
    {
        return Inscription::with(['transporteur', 'latestRejection'])
            ->where('email', $email)
            ->where('numero_dossier', $numeroDossier)
            ->where('statut', 'rejected')
            ->firstOrFail();
    }
}
