<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Terminal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TerminalController extends Controller
{
    public function index(Request $request): Response
    {
        $terminals = Terminal::query()
            ->withCount('creneaux')
            ->orderBy('code')
            ->get()
            ->map(fn (Terminal $t) => [
                'id' => $t->id,
                'code' => $t->code,
                'short' => $t->short,
                'label' => $t->label,
                'statut' => $t->statut,
                'creneaux_count' => $t->creneaux_count,
                'created_at' => $t->created_at?->format('Y-m-d H:i'),
            ]);

        return Inertia::render('Admin/Terminals/Index', [
            'terminals' => $terminals,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9_-]+$/i', 'unique:terminals,code'],
            'short' => ['required', 'string', 'max:20'],
            'label' => ['required', 'string', 'max:100'],
            'statut' => ['required', 'string', Rule::in(['active', 'inactive'])],
        ]);

        Terminal::create([
            'code' => strtoupper(trim($validated['code'])),
            'short' => trim($validated['short']),
            'label' => trim($validated['label']),
            'statut' => $validated['statut'],
            'created_by' => $request->user()?->id,
        ]);

        return redirect()
            ->route('admin.terminals.index')
            ->with('success', 'Terminal créé avec succès.');
    }

    public function update(Request $request, Terminal $terminal): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9_-]+$/i', Rule::unique('terminals', 'code')->ignore($terminal->id)],
            'short' => ['required', 'string', 'max:20'],
            'label' => ['required', 'string', 'max:100'],
            'statut' => ['required', 'string', Rule::in(['active', 'inactive'])],
        ]);

        $terminal->update([
            'code' => strtoupper(trim($validated['code'])),
            'short' => trim($validated['short']),
            'label' => trim($validated['label']),
            'statut' => $validated['statut'],
            'updated_by' => $request->user()?->id,
        ]);

        return redirect()
            ->route('admin.terminals.index')
            ->with('success', 'Terminal mis à jour.');
    }

    public function destroy(Terminal $terminal): RedirectResponse
    {
        if ($terminal->creneaux()->exists()) {
            return redirect()
                ->route('admin.terminals.index')
                ->with('error', 'Impossible de supprimer un terminal auquel des créneaux sont rattachés.');
        }

        $terminal->delete();

        return redirect()
            ->route('admin.terminals.index')
            ->with('success', 'Terminal supprimé.');
    }
}

