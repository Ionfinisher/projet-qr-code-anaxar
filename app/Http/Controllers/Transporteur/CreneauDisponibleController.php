<?php

namespace App\Http\Controllers\Transporteur;

use App\Http\Controllers\Controller;
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
        return Inertia::render('Transporteur/Creneaux/Index', [
            'slots' => $this->calendar->upcoming($request->user()),
            'me' => TransporteurPresenter::me($request->user()),
        ]);
    }
}
