<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProfileRoleController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Profiles/Index', [
            'profiles' => Role::query()
                ->where('guard_name', 'web')
                ->where('created_by', $request->user()->getKey())
                ->with('permissions:id,name')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Profiles/Create', ['permissions' => $this->permissions()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $role = Role::create([
            'name' => $data['name'],
            'guard_name' => 'web',
            'created_by' => $request->user()->getKey(),
        ]);
        $role->syncPermissions($data['permissions'] ?? []);

        return redirect()->route('profiles.index')->with('success', 'Profil créé.');
    }

    public function edit(Request $request, Role $profile): Response
    {
        $this->authorizeOwned($request, $profile);

        return Inertia::render('Profiles/Edit', [
            'profile' => $profile->load('permissions:id,name')->only(['id', 'name', 'permissions']),
            'permissions' => $this->permissions(),
        ]);
    }

    public function update(Request $request, Role $profile): RedirectResponse
    {
        $this->authorizeOwned($request, $profile);
        $data = $this->validated($request, $profile);
        $profile->update(['name' => $data['name']]);
        $profile->syncPermissions($data['permissions'] ?? []);

        return redirect()->route('profiles.index')->with('success', 'Profil mis à jour.');
    }

    public function destroy(Request $request, Role $profile): RedirectResponse
    {
        $this->authorizeOwned($request, $profile);
        $profile->delete();

        return back()->with('success', 'Profil supprimé.');
    }

    private function permissions()
    {
        return Permission::query()->where('guard_name', 'web')->orderBy('name')->get(['id', 'name']);
    }

    private function validated(Request $request, ?Role $profile = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\pN._:\- ]+$/u', Rule::unique('roles')->where(fn ($query) => $query->where('guard_name', 'web')->when($profile, fn ($query) => $query->where('id', '!=', $profile->getKey())))],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['integer', Rule::exists('permissions', 'id')->where('guard_name', 'web')],
        ]);
    }

    private function authorizeOwned(Request $request, Role $profile): void
    {
        abort_unless($profile->guard_name === 'web' && (int) $profile->created_by === (int) $request->user()->getKey(), 403);
    }
}
