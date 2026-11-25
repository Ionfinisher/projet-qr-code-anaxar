<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\DemandeCamion;
use App\Models\DemandeRdv;

/**
 * Identifiant court d'un rendez-vous, dérivé de la référence et de la position finale.
 */
final class RdvId
{
    public const PREFIX = 'PF-';

    public const PATTERN = '/^PF-[0-9A-F]{6}$/';

    public static function for(DemandeCamion $camion, DemandeRdv $demande): string
    {
        return self::PREFIX.strtoupper(substr(md5("{$demande->reference}-{$camion->id}-{$camion->position}"), 0, 6));
    }

    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $candidate = strtoupper(trim($value));

        return preg_match(self::PATTERN, $candidate) === 1 ? $candidate : null;
    }
}
