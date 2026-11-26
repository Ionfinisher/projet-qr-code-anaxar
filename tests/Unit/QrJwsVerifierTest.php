<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Exceptions\QrScanException;
use App\Support\QrJwsVerifier;
use RuntimeException;
use Tests\TestCase;

class QrJwsVerifierTest extends TestCase
{
    private const NOW = 1800000000;

    private const HEADER = ['alg' => 'ES256', 'kid' => 'pf-2026'];

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('app.key', 'base64:cle-de-test-unitaire');
    }

    /**
     * @param  array<string, mixed>  $claims
     * @param  array<string, mixed>  $header
     */
    private function token(array $claims, array $header = self::HEADER): string
    {
        $h64 = self::encode((string) json_encode($header, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $p64 = self::encode((string) json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        return "{$h64}.{$p64}.".self::encode(hash_hmac('sha256', "{$h64}.{$p64}", 'base64:cle-de-test-unitaire', true));
    }

    /**
     * @return array<string, mixed>
     */
    private function validClaims(): array
    {
        return [
            'sub' => 'PF-A1B2C3',
            'nbf' => self::NOW - 100,
            'exp' => self::NOW + 100,
            'op' => 'IMP',
            'trm' => 'LCT',
            'slt' => '202601010800-1000',
            'dh' => ['aaaaaaaa', '', '', '', '', ''],
        ];
    }

    private function verifier(?int $now = self::NOW): QrJwsVerifier
    {
        return new QrJwsVerifier(fn (): int => $now ?? time());
    }

    private static function encode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public function test_a_valid_token_returns_its_claims_with_a_normalized_subject(): void
    {
        $claims = $this->validClaims();
        $claims['sub'] = 'pf-a1b2c3';

        $verified = $this->verifier()->verify($this->token($claims));

        $this->assertSame('PF-A1B2C3', $verified['sub']);
        $this->assertSame('IMP', $verified['op']);
        $this->assertSame($claims['dh'], $verified['dh']);
    }

    public function test_it_rejects_a_wrong_number_of_segments(): void
    {
        $this->expectException(QrScanException::class);
        $this->expectExceptionMessage('QR code invalide.');

        try {
            $this->verifier()->verify('abc.def');
        } catch (QrScanException $exception) {
            $this->assertSame(400, $exception->status);
            $this->assertSame('format', $exception->reason);

            throw $exception;
        }
    }

    public function test_it_rejects_a_non_canonical_base64url_segment(): void
    {
        $token = $this->token($this->validClaims());
        [$header, $payload, $signature] = explode('.', $token);

        try {
            $this->verifier()->verify("{$header}.{$payload}.{$signature}=");
            $this->fail('Le segment signé avec un padding doit être rejeté.');
        } catch (QrScanException $exception) {
            $this->assertSame('encoding', $exception->reason);
        }
    }

    public function test_it_rejects_a_non_json_payload(): void
    {
        $header = self::encode((string) json_encode(self::HEADER, JSON_THROW_ON_ERROR));
        $payload = self::encode('"pas-un-objet"');
        $signature = self::encode(hash_hmac('sha256', "{$header}.{$payload}", 'base64:cle-de-test-unitaire', true));

        try {
            $this->verifier()->verify("{$header}.{$payload}.{$signature}");
            $this->fail('Une charge utile JSON non objets doit être rejetée.');
        } catch (QrScanException $exception) {
            $this->assertSame('claims', $exception->reason);
        }
    }

    public function test_it_rejects_a_non_json_header(): void
    {
        $header = self::encode('pas-du-json');
        $payload = self::encode((string) json_encode($this->validClaims(), JSON_THROW_ON_ERROR));
        $signature = self::encode(hash_hmac('sha256', "{$header}.{$payload}", 'base64:cle-de-test-unitaire', true));

        try {
            $this->verifier()->verify("{$header}.{$payload}.{$signature}");
            $this->fail('Un header non JSON doit être rejeté.');
        } catch (QrScanException $exception) {
            $this->assertSame('header', $exception->reason);
        }
    }

    public function test_it_rejects_an_exp_given_as_a_string(): void
    {
        $claims = $this->validClaims();
        $claims['exp'] = (string) (self::NOW + 100);

        try {
            $this->verifier()->verify($this->token($claims));
            $this->fail('Une date d\'expiration sous forme de chaîne doit être rejetée.');
        } catch (QrScanException $exception) {
            $this->assertSame('claims', $exception->reason);
        }
    }

    public function test_it_requires_a_configured_app_key(): void
    {
        config()->set('app.key', '');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('APP_KEY doit être configurée pour vérifier les QR de rendez-vous.');

        $this->verifier()->verify($this->token($this->validClaims()));
    }

    public function test_it_rejects_an_unknown_algorithm_or_key_id(): void
    {
        foreach ([['alg' => 'RS256'], ['kid' => 'pf-2027']] as $override) {
            try {
                $this->verifier()->verify($this->token($this->validClaims(), array_merge(self::HEADER, $override)));
                $this->fail('Un header non autorisé doit être rejeté.');
            } catch (QrScanException $exception) {
                $this->assertSame('header', $exception->reason);
            }
        }
    }

    public function test_it_rejects_a_tampered_signature(): void
    {
        $token = $this->token($this->validClaims());
        [$header, $payload, $signature] = explode('.', $token);
        $tamperedSignature = $signature[0] === 'A' ? 'B'.$signature : 'A'.$signature;

        try {
            $this->verifier()->verify("{$header}.{$payload}.{$tamperedSignature}");
            $this->fail('Une signature altérée doit être rejetée.');
        } catch (QrScanException $exception) {
            $this->assertSame('signature', $exception->reason);
        }
    }

    public function test_it_rejects_a_future_nbf_a_past_exp_and_an_exp_equal_to_now(): void
    {
        $future = $this->validClaims();
        $future['nbf'] = self::NOW + 1;

        $past = $this->validClaims();
        $past['exp'] = self::NOW - 1;

        $equal = $this->validClaims();
        $equal['exp'] = self::NOW;

        foreach ([$future, $past, $equal] as $claims) {
            try {
                $this->verifier()->verify($this->token($claims));
                $this->fail('Une fenêtre de validité fermée doit être rejetée.');
            } catch (QrScanException $exception) {
                $this->assertSame('timing', $exception->reason);
            }
        }
    }

    public function test_it_rejects_a_malformed_subject(): void
    {
        foreach (['PF-12345', 'PF-GGGGGG', 'ABC123', 123, null] as $subject) {
            $claims = $this->validClaims();
            $claims['sub'] = $subject;

            try {
                $this->verifier()->verify($this->token($claims));
                $this->fail('Un identifiant mal formé doit être rejeté.');
            } catch (QrScanException $exception) {
                $this->assertSame('subject', $exception->reason);
            }
        }
    }
}
