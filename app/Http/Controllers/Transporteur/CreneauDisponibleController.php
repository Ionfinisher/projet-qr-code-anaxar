<?php

namespace App\Http\Controllers\Transporteur;

use App\Http\Controllers\Controller;
use App\Models\Terminal;
use App\Services\CreneauCalendarService;
use App\Support\TransporteurPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CreneauDisponibleController extends Controller
{
    public function __construct(private readonly CreneauCalendarService $calendar)
    {
    }

    public function index(Request $request): Response
    {
        $terminals = Terminal::query()->active()->orderBy('code')->get(['id', 'code', 'short', 'label']);
        $terminalParam = $request->query('terminal_id');
        $selectedTerminal = $terminalParam
            ? $terminals->firstWhere('id', (int) $terminalParam)
            : $terminals->first();

        $terminalId = $selectedTerminal?->id;

        return Inertia::render('Transporteur/Creneaux/Index', [
            'slots' => $this->calendar->upcoming(
                user: $request->user(),
                terminalId: $terminalId
            ),
            'terminals' => $terminals,
            'selected_terminal_id' => $terminalId,
            'me' => TransporteurPresenter::me($request->user()),
        ]);
    }
}

