<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\CreatedUserCredentials;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;

class CompanyUserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorizeCompany($request);

        return Inertia::render('Users/Index', [
            'users' => $request->user()->createdUsers()->with('roles:id,name')->latest()->get([
                'id',
                'nom',
                'prenom',
                'email',
                'adresse',
                'statut',
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorizeCompany($request);

        return Inertia::render('Users/Create', [
            'profiles' => $this->profiles($request->user()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeCompany($request);
        $creator = $request->user();

        if ($request->filled('role_id') && ! $request->filled('role_name')) {
            $role = DB::table('roles')->where('id', $request->input('role_id'))->first();
            if ($role) {
                $request->merge(['role_name' => $role->name]);
            }
        }

        $data = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'role_name' => ['required', Rule::exists('roles', 'name')->where('created_by', $creator->getKey())],
        ]);

        $temporaryPassword = Str::password(16);
        $user = User::create([
            'name' => trim($data['prenom'] . ' ' . $data['nom']),
            'nom' => $data['nom'],
            'prenom' => $data['prenom'],
            'email' => Str::lower($data['email']),
            'adresse' => $data['adresse'] ?? null,
            'password' => $temporaryPassword,
            'created_by' => $creator->getKey(),
            'user_type' => 'employe',
            'statut' => User::STATUS_ACTIVE,
            'must_change_password' => true,
            'email_verified_at' => now(),
        ]);

        $user->assignRole($data['role_name']);
        $user->notify(new CreatedUserCredentials($temporaryPassword));

        return redirect()->route('users.index')->with('success', 'Utilisateur créé et identifiants envoyés par email.');
    }

    public function edit(Request $request, User $user): Response
    {
        $this->authorizeOwned($request, $user);

        return Inertia::render('Users/Edit', [
            'user' => [
                ...$user->only(['id', 'nom', 'prenom', 'email', 'adresse', 'statut']),
                'role_name' => $user->roles->first()?->name,
            ],
            'profiles' => $this->profiles($request->user()),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorizeOwned($request, $user);
        $data = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'role_name' => ['nullable', Rule::exists('roles', 'name')->where('created_by', $request->user()->getKey())],
        ]);

        $user->update([
            ...$data,
            'name' => trim($data['prenom'] . ' ' . $data['nom']),
            'updated_by' => $request->user()->getKey(),
        ]);
        if (! empty($data['role_name'])) {
            $user->syncRoles([$data['role_name']]);
        }

        return redirect()->route('users.index')->with('success', 'Utilisateur mis à jour.');
    }

    public function toggle(Request $request, User $user): RedirectResponse
    {
        $this->authorizeOwned($request, $user);
        $user->update([
            'statut' => $user->statut === User::STATUS_ACTIVE
                ? User::STATUS_INACTIVE
                : User::STATUS_ACTIVE,
            'updated_by' => $request->user()->getKey(),
        ]);

        return back()->with('success', 'Statut de l’utilisateur mis à jour.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorizeOwned($request, $user);
        $user->delete();

        return redirect()->route('users.index')->with('success', 'Utilisateur supprimé.');
    }

    private function profiles(User $creator)
    {
        return DB::table('roles')
            ->where('guard_name', 'web')
            ->where('created_by', $creator->getKey())
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    private function authorizeCompany(Request $request): void
    {
        abort_unless($request->user()?->user_type === 'societe' && ! $request->user()->isAdmin(), 403);
    }

    private function authorizeOwned(Request $request, User $user): void
    {
        $this->authorizeCompany($request);
        abort_unless((int) $user->created_by === (int) $request->user()->getKey(), 403);
    }
}
