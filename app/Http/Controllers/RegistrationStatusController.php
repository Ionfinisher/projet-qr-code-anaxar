<?php

namespace App\Http\Controllers;

use App\Models\Inscription;
use App\Models\User;
use App\Notifications\RegistrationPending;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationStatusController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Registration/Status');
    }

    public function show(Request $request): Response
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'numero_dossier' => ['required', 'string', 'max:50'],
        ]);

        $inscription = Inscription::query()
            ->with(['latestRejection'])
            ->where('email', $validated['email'])
            ->where('numero_dossier', $validated['numero_dossier'])
            ->first();

        return Inertia::render('Registration/Status', [
            'lookup' => $validated,
            'registration' => $inscription ? [
                'numero_dossier' => $inscription->numero_dossier,
                'status' => $inscription->statut,
                'rejection_reason' => $inscription->latestRejection?->raison,
                'can_edit' => $inscription->statut === 'rejected',
            ] : null,
        ]);
    }

    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::findOrFail($id);
        abort_unless(hash_equals($hash, sha1($user->getEmailForVerification())), 403);

        $wasUnverified = ! $user->hasVerifiedEmail();
        if ($wasUnverified) {
            $user->markEmailAsVerified();
        }

        $inscription = Inscription::query()
            ->where('email', $user->email)
            ->where('statut', 'pending')
            ->latest('id')
            ->first();

        if ($inscription && $wasUnverified) {
            $user->notify(new RegistrationPending($inscription->numero_dossier));
        }

        return redirect()->route('login')->with('status', 'Votre email est vérifié. Votre dossier est en cours de validation.');
    }
}
