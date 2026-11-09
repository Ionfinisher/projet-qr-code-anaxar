<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $adminId = $request->user()->id;
        $filter = (string) $request->query('status', 'all');
        $search = mb_substr(trim((string) $request->query('q', '')), 0, 50);

        // L'administrateur ne voit que les utilisateurs qu'il a créés
        $query = User::query()->where('created_by', $adminId)->with(['roles']);

        // Recherche textuelle
        if ($search !== '') {
            $needle = '%' . Str::upper($search) . '%';
            $query->where(function ($q) use ($needle) {
                $q->whereRaw('UPPER(nom) LIKE ?', [$needle])
                    ->orWhereRaw('UPPER(prenom) LIKE ?', [$needle])
                    ->orWhereRaw('UPPER(name) LIKE ?', [$needle])
                    ->orWhereRaw('UPPER(email) LIKE ?', [$needle])
                    ->orWhereRaw('UPPER(telephone) LIKE ?', [$needle])
                    ->orWhereRaw('UPPER(fonction) LIKE ?', [$needle]);
            });
        }

        // Filtre par statut
        if ($filter === 'interne') {
            $query->where(function ($q) {
                $q->whereNull('user_type')
                    ->orWhereNotIn('user_type', ['societe', 'transitaire', 'particulier']);
            })->where('statut', '!=', User::STATUS_INACTIVE);
        } elseif ($filter === 'transporteur') {
            $query->whereIn('user_type', ['societe', 'transitaire', 'particulier'])
                ->where('statut', '!=', User::STATUS_INACTIVE);
        } elseif ($filter === 'inactive') {
            $query->where('statut', User::STATUS_INACTIVE);
        }

        $allUsers = User::query()->where('created_by', $adminId)->with(['roles'])->get();
        $counts = [
            'all' => $allUsers->count(),
            'interne' => $allUsers->filter(fn ($u) => ! in_array($u->user_type, ['societe', 'transitaire', 'particulier'], true) && $u->statut !== User::STATUS_INACTIVE)->count(),
            'transporteur' => $allUsers->filter(fn ($u) => in_array($u->user_type, ['societe', 'transitaire', 'particulier'], true) && $u->statut !== User::STATUS_INACTIVE)->count(),
            'inactive' => $allUsers->filter(fn ($u) => $u->statut === User::STATUS_INACTIVE)->count(),
        ];

        $users = $query->latest('id')->paginate(20)->withQueryString()->through(function (User $u) {
            $name = trim("{$u->prenom} {$u->nom}") ?: ($u->name ?? $u->email);
            $isTransporteur = in_array($u->user_type, ['societe', 'transitaire', 'particulier'], true);
            $role = $u->roles->first();

            return [
                'id' => $u->id,
                'nom' => $u->nom,
                'prenom' => $u->prenom,
                'name' => $name,
                'email' => $u->email,
                'phone' => $u->telephone,
                'adresse' => $u->adresse,
                'fonction' => $u->fonction,
                'title' => $u->fonction,
                'active' => $u->statut !== User::STATUS_INACTIVE,
                'statut' => $u->statut ?: 'active',
                'kind' => $isTransporteur ? 'transporteur' : 'interne',
                'acct' => $u->user_type,
                'profile' => $role?->name ?? ($u->isAdmin() ? 'admin' : ($u->user_type ?: 'Utilisateur')),
                'profileId' => $role?->id,
                'lastLoginAt' => $u->last_login_at?->toISOString(),
                'createdAt' => $u->created_at?->toISOString(),
                'must_change_password' => (bool) $u->must_change_password,
            ];
        });

        // L'administrateur ne peut attribuer que les profils qu'il a créés
        $profiles = Role::query()->where('created_by', $adminId)->orderBy('name')->get(['id', 'name', 'kind', 'description']);

        return Inertia::render('Admin/Utilisateurs/Index', [
            'users' => $users,
            'counts' => $counts,
            'filters' => [
                'status' => $filter,
                'q' => $search,
            ],
            'profiles' => $profiles,
            'tempPassword' => $request->session()->get('tempPassword'),
            'tempUserId' => $request->session()->get('tempUserId'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $adminId = $request->user()->id;

        $validated = $request->validate([
            'prenom' => ['required', 'string', 'max:255'],
            'nom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'fonction' => ['nullable', 'string', 'max:255'],
            'role_id' => [
                'required',
                Rule::exists('roles', 'id')->where('created_by', $adminId),
            ],
            'temp_password' => ['nullable', 'string', 'min:8'],
        ]);

        $tempPassword = $validated['temp_password'] ?: Str::random(12);

        $user = User::create([
            'nom' => trim($validated['nom']),
            'prenom' => trim($validated['prenom']),
            'name' => trim("{$validated['prenom']} {$validated['nom']}"),
            'email' => Str::lower(trim($validated['email'])),
            'telephone' => $validated['telephone'] ?? null,
            'fonction' => $validated['fonction'] ?? null,
            'password' => Hash::make($tempPassword),
            'statut' => User::STATUS_ACTIVE,
            'must_change_password' => true,
            'email_verified_at' => now(),
            'created_by' => $adminId,
        ]);

        $role = Role::findById($validated['role_id'], 'web');
        $user->assignRole($role);

        return redirect()->route('admin.utilisateurs.index')
            ->with('success', "Compte de {$user->name} créé avec succès.")
            ->with('tempPassword', $tempPassword)
            ->with('tempUserId', $user->id);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        // L'administrateur ne peut modifier que les utilisateurs qu'il a créés
        if ((int) $user->created_by !== (int) $request->user()->id) {
            abort(403, 'Vous ne pouvez modifier que les utilisateurs que vous avez créés.');
        }

        $adminId = $request->user()->id;
        $isTransporteur = in_array($user->user_type, ['societe', 'transitaire', 'particulier'], true);

        $validated = $request->validate([
            'prenom' => [$isTransporteur ? 'nullable' : 'required', 'string', 'max:255'],
            'nom' => [$isTransporteur ? 'nullable' : 'required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'telephone' => ['nullable', 'string', 'max:30'],
            'fonction' => ['nullable', 'string', 'max:255'],
            'role_id' => [
                'nullable',
                Rule::exists('roles', 'id')->where('created_by', $adminId),
            ],
        ]);

        if (! $isTransporteur) {
            $user->nom = trim($validated['nom']);
            $user->prenom = trim($validated['prenom']);
            $user->name = trim("{$validated['prenom']} {$validated['nom']}");
            $user->fonction = $validated['fonction'] ?? null;
        }

        $user->email = Str::lower(trim($validated['email']));
        $user->telephone = $validated['telephone'] ?? null;
        $user->save();

        if (! empty($validated['role_id'])) {
            $role = Role::findById($validated['role_id'], 'web');
            $user->syncRoles([$role]);
        }

        return redirect()->route('admin.utilisateurs.index')
            ->with('success', "Utilisateur {$user->name} mis à jour.");
    }

    public function toggle(Request $request, User $user): RedirectResponse
    {
        // L'administrateur ne peut modifier que les utilisateurs qu'il a créés
        if ((int) $user->created_by !== (int) $request->user()->id) {
            abort(403, 'Vous ne pouvez modifier que les utilisateurs que vous avez créés.');
        }

        if ($user->statut === User::STATUS_INACTIVE) {
            $user->statut = User::STATUS_ACTIVE;
            $msg = "Compte de {$user->name} réactivé.";
        } else {
            $user->statut = User::STATUS_INACTIVE;
            $msg = "Compte de {$user->name} désactivé.";
        }

        $user->save();

        return redirect()->route('admin.utilisateurs.index')->with('success', $msg);
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        // L'administrateur ne peut réinitialiser que les utilisateurs qu'il a créés
        if ((int) $user->created_by !== (int) $request->user()->id) {
            abort(403, 'Vous ne pouvez réinitialiser que les utilisateurs que vous avez créés.');
        }

        $tempPassword = Str::random(12);

        $user->password = Hash::make($tempPassword);
        $user->must_change_password = true;
        $user->save();

        return redirect()->route('admin.utilisateurs.index')
            ->with('success', "Nouveau mot de passe provisoire généré pour {$user->name}.")
            ->with('tempPassword', $tempPassword)
            ->with('tempUserId', $user->id);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Vous ne pouvez pas supprimer votre propre compte administrateur.');
        }

        // L'administrateur ne peut supprimer que les utilisateurs qu'il a créés
        if ((int) $user->created_by !== (int) $request->user()->id) {
            abort(403, 'Vous ne pouvez supprimer que les utilisateurs que vous avez créés.');
        }

        $name = $user->name ?: $user->email;
        $user->delete();

        return redirect()->route('admin.utilisateurs.index')
            ->with('success', "Utilisateur {$name} supprimé.");
    }
}
