<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTransporteur
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->isTransporteur() && ! $user->isAdmin())) {
            abort(403, 'Espace réservé aux transporteurs.');
        }

        if (! $user->isAdmin() && ! $user->isApproved()) {
            abort(403, 'Votre compte doit être approuvé pour accéder à cet espace.');
        }

        return $next($request);
    }
}
