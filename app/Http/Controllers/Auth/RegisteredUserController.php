<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Inscription;
use App\Models\Pays;
use App\Models\PieceAFournir;
use App\Models\PieceInscription;
use App\Models\Transporteur;
use App\Models\User;
use App\Notifications\VerifyRegistrationEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view with the countries and required documents
     * loaded from the database.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register', [
            'pays' => Pays::query()
                ->orderBy('nom')
                ->get(['id', 'nom', 'code', 'indicatif']),
            'pieces' => PieceAFournir::query()
                ->active()
                ->orderBy('libelle')
                ->get(['id', 'libelle', 'description', 'isrequired', 'type_de_piece', 'extension']),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'email' => Str::lower((string) $request->input('email')),
        ]);

        $data = $request->validate([
            'user_type' => ['required', Rule::in([PieceAFournir::TYPE_SOCIETE, PieceAFournir::TYPE_PARTICULIER])],
            'idpays' => ['required', 'integer', 'exists:pays,id'],
            'raison_sociale' => ['required_if:user_type,societe', 'nullable', 'string', 'max:255'],
            'nom' => ['required_if:user_type,particulier', 'nullable', 'string', 'max:255'],
            'prenom' => ['required_if:user_type,particulier', 'nullable', 'string', 'max:255'],
            'telephone' => ['required', 'string', 'max:30'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $pieces = PieceAFournir::query()
            ->active()
            ->pourType($data['user_type'])
            ->orderBy('libelle')
            ->get();

        $request->validate($this->documentRules($pieces));

        [$user, $inscription] = DB::transaction(function () use ($data, $request, $pieces) {
            $name = $data['user_type'] === PieceAFournir::TYPE_SOCIETE
                ? $data['raison_sociale']
                : trim(($data['prenom'] ?? '').' '.($data['nom'] ?? ''));

            $transporteur = Transporteur::create([
                'email' => $data['email'],
                'nom' => $data['nom'] ?? null,
                'prenom' => $data['prenom'] ?? null,
                'raisonsociale' => $data['raison_sociale'] ?? null,
                'typetransporteur' => $data['user_type'],
                'telephone' => $data['telephone'],
                'adresse' => $data['adresse'] ?? null,
                'statut' => Transporteur::STATUS_PENDING,
            ]);

            $inscription = Inscription::create([
                'email' => $data['email'],
                'statut' => Inscription::STATUS_PENDING,
                'token' => Str::random(40),
                'idtransporteur' => $transporteur->getKey(),
            ]);

            $user = User::create([
                'name' => $name,
                'nom' => $data['nom'] ?? null,
                'prenom' => $data['prenom'] ?? null,
                'email' => $data['email'],
                'password' => $data['password'],
                'telephone' => $data['telephone'],
                'adresse' => $data['adresse'] ?? null,
                'user_type' => $data['user_type'],
                'idpays' => $data['idpays'],
                'idtransporteur' => $transporteur->getKey(),
                'statut' => User::STATUS_PENDING,
            ]);

            foreach ($pieces as $piece) {
                $file = $request->file("documents.{$piece->id}");

                if ($file === null) {
                    continue;
                }

                PieceInscription::create([
                    'piece' => $file->store('registrations/'.$inscription->getKey(), 'local'),
                    'statut' => Inscription::STATUS_PENDING,
                    'idpieceafournir' => $piece->getKey(),
                    'idinscription' => $inscription->getKey(),
                    'created_by' => (string) $user->getKey(),
                ]);
            }

            $user->notify(new VerifyRegistrationEmail($inscription->numero_dossier));

            return [$user, $inscription];
        });

        return redirect()
            ->route('login')
            ->with('success', "Votre dossier {$inscription->numero_dossier} a été créé. Vérifiez votre email ({$user->email}) pour continuer.");
    }

    /**
     * Build the upload validation rules for the documents required by the
     * registration type.
     *
     * @param  Collection<int, PieceAFournir>  $pieces
     * @return array<string, array<int, string>>
     */
    private function documentRules(Collection $pieces): array
    {
        $rules = [];

        foreach ($pieces as $piece) {
            $rules["documents.{$piece->id}"] = [
                $piece->isrequired ? 'required' : 'nullable',
                'file',
                'mimes:'.implode(',', $piece->allowedExtensions()),
                'max:10240',
            ];
        }

        return $rules;
    }
}
