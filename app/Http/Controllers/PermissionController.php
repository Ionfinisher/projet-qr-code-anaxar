<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        // Seul le super-administrateur peut créer des permissions
        abort(403, 'Seul le super-administrateur peut créer des permissions.');
    }

    public function update(Request $request, Permission $permission): RedirectResponse
    {
        abort(403, 'Seul le super-administrateur peut modifier des permissions.');
    }

    public function destroy(Permission $permission): RedirectResponse
    {
        abort(403, 'Seul le super-administrateur peut supprimer des permissions.');
    }
}
