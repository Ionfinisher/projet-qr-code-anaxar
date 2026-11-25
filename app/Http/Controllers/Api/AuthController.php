<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Models\User;
use App\Support\MobileAccessToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private const TOKEN_NAME = 'mobile';

    private const TOKEN_ABILITY = MobileAccessToken::ABILITY;

    private const TOKEN_HOURS = 12;

    private const LOGIN_MAX_ATTEMPTS = 5;

    private const LOGIN_DECAY_SECONDS = 60;

    private const INVALID_CREDENTIALS = 'Identifiants invalides.';

    private const DUMMY_HASH = '$2y$12$ol.YSKB47EfMI7oEfdzh/eSmi.0HTRtMLGSCBJ6PDVXPdXXolZaIq';

    private const FORBIDDEN = 'Accès non autorisé.';

    private const PASSWORD_CHANGE_REQUIRED = 'Vous devez changer votre mot de passe via l’interface web avant d’utiliser l’application mobile.';

    private const TOO_MANY_ATTEMPTS = 'Trop de tentatives de connexion. Réessayez plus tard.';

    public function login(LoginRequest $request): JsonResponse
    {
        $key = self::throttleKey((string) $request->input('email'), $request->ip());

        if (RateLimiter::tooManyAttempts($key, self::LOGIN_MAX_ATTEMPTS)) {
            return response()->json(['message' => self::TOO_MANY_ATTEMPTS], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }

        $email = mb_strtolower(trim((string) $request->input('email')));
        $user = User::query()->where('email', $email)->first();

        // Hash::check() est toujours exécuté, y compris pour un email inconnu.
        $password = (string) $request->input('password');
        $hash = $user?->password ?: self::DUMMY_HASH;
        $passwordMatches = Hash::check($password, (string) $hash);

        if ($user === null || ! $passwordMatches) {
            RateLimiter::hit($key, self::LOGIN_DECAY_SECONDS);

            return response()->json(['message' => self::INVALID_CREDENTIALS], 401);
        }

        if (! $user->isAdmin() || ! $user->isActive() || ! $user->isApproved()) {
            return response()->json(['message' => self::FORBIDDEN], 403);
        }

        if ($user->must_change_password) {
            return response()->json(['message' => self::PASSWORD_CHANGE_REQUIRED], 403);
        }

        RateLimiter::clear($key);

        $expiresAt = now()->addHours(self::TOKEN_HOURS);
        $token = $user->createToken(self::TOKEN_NAME, [self::TOKEN_ABILITY], $expiresAt)->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values()->all(),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * Clé de limitation par email et IP, sans donnée personnelle en clair.
     */
    public static function throttleKey(string $email, ?string $ip): string
    {
        return 'mobile-login:'.sha1(mb_strtolower(trim($email)).'|'.($ip ?? ''));
    }
}
