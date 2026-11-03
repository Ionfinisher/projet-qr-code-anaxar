<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Permissions/Index', [
            'permissions' => Permission::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->get(['id', 'name', 'guard_name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\pN._:\- ]+$/u', Rule::unique('permissions')->where('guard_name', 'web')],
        ]);

        Permission::create(['name' => $data['name'], 'guard_name' => 'web']);

        return back()->with('success', 'Permission créée.');
    }

    public function update(Request $request, Permission $permission): RedirectResponse
    {
        abort_unless($permission->guard_name === 'web', 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\pN._:\- ]+$/u', Rule::unique('permissions')->where(fn ($query) => $query->where('guard_name', 'web')->where('id', '!=', $permission->getKey()))],
        ]);

        $permission->update(['name' => $data['name']]);

        return back()->with('success', 'Permission mise à jour.');
    }

    public function destroy(Permission $permission): RedirectResponse
    {
        abort_unless($permission->guard_name === 'web', 404);
        $permission->delete();

        return back()->with('success', 'Permission supprimée.');
    }
}
