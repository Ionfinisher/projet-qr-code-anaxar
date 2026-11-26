<?php

declare(strict_types=1);

namespace App\Support;

use App\Exceptions\QrScanException;
use Closure;
use RuntimeException;
use Throwable;

/**
 * Vérification pure des JWS QR : aucun accès base de données, aucune écriture.
 */
final class QrJwsVerifier
{
    public const ALGORITHM = 'ES256';

    public const KEY_ID = 'pf-2026';

    private readonly Closure $clock;

    /**
     * @param  callable(): int|null  $clock
     */
    public function __construct(?callable $clock = null)
    {
        $this->clock = $clock === null
            ? static fn (): int => time()
            : Closure::fromCallable($clock);
    }

    /**
     * @return array<string, mixed>
     */
    public function verify(string $token): array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            throw QrScanException::invalid('format');
        }

        [$headerSegment, $payloadSegment, $signatureSegment] = $parts;

        // Le header est décodé avant la signature : cela permet de refuser un
        // algorithme non autorisé sans donner d'information sur la clé.
        $header = $this->decodeJson($headerSegment, 'header');
        $claims = $this->decodeJson($payloadSegment, 'claims');
        $signature = $this->decodeBase64Url($signatureSegment);

        if (($header['alg'] ?? null) !== self::ALGORITHM || ($header['kid'] ?? null) !== self::KEY_ID) {
            throw QrScanException::invalid('header');
        }

        $signingKey = (string) config('app.key');
        if ($signingKey === '') {
            throw new RuntimeException('APP_KEY doit être configurée pour vérifier les QR de rendez-vous.');
        }

        $expected = hash_hmac('sha256', "{$headerSegment}.{$payloadSegment}", $signingKey, true);
        if (! hash_equals($expected, $signature)) {
            throw QrScanException::invalid('signature');
        }

        if (! isset($claims['nbf'], $claims['exp']) || ! is_int($claims['nbf']) || ! is_int($claims['exp'])) {
            throw QrScanException::invalid('claims');
        }

        $now = (int) ($this->clock)();
        if ($now < $claims['nbf'] || $now >= $claims['exp']) {
            throw QrScanException::invalid('timing');
        }

        $subject = RdvId::normalize(isset($claims['sub']) && is_string($claims['sub']) ? $claims['sub'] : null);
        if ($subject === null) {
            throw QrScanException::invalid('subject');
        }

        $claims['sub'] = $subject;

        return $claims;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJson(string $segment, string $reason): array
    {
        $json = $this->decodeBase64Url($segment);

        try {
            $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            throw QrScanException::invalid($reason);
        }

        if (! is_array($decoded)) {
            throw QrScanException::invalid($reason);
        }

        /** @var array<string, mixed> $decoded */
        return $decoded;
    }

    private function decodeBase64Url(string $segment): string
    {
        if ($segment === '' || preg_match('/^[A-Za-z0-9_-]+\z/', $segment) !== 1) {
            throw QrScanException::invalid('encoding');
        }

        $decoded = base64_decode(strtr($segment, '-_', '+/'), true);

        if ($decoded === false || $this->encodeBase64Url($decoded) !== $segment) {
            throw QrScanException::invalid('encoding');
        }

        return $decoded;
    }

    private function encodeBase64Url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
