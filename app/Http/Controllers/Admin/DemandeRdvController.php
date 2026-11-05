<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transporteur\RejectDemandeRdvRequest;
use App\Models\DemandeRdv;
use App\Services\DemandeRdvService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DemandeRdvController extends Controller
{
    public function __construct(private readonly DemandeRdvService $service)
    {
    }

    public function approve(Request $request, DemandeRdv $demande): RedirectResponse
    {
        $validated = $request->validate([
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->service->approve($demande, $request->user(), $validated['comment'] ?? null);

        return back()->with('success', 'Demande validée.');
    }

    public function reject(RejectDemandeRdvRequest $request, DemandeRdv $demande): RedirectResponse
    {
        $this->service->reject(
            $demande,
            $request->user(),
            $request->validated('reason'),
            $request->validated('comment')
        );

        return back()->with('success', 'Demande rejetée.');
    }
}
