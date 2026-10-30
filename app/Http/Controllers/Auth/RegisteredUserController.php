<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Inscription;
use App\Models\PieceAFournir;
use App\Models\PieceInscription;
use App\Models\Transporteur;
use App\Models\User;
use App\Notifications\VerifyRegistrationEmail;
use App\Providers\RouteServiceProvider;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register', [
            'pieces' => PieceAFournir::query()
                ->whereIn('user_type', ['societe', 'particulier'])
                ->orderBy('nom')
                ->get(['id', 'nom', 'user_type', 'obligatoire']),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        if (! $request->filled('user_type') && $request->filled('name')) {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            event(new Registered($user));
            Auth::login($user);

            return redirect(RouteServiceProvider::HOME);
        }

        $pieces = PieceAFournir::query()
            ->where('user_type', $request->input('user_type'))
            ->get();

        $rules = [
            'user_type' => 'required|in:societe,particulier',
            'idpays' => 'required|integer|exists:pays,id',
            'raison_sociale' => 'required_if:user_type,societe|nullable|string|max:255',
            'nom' => 'required_if:user_type,particulier|nullable|string|max:255',
            'prenom' => 'required_if:user_type,particulier|nullable|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];

        foreach ($pieces as $piece) {
            $rules["documents.{$piece->id}"] = [
                $piece->obligatoire ? 'required' : 'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:10240',
            ];
        }

        $validated = $request->validate($rules);
        $user = DB::transaction(function () use ($request, $pieces) {
            $name = $request->user_type === 'societe'
                ? $request->raison_sociale
                : trim($request->prenom . ' ' . $request->nom);

            $transporteur = Transporteur::create([
                'email' => $request->email,
                'nom' => $request->nom,
                'prenom' => $request->prenom,
                'raisonsociale' => $request->raison_sociale,
                'typetransporteur' => $request->user_type,
                'statut' => 'pending',
            ]);

            $numeroDossier = 'DOS-' . now()->format('Ymd') . '-' . strtoupper(str()->random(6));
            $inscription = Inscription::create([
                'email' => $request->email,
                'statut' => 'pending',
                'token' => str()->random(40),
                'numero_dossier' => $numeroDossier,
                'idtransporteur' => $transporteur->getKey(),
            ]);

            $user = User::create([
                'name' => $name,
                'nom' => $request->nom,
                'prenom' => $request->prenom,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'user_type' => $request->user_type,
                'country' => $request->country,
                'raison_sociale' => $request->raison_sociale,
                'statut' => 'pending',
                'idtransporteur' => $transporteur->getKey(),
            ]);

            foreach ($pieces as $piece) {
                $file = $request->file("documents.{$piece->id}");
                if ($file === null) {
                    continue;
                }

                PieceInscription::create([
                    'piece' => $file->store('registrations/' . $inscription->getKey()),
                    'statut' => 'pending',
                    'idpieceafournir' => $piece->getKey(),
                    'idinscription' => $inscription->getKey(),
                ]);
            }

            $user->notify(new VerifyRegistrationEmail());

            return $user;
        });

        return redirect()->route('login')->with('status', 'Votre dossier a été créé. Vérifiez votre email pour continuer.');
    }
}
