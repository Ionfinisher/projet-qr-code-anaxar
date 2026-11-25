<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\MobileAccessToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureMobileAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User
            || ! $user->isAdmin()
            || ! $user->isActive()
            || ! $user->isApproved()
            || $user->must_change_password
            || ! $user->tokenCan(MobileAccessToken::ABILITY)) {
            abort(403, 'Accès non autorisé.');
        }

        return $next($request);
    }
}
