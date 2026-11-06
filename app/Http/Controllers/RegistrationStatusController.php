<?php

namespace App\Http\Controllers;

use App\Models\Inscription;
use App\Models\Transitaire;
use App\Models\User;
use App\Notifications\RegistrationPending;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
                'contact' => (string) $request->query('contact', $request->query('email', '')),
                'numero_dossier' => (string) $request->query('numero_dossier', ''),
            ],
        ]);
    }

    public function show(Request $request): Response
    {
        $contact = trim((string) ($request->input('contact') ?: $request->input('email')));
        $request->merge([
            'contact' => $contact,
            'email' => Str::lower($contact),
            'numero_dossier' => Str::upper((string) preg_replace('/\s+/u', '', (string) $request->input('numero_dossier'))),
        ]);

        $validated = $request->validate([
            'contact' => ['required', 'string', 'max:255'],
            'numero_dossier' => ['required', 'string', 'max:50'],
        ]);

        $inscription = Inscription::query()
            ->with(['transporteur', 'transitaire', 'pieceinscriptions.pieceafournir', 'rejetinscriptions'])
            ->where(function ($query) use ($validated) {
                $query->where('email', Str::lower($validated['contact']))
                    ->orWhereHas('transporteur', function ($transporteur) use ($validated) {
                        $transporteur->where('telephone', $validated['contact']);
                    })
                    ->orWhereHas('transitaire', function ($transitaire) use ($validated) {
                        $transitaire->where('telephone', $validated['contact']);
                    });
            })
            ->where('numero_dossier', $validated['numero_dossier'])
            ->first();

        return Inertia::render('Registration/Status', [
            'lookup' => ['email' => $validated['contact'], 'contact' => $validated['contact'], 'numero_dossier' => $validated['numero_dossier']],
            'registration' => $inscription ? $this->present($inscription) : null,
        ]);
    }

    private function present(Inscription $inscription): array
    {
        $entity = $inscription->registrationEntity();
        $type = $entity instanceof Transitaire
            ? 'Commissionnaire en douane / transitaire'
            : match ($entity?->typetransporteur) {
                'societe' => 'Entreprise de transport',
                'transitaire' => 'Commissionnaire en douane / transitaire',
                default => 'Particulier',
            };
        $isParticulier = $entity?->typetransporteur === 'particulier';
        $documents = $inscription->pieceinscriptions->mapWithKeys(function ($piece) {
            $meta = [
                'name' => basename($piece->piece),
                'size' => Storage::disk('local')->exists($piece->piece) ? Storage::disk('local')->size($piece->piece) : 0,
                'status' => $piece->statut,
            ];
            if (Storage::disk('local')->exists($piece->piece)) {
                $meta['sha256'] = hash_file('sha256', Storage::disk('local')->path($piece->piece));
            }

            return [$piece->pieceafournir?->id ?? $piece->id => [
                'label' => $piece->pieceafournir?->libelle ?? 'Pièce justificative',
                ...$meta,
            ]];
        })->all();

        $history = [[
            'at' => $inscription->created_at?->toISOString(),
            'title' => 'Demande soumise',
            'description' => $entity?->raisonsociale ?: trim(($entity?->prenom ?? '').' '.($entity?->nom ?? '')),
        ]];
        foreach ($inscription->rejetinscriptions->sortBy('created_at') as $rejection) {
            $history[] = [
                'at' => $rejection->created_at?->toISOString(),
                'title' => 'Compléments demandés',
                'description' => $rejection->raison,
            ];
        }

        return [
            'numero_dossier' => $inscription->numero_dossier,
            'status' => $inscription->statut,
            'status_label' => self::STATUS_LABELS[$inscription->statut] ?? $inscription->statut,
            'email' => $inscription->email,
            'phone' => $entity?->telephone,
            'submitted_at' => $inscription->created_at?->toISOString(),
            'rejection_reason' => $inscription->statut === Inscription::STATUS_REJECTED ? $inscription->rejetinscriptions->last()?->raison : null,
            'can_edit' => $inscription->statut === Inscription::STATUS_REJECTED,
            'edit_url' => $inscription->statut === Inscription::STATUS_REJECTED ? route('registration.edit', ['numeroDossier' => $inscription->numero_dossier, 'email' => $inscription->email]) : null,
            'identity' => [
                ['label' => 'Type de compte', 'value' => $type],
                ['label' => $isParticulier ? 'Nom' : 'Raison sociale', 'value' => $entity?->raisonsociale ?: trim(($entity?->prenom ?? '').' '.($entity?->nom ?? ''))],
                ['label' => 'NIF', 'value' => $entity?->nif],
                ['label' => 'RCCM', 'value' => $entity?->rccm],
                ['label' => 'Adresse', 'value' => collect([$entity?->adresse, $entity?->ville])->filter()->join(', ')],
                ['label' => 'Représentant légal', 'value' => trim(($entity?->prenom ?? '').' '.($entity?->nom ?? '').($entity?->fonction_representant ? ' · '.$entity->fonction_representant : ''))],
                ['label' => 'Camions', 'value' => $entity?->nombre_camions],
            ],
            'documents' => $documents,
            'history' => $history,
        ];
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
