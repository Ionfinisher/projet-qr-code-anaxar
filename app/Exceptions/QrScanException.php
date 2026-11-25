<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Erreur métier d'un scan QR, traduite en réponse HTTP par le contrôleur.
 */
final class QrScanException extends RuntimeException
{
    private function __construct(string $message, public readonly int $status, public readonly ?string $reason)
    {
        parent::__construct($message);
    }

    public static function invalid(string $reason): self
    {
        return new self('QR code invalide.', 400, $reason);
    }

    public static function notFound(): self
    {
        return new self('Dossier introuvable.', 404, null);
    }

    public static function ambiguous(): self
    {
        return new self('Identifiant QR ambigu.', 422, 'ambiguous');
    }
}
