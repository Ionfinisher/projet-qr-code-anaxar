<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\AuthController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MobileAuthApiTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'MotDePasse123!';

    private const ADMIN_EMAIL = 'admin@example.com';

    protected function setUp(): void
    {
        parent::setUp();

        RateLimiter::clear(AuthController::throttleKey(self::ADMIN_EMAIL, '127.0.0.1'));
    }

    private function admin(array $attributes = []): User
    {
        $admin = User::factory()->create(array_merge([
            'email' => self::ADMIN_EMAIL,
            'password' => Hash::make(self::PASSWORD),
            'email_verified_at' => now(),
            'name' => 'Admin Mobile',
        ], $attributes));

        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->assignRole($role);

        return $admin;
    }

    private function transporteur(array $attributes = []): User
    {
        return User::factory()->transporteur()->create(array_merge([
            'password' => Hash::make(self::PASSWORD),
        ], $attributes));
    }

    /**
     * @param  array<int, string>  $abilities
     */
    private function authenticate(User $user, array $abilities = ['mobile.access']): string
    {
        $token = $user->createToken('mobile-test', $abilities)->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token);

        return $token;
    }

    public function test_login_success_returns_a_twelve_hour_mobile_token(): void
    {
        $admin = $this->admin();

        $response = $this->postJson(route('api.v1.login'), [
            'email' => self::ADMIN_EMAIL,
            'password' => self::PASSWORD,
        ]);

        $response->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.id', $admin->id)
            ->assertJsonPath('user.name', 'Admin Mobile')
            ->assertJsonPath('user.email', self::ADMIN_EMAIL)
            ->assertJsonPath('user.roles.0', 'admin')
            ->assertJsonStructure(['access_token', 'expires_at', 'user' => ['id', 'name', 'email', 'roles']]);

        $plainTextToken = (string) $response->json('access_token');
        $this->assertMatchesRegularExpression('/^\d+\|[A-Za-z0-9]+$/', $plainTextToken);

        $token = PersonalAccessToken::findToken($plainTextToken);
        $this->assertNotNull($token);
        $this->assertSame('mobile', $token->name);
        $this->assertSame(['mobile.access'], $token->abilities);
        $this->assertSame($admin->id, $token->tokenable_id);
        $this->assertNotNull($token->expires_at);
        $this->assertEqualsWithDelta(now()->addHours(12)->timestamp, $token->expires_at->timestamp, 5);
    }

    public function test_login_validates_an_empty_payload(): void
    {
        $this->postJson(route('api.v1.login'), [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_validates_an_invalid_email(): void
    {
        $this->postJson(route('api.v1.login'), [
            'email' => 'pas-un-email',
            'password' => self::PASSWORD,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_login_returns_the_same_401_for_unknown_email_and_bad_password(): void
    {
        $this->admin();

        $unknown = $this->postJson(route('api.v1.login'), [
            'email' => 'inconnu@example.com',
            'password' => self::PASSWORD,
        ])->assertStatus(401)->json('message');

        $wrongPassword = $this->postJson(route('api.v1.login'), [
            'email' => self::ADMIN_EMAIL,
            'password' => 'mauvais-mot-de-passe',
        ])->assertStatus(401)->json('message');

        $this->assertSame($unknown, $wrongPassword);
        $this->assertSame('Identifiants invalides.', $wrongPassword);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_refuses_non_admin_inactive_pending_and_password_change(): void
    {
        $this->transporteur(['email' => 'transporteur@example.com']);
        $this->admin(['email' => 'inactif@example.com', 'statut' => User::STATUS_INACTIVE]);
        $this->admin(['email' => 'pending@example.com', 'statut' => User::STATUS_PENDING]);
        $this->admin(['email' => 'password@example.com', 'must_change_password' => true]);

        foreach (['transporteur@example.com', 'inactif@example.com', 'pending@example.com'] as $email) {
            $this->postJson(route('api.v1.login'), [
                'email' => $email,
                'password' => self::PASSWORD,
            ])->assertStatus(403)->assertJsonPath('message', 'Accès non autorisé.');
        }

        $this->postJson(route('api.v1.login'), [
            'email' => 'password@example.com',
            'password' => self::PASSWORD,
        ])->assertStatus(403)->assertJsonPath(
            'message',
            'Vous devez changer votre mot de passe via l’interface web avant d’utiliser l’application mobile.'
        );

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_rate_limits_after_five_failures_with_retry_after(): void
    {
        $this->admin();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson(route('api.v1.login'), [
                'email' => self::ADMIN_EMAIL,
                'password' => 'mauvais-mot-de-passe',
            ])->assertStatus(401);
        }

        $response = $this->postJson(route('api.v1.login'), [
            'email' => self::ADMIN_EMAIL,
            'password' => self::PASSWORD,
        ])->assertStatus(429)
            ->assertJsonPath('message', 'Trop de tentatives de connexion. Réessayez plus tard.');

        $this->assertNotEmpty($response->headers->get('Retry-After'));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_rate_limit_is_isolated_by_email(): void
    {
        $this->admin();
        $otherAdmin = $this->admin(['email' => 'autre-admin@example.com']);
        RateLimiter::clear(AuthController::throttleKey($otherAdmin->email, '127.0.0.1'));

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson(route('api.v1.login'), [
                'email' => self::ADMIN_EMAIL,
                'password' => 'mauvais-mot-de-passe',
            ])->assertStatus(401);
        }

        $this->postJson(route('api.v1.login'), [
            'email' => self::ADMIN_EMAIL,
            'password' => self::PASSWORD,
        ])->assertStatus(429);

        $this->postJson(route('api.v1.login'), [
            'email' => $otherAdmin->email,
            'password' => self::PASSWORD,
        ])->assertOk()->assertJsonPath('user.id', $otherAdmin->id);
    }

    public function test_protected_routes_reject_a_token_without_the_mobile_ability(): void
    {
        $this->authenticate($this->admin(), ['other.ability']);

        $this->postJson(route('api.v1.scan'), ['token' => 'pas-un-jwt'])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Accès non autorisé.');
        $this->postJson(route('api.v1.logout'))
            ->assertStatus(403)
            ->assertJsonPath('message', 'Accès non autorisé.');
    }

    public function test_protected_routes_reject_a_token_issued_before_account_deactivation(): void
    {
        $admin = $this->admin();
        $this->authenticate($admin);
        $admin->forceFill(['statut' => User::STATUS_INACTIVE])->save();

        $this->postJson(route('api.v1.scan'), ['token' => 'pas-un-jwt'])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Accès non autorisé.');
        $this->postJson(route('api.v1.logout'))
            ->assertStatus(403)
            ->assertJsonPath('message', 'Accès non autorisé.');
    }

    public function test_protected_routes_reject_a_token_issued_before_password_change_is_required(): void
    {
        $admin = $this->admin();
        $this->authenticate($admin);
        $admin->forceFill(['must_change_password' => true])->save();

        $this->postJson(route('api.v1.scan'), ['token' => 'pas-un-jwt'])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Accès non autorisé.');
        $this->postJson(route('api.v1.logout'))
            ->assertStatus(403)
            ->assertJsonPath('message', 'Accès non autorisé.');
    }

    public function test_protected_routes_reject_an_expired_token(): void
    {
        $admin = $this->admin();
        $this->withHeader('Authorization', 'Bearer '.$admin->createToken(
            'mobile-test',
            ['mobile.access'],
            now()->subMinute()
        )->plainTextToken);

        $this->postJson(route('api.v1.scan'), ['token' => 'pas-un-jwt'])->assertStatus(401);

        $this->app['auth']->forgetGuards();
        $this->postJson(route('api.v1.logout'))->assertStatus(401);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_logout_deletes_the_current_token_and_leaves_other_tokens_valid(): void
    {
        $admin = $this->admin();
        $currentToken = $this->authenticate($admin);
        $otherToken = $admin->createToken('mobile-test', ['mobile.access'])->plainTextToken;

        $this->postJson(route('api.v1.logout'))
            ->assertOk()
            ->assertJsonPath('message', 'Déconnecté.');

        $this->assertSame(1, PersonalAccessToken::count());
        $this->assertNull(PersonalAccessToken::findToken($currentToken));

        // Le guard est mis en cache entre deux requêtes du même test.
        $this->app['auth']->forgetGuards();
        $this->postJson(route('api.v1.scan'), ['token' => 'pas-un-jwt'])->assertStatus(401);

        $this->withHeader('Authorization', 'Bearer '.$otherToken);
        $this->postJson(route('api.v1.scan'), ['token' => 'pas-un-jwt'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }
}
