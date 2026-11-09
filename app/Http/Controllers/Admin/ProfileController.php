<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProfileController extends Controller
{
    public function index(Request $request): Response
    {
        $adminId = $request->user()->id;

        // L'administrateur ne voit que les profils qu'il a créés
        $roles = Role::query()
            ->where('created_by', $adminId)
            ->with(['permissions:id,name'])
            ->withCount('users')
            ->orderBy('name')
            ->get();

        $profiles = $roles->map(function (Role $role) {
            $isSuperAdmin = $role->name === 'admin';
            $perms = $isSuperAdmin ? ['*'] : $role->permissions->pluck('name')->all();

            $usersSample = $role->users()
                ->select(['users.id', 'users.nom', 'users.prenom', 'users.name', 'users.email'])
                ->take(16)
                ->get()
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => trim("{$u->prenom} {$u->nom}") ?: ($u->name ?? $u->email),
                    'email' => $u->email,
                ]);

            $isSystem = (bool) $role->is_system;
            $isLocked = (bool) $role->is_locked;

            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'kind' => $role->kind ?: 'interne',
                'is_system' => $isSystem,
                'system' => $isSystem,
                'is_locked' => $isLocked,
                'locked' => $isLocked,
                'perms' => $perms,
                'users_count' => (int) $role->users_count,
                'users' => $usersSample,
            ];
        });

        return Inertia::render('Admin/Profils/Index', [
            'profiles' => $profiles,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:roles,name'],
            'description' => ['nullable', 'string', 'max:500'],
            'kind' => ['required', 'in:interne,externe'],
            'perms' => ['nullable', 'array'],
            'perms.*' => ['string'],
        ]);

        $role = Role::create([
            'name' => trim($validated['name']),
            'guard_name' => 'web',
            'description' => $validated['description'] ?? null,
            'kind' => $validated['kind'],
            'is_system' => false,
            'is_locked' => false,
            'created_by' => $request->user()->id,
        ]);

        // Seul le superadmin peut créer des permissions : l'admin ne peut associer que des permissions existantes
        $perms = $validated['perms'] ?? [];
        if (! empty($perms)) {
            $existingPerms = Permission::where('guard_name', 'web')
                ->whereIn('name', $perms)
                ->pluck('name')
                ->all();
            $role->syncPermissions($existingPerms);
        }

        return redirect()->route('admin.profils.index')->with('success', "Profil « {$role->name} » créé avec succès.");
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        // L'administrateur ne peut modifier que les profils qu'il a créés
        if ((int) $role->created_by !== (int) $request->user()->id) {
            abort(403, 'Vous ne pouvez modifier que les profils que vous avez créés.');
        }

        $isSystem = (bool) $role->is_system;

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('roles', 'name')->ignore($role->id),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'perms' => ['nullable', 'array'],
            'perms.*' => ['string'],
        ]);

        if (! $isSystem) {
            $role->name = trim($validated['name']);
        }
        $role->description = $validated['description'] ?? null;
        $role->save();

        // Seul le superadmin peut créer des permissions : l'admin synchronise uniquement celles qui existent
        if (! $role->is_locked && $role->name !== 'admin') {
            $perms = $validated['perms'] ?? [];
            $existingPerms = Permission::where('guard_name', 'web')
                ->whereIn('name', $perms)
                ->pluck('name')
                ->all();
            $role->syncPermissions($existingPerms);
        }

        return redirect()->route('admin.profils.index')->with('success', "Profil « {$role->name} » mis à jour.");
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        // L'administrateur ne peut supprimer que les profils qu'il a créés
        if ((int) $role->created_by !== (int) $request->user()->id) {
            abort(403, 'Vous ne pouvez supprimer que les profils que vous avez créés.');
        }

        if ((bool) $role->is_system) {
            return back()->with('error', 'Impossible de supprimer un profil système.');
        }

        if ($role->users()->exists()) {
            return back()->with('error', 'Impossible de supprimer un profil assigné à des utilisateurs.');
        }

        $name = $role->name;
        $role->delete();

        return redirect()->route('admin.profils.index')->with('success', "Profil « {$name} » supprimé.");
    }
}
