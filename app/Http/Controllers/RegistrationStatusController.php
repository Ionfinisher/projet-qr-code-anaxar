<?php

namespace App\Http\Controllers;

use App\Models\Inscription;
use App\Models\User;
use App\Notifications\RegistrationPending;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationStatusController extends Controller
{
    private const STATUS_LABELS = [
        Inscription::STATUS_PENDING => 'En cours de validation',
        Inscription::STATUS_APPROVED => 'Validé',
        Inscription::STATUS_REJECTED => 'À corriger',
    ];

    public function create(Request $request): Response
    {
        return Inertia::render('Registration/Status', [
            'lookup' => [
                'email' => (string) $request->query('email', ''),
                'numero_dossier' => (string) $request->query('numero_dossier', ''),
            ],
        ]);
    }

    public function show(Request $request): Response
    {
        $request->merge([
            'email' => Str::lower(trim((string) $request->input('email'))),
            'numero_dossier' => Str::upper((string) preg_replace('/\s+/u', '', (string) $request->input('numero_dossier'))),
        ]);

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
                'status_label' => self::STATUS_LABELS[$inscription->statut] ?? $inscription->statut,
                'rejection_reason' => $inscription->statut === Inscription::STATUS_REJECTED
                    ? $inscription->latestRejection?->raison
                    : null,
                'can_edit' => $inscription->statut === Inscription::STATUS_REJECTED,
                'edit_url' => $inscription->statut === Inscription::STATUS_REJECTED
                    ? route('registration.edit', [
                        'numeroDossier' => $inscription->numero_dossier,
                        'email' => $inscription->email,
                    ])
                    : null,
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
            ->where('statut', Inscription::STATUS_PENDING)
            ->latest('id')
            ->first();

        if ($inscription && $wasUnverified) {
            $user->notify(new RegistrationPending($inscription->numero_dossier));
        }

        return redirect()
            ->route('login')
            ->with('success', 'Votre email est vérifié. Votre dossier est en cours de validation.');
    }
}
