<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        try {
            $request->authenticate();
        } catch (ValidationException $exception) {
            return back()->with('error', $exception->validator->errors()->first());
        }

        $user = $request->user();

        if (! $user->isApproved() && ! $user->isAdmin()) {
            Auth::logout();

            $message = $user->statut === \App\Models\User::STATUS_INACTIVE
                ? 'Votre compte est désactivé.'
                : ($user->hasVerifiedEmail()
                ? 'Votre dossier est encore en cours de validation.'
                : 'Veuillez vérifier votre adresse email avant de vous connecter.');

            return back()->with('error', $message);
        }

        $request->session()->regenerate();

        if ($user->must_change_password) {
            return redirect()->route('profile.edit')
                ->with('success', 'Vous devez modifier votre mot de passe temporaire.');
        }

        return redirect()->intended(RouteServiceProvider::HOME)->with('success', 'Connexion réussie.');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/')->with('success', 'Vous êtes déconnecté.');
    }
}
