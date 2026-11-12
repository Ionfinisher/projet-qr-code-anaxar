<?php

namespace App\Http\Controllers;

use App\Models\Inscription;
use App\Models\Pays;
use App\Models\PieceAFournir;
use App\Models\PieceInscription;
use App\Models\Transitaire;
use App\Models\Transporteur;
use App\Models\User;
use App\Notifications\RegistrationPending;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationEditController extends Controller
{
    public function edit(Request $request, string $numeroDossier): Response
    {
        $request->merge(['email' => Str::lower((string) $request->input('email'))]);
        $validated = $request->validate(['email' => ['required', 'email']]);
        $inscription = $this->findEditable($validated['email'], $numeroDossier);
        $entity = $inscription->registrationEntity();
        $type = $this->typeFor($entity);

        $pays = Pays::query()
            ->orderBy('nom')
            ->get(['id', 'nom', 'code', 'indicatif']);

        $pieces = PieceAFournir::query()
            ->active()
            ->pourType($type)
            ->orderBy('libelle')
            ->get();

        $existing = $inscription->pieceinscriptions()
            ->get()
            ->keyBy('idpieceafournir');

        $isBusiness = $this->isBusiness($type);
        $user = $entity?->user;
        $phone = $this->splitPhone((string) $entity?->telephone, $pays, $user?->idpays);

        return Inertia::render('Registration/Edit', [
            'registration' => [
                'numero_dossier' => $inscription->numero_dossier,
                'email' => $inscription->email,
                'user_type' => $type,
                'idpays' => $user?->idpays,
                'phone_pays_id' => $phone['phone_pays_id'],
                'raison_sociale' => $entity?->raisonsociale,
                'nif' => $entity?->nif,
                'rccm' => $entity?->rccm,
                'representant_nom' => $isBusiness ? $entity?->nom : null,
                'representant_prenom' => $isBusiness ? $entity?->prenom : null,
                'fonction_representant' => $entity?->fonction_representant,
                'nom' => $isBusiness ? null : $entity?->nom,
                'prenom' => $isBusiness ? null : $entity?->prenom,
                'numero_piece_identite' => $entity?->numero_piece_identite,
                'telephone' => $phone['telephone'],
                'adresse' => $entity?->adresse,
                'ville' => $entity?->ville,
                'nombre_camions' => $entity?->nombre_camions,
                'rejection_reason' => $inscription->latestRejection?->raison,
                'documents' => (object) $existing->mapWithKeys(fn (PieceInscription $piece) => [
                    $piece->idpieceafournir => [
                        'name' => basename((string) $piece->piece),
                        'size' => $piece->piece && Storage::disk('local')->exists($piece->piece)
                            ? Storage::disk('local')->size($piece->piece)
                            : 0,
                    ],
                ])->all(),
            ],
            'pays' => $pays,
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
        $request->merge([
            'current_email' => Str::lower((string) $request->input('current_email')),
            'email' => $request->filled('email') ? Str::lower((string) $request->input('email')) : null,
        ]);

        $inscription = $this->findEditable((string) $request->input('current_email'), $numeroDossier);
        $entity = $inscription->registrationEntity();
        abort_if($entity === null, 404);

        $type = $this->typeFor($entity);
        $user = $entity->user;

        $emailRule = ['nullable', 'string', 'lowercase', 'email', 'max:255'];
        $emailRule[] = $user
            ? Rule::unique(User::class)->ignore($user->getKey())
            : Rule::unique(User::class);

        $data = $request->validate([
            'current_email' => ['required', 'email'],
            'user_type' => ['required', Rule::in([
                PieceAFournir::TYPE_SOCIETE,
                PieceAFournir::TYPE_TRANSITAIRE,
                PieceAFournir::TYPE_PARTICULIER,
            ])],
            'idpays' => ['required', 'integer', 'exists:pays,id'],
            'phone_pays_id' => ['nullable', 'integer', 'exists:pays,id'],
            'raison_sociale' => ['required_if:user_type,societe,transitaire', 'nullable', 'string', 'max:255'],
            'nif' => ['required_if:user_type,societe,transitaire', 'nullable', 'string', 'max:100'],
            'rccm' => ['required_if:user_type,societe,transitaire', 'nullable', 'string', 'max:100'],
            'nom' => ['required_if:user_type,particulier', 'nullable', 'string', 'max:255'],
            'prenom' => ['required_if:user_type,particulier', 'nullable', 'string', 'max:255'],
            'numero_piece_identite' => ['required_if:user_type,particulier', 'nullable', 'string', 'max:100'],
            'representant_nom' => ['required_if:user_type,societe,transitaire', 'nullable', 'string', 'max:255'],
            'representant_prenom' => ['required_if:user_type,societe,transitaire', 'nullable', 'string', 'max:255'],
            'fonction_representant' => ['required_if:user_type,societe,transitaire', 'nullable', 'string', 'max:255'],
            'telephone' => ['required', 'string', 'max:30'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'ville' => ['required_if:user_type,societe,transitaire', 'nullable', 'string', 'max:255'],
            'nombre_camions' => ['nullable', 'integer', 'min:0', 'max:5000'],
            'email' => $emailRule,
            'password' => ['nullable', 'confirmed', Rules\Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        if ($data['user_type'] !== $type) {
            throw ValidationException::withMessages([
                'user_type' => 'Le type de compte ne peut pas être modifié.',
            ]);
        }

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

        $isParticulier = $type === PieceAFournir::TYPE_PARTICULIER;
        $isBusiness = $this->isBusiness($type);
        $telephone = $this->formatPhone($data);

        DB::transaction(function () use ($data, $request, $inscription, $entity, $isParticulier, $isBusiness, $pieces, $existing, $telephone, $user) {
            $attributes = [
                'email' => $data['email'] ?? $entity->email,
                'nom' => $isParticulier ? ($data['nom'] ?? null) : ($data['representant_nom'] ?? null),
                'prenom' => $isParticulier ? ($data['prenom'] ?? null) : ($data['representant_prenom'] ?? null),
                'raisonsociale' => $data['raison_sociale'] ?? null,
                'nif' => $data['nif'] ?? null,
                'rccm' => $data['rccm'] ?? null,
                'fonction_representant' => $data['fonction_representant'] ?? null,
                'telephone' => $telephone,
                'adresse' => $data['adresse'] ?? null,
                'ville' => $data['ville'] ?? null,
                'nombre_camions' => $data['nombre_camions'] ?? null,
                'statut' => Inscription::STATUS_PENDING,
            ];

            if ($isParticulier) {
                $attributes['numero_piece_identite'] = $data['numero_piece_identite'] ?? null;
            }

            $entity->update($attributes);

            if (! empty($data['email'])) {
                $inscription->update(['email' => $data['email']]);
            }

            $name = $isBusiness
                ? (string) ($data['raison_sociale'] ?? '')
                : trim(($data['prenom'] ?? '').' '.($data['nom'] ?? ''));

            $userData = [
                'name' => $name ?: ($data['email'] ?? $user?->email),
                'nom' => $attributes['nom'],
                'prenom' => $attributes['prenom'],
                'telephone' => $telephone,
                'adresse' => $data['adresse'] ?? null,
                'idpays' => $data['idpays'],
                'statut' => Inscription::STATUS_PENDING,
            ];

            if (! empty($data['email'])) {
                $userData['email'] = $data['email'];
            }

            if (! empty($data['password'])) {
                $userData['password'] = $data['password'];
            }

            $user?->update($userData);

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

            $user?->notify(new RegistrationPending($inscription->numero_dossier));
        });

        return redirect()
            ->route('registration.status.search', [
                'email' => $data['email'] ?? $inscription->email,
                'numero_dossier' => $inscription->numero_dossier,
            ])
            ->with('success', 'Votre dossier a été resoumis pour validation.');
    }

    private function findEditable(string $email, string $numeroDossier): Inscription
    {
        return Inscription::with(['transporteur.user', 'transitaire.user', 'latestRejection'])
            ->where('email', $email)
            ->where('numero_dossier', $numeroDossier)
            ->where('statut', Inscription::STATUS_COMPLEMENTS_REQUESTED)
            ->firstOrFail();
    }

    private function typeFor(Transitaire|Transporteur|null $entity): string
    {
        return $entity instanceof Transitaire
            ? PieceAFournir::TYPE_TRANSITAIRE
            : ($entity?->typetransporteur ?? PieceAFournir::TYPE_PARTICULIER);
    }

    private function isBusiness(string $type): bool
    {
        return in_array($type, [
            PieceAFournir::TYPE_SOCIETE,
            PieceAFournir::TYPE_TRANSITAIRE,
        ], true);
    }

    /**
     * Sépare un numéro E.164 stocké en indicatif pays + numéro national.
     *
     * @param  Collection<int, Pays>  $pays
     * @return array{phone_pays_id: int|null, telephone: string}
     */
    private function splitPhone(string $phone, Collection $pays, ?int $fallbackPaysId): array
    {
        $phone = trim($phone);

        if ($phone === '') {
            return ['phone_pays_id' => $fallbackPaysId, 'telephone' => ''];
        }

        $country = $pays
            ->filter(function (Pays $pays) use ($phone) {
                $dial = '+'.ltrim((string) $pays->indicatif, '+');

                return $dial !== '+' && str_starts_with($phone, $dial);
            })
            ->sortByDesc(fn (Pays $pays) => strlen(ltrim((string) $pays->indicatif, '+')))
            ->first();

        if ($country === null) {
            return ['phone_pays_id' => $fallbackPaysId, 'telephone' => $phone];
        }

        $dial = '+'.ltrim((string) $country->indicatif, '+');

        return [
            'phone_pays_id' => $country->id,
            'telephone' => trim(substr($phone, strlen($dial))),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function formatPhone(array $data): string
    {
        $rawPhone = trim((string) $data['telephone']);
        $phoneCountry = ! empty($data['phone_pays_id'])
            ? Pays::find($data['phone_pays_id'])
            : Pays::find($data['idpays']);

        $indicatif = $phoneCountry?->indicatif ? '+'.ltrim((string) $phoneCountry->indicatif, '+') : '';

        if ($indicatif !== '' && ! str_starts_with($rawPhone, '+')) {
            $cleanedDigits = ltrim((string) preg_replace('/\D/', '', $rawPhone), '0');

            return $indicatif.$cleanedDigits;
        }

        return $rawPhone;
    }
}
