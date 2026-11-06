<?php

namespace App\Http\Controllers;

use App\Models\Inscription;
use App\Models\PieceAFournir;
use App\Models\PieceInscription;
use App\Models\Transitaire;
use App\Notifications\RegistrationPending;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationEditController extends Controller
{
    public function edit(Request $request, string $numeroDossier): Response
    {
        $request->merge(['email' => Str::lower((string) $request->input('email'))]);
        $validated = $request->validate(['email' => ['required', 'email']]);
        $inscription = $this->findRejected($validated['email'], $numeroDossier);
        $entity = $inscription->registrationEntity();
        $type = $entity instanceof Transitaire
            ? PieceAFournir::TYPE_TRANSITAIRE
            : ($entity?->typetransporteur ?? PieceAFournir::TYPE_PARTICULIER);

        $pieces = PieceAFournir::query()
            ->active()
            ->pourType($type)
            ->orderBy('libelle')
            ->get();

        $existing = $inscription->pieceinscriptions()
            ->get()
            ->keyBy('idpieceafournir');

        return Inertia::render('Registration/Edit', [
            'registration' => [
                'numero_dossier' => $inscription->numero_dossier,
                'email' => $inscription->email,
                'user_type' => $type,
                'nom' => $entity?->nom,
                'prenom' => $entity?->prenom,
                'raisonsociale' => $entity?->raisonsociale,
                'telephone' => $entity?->telephone,
                'adresse' => $entity?->adresse,
                'rejection_reason' => $inscription->latestRejection?->raison,
            ],
            'pieces' => $pieces->map(fn (PieceAFournir $piece) => [
                'id' => $piece->id,
                'libelle' => $piece->libelle,
                'description' => $piece->description,
                'isrequired' => $piece->isrequired,
                'type_de_piece' => $piece->type_de_piece,
                'extension' => $piece->extension,
                'already_provided' => $existing->has($piece->id),
            ]),
        ]);
    }

    public function update(Request $request, string $numeroDossier): RedirectResponse
    {
        $request->merge(['email' => Str::lower((string) $request->input('email'))]);
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['nullable', 'confirmed', Rules\Password::min(12)->mixedCase()->numbers()->symbols()],
            'raison_sociale' => ['nullable', 'string', 'max:255'],
            'nom' => ['nullable', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'telephone' => ['required', 'string', 'max:30'],
            'adresse' => ['nullable', 'string', 'max:255'],
        ]);

        $inscription = $this->findRejected($validated['email'], $numeroDossier);
        $entity = $inscription->registrationEntity();
        abort_if($entity === null, 404);

        $type = $entity instanceof Transitaire
            ? PieceAFournir::TYPE_TRANSITAIRE
            : ($entity->typetransporteur ?? PieceAFournir::TYPE_PARTICULIER);

        $pieces = PieceAFournir::query()
            ->active()
            ->pourType($type)
            ->orderBy('libelle')
            ->get();

        $existing = $inscription->pieceinscriptions()
            ->get()
            ->keyBy('idpieceafournir');

        $rules = [];
        foreach ($pieces as $piece) {
            $rules["documents.{$piece->id}"] = [
                $existing->has($piece->id) || ! $piece->isrequired ? 'nullable' : 'required',
                'file',
                'mimes:'.implode(',', $piece->allowedExtensions()),
                'max:10240',
            ];
        }
        $request->validate($rules);

        DB::transaction(function () use ($request, $inscription, $entity, $type, $pieces, $existing) {
            $entity->update([
                'nom' => $request->input('nom'),
                'prenom' => $request->input('prenom'),
                'raisonsociale' => $request->input('raison_sociale'),
                'telephone' => $request->input('telephone'),
                'adresse' => $request->input('adresse'),
                'statut' => Inscription::STATUS_PENDING,
            ]);

            foreach ($pieces as $piece) {
                $file = $request->file("documents.{$piece->id}");

                if ($file === null) {
                    continue;
                }

                $path = $file->store('registrations/'.$inscription->getKey(), 'local');
                $existingPiece = $existing->get($piece->id);

                if ($existingPiece instanceof PieceInscription) {
                    if ($existingPiece->piece) {
                        Storage::disk('local')->delete($existingPiece->piece);
                    }

                    $existingPiece->update(['piece' => $path, 'statut' => Inscription::STATUS_PENDING]);
                } else {
                    PieceInscription::create([
                        'piece' => $path,
                        'statut' => Inscription::STATUS_PENDING,
                        'idpieceafournir' => $piece->id,
                        'idinscription' => $inscription->getKey(),
                    ]);
                }
            }

            $inscription->update(['statut' => Inscription::STATUS_PENDING]);

            $inscription->rejetinscriptions()
                ->where('statut', 'active')
                ->update(['statut' => 'inactive']);

            $entity->update(['statut' => Inscription::STATUS_PENDING]);

            $user = $entity->user;
            $name = in_array($type, [
                PieceAFournir::TYPE_SOCIETE,
                PieceAFournir::TYPE_TRANSITAIRE,
            ], true)
                ? $entity->raisonsociale
                : trim(($entity->prenom ?? '').' '.($entity->nom ?? ''));

            $userData = [
                'name' => $name ?: $entity->email,
                'nom' => $entity->nom,
                'prenom' => $entity->prenom,
                'telephone' => $entity->telephone,
                'adresse' => $entity->adresse,
                'statut' => Inscription::STATUS_PENDING,
            ];

            if ($request->filled('password')) {
                $userData['password'] = $request->input('password');
            }

            $user?->update($userData);

            $user?->notify(new RegistrationPending($inscription->numero_dossier));
        });

        return redirect()
            ->route('registration.status')
            ->with('success', 'Votre dossier a été resoumis pour validation.');
    }

    private function findRejected(string $email, string $numeroDossier): Inscription
    {
        return Inscription::with(['transporteur', 'transitaire', 'latestRejection'])
            ->where('email', $email)
            ->where('numero_dossier', $numeroDossier)
            ->where('statut', Inscription::STATUS_REJECTED)
            ->firstOrFail();
    }
}
