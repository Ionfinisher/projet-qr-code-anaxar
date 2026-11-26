<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Référentiel des postes de contrôle mobile, aligné sur DemandeRdv::DOC_TYPES
 * et sur le front historique (resources/js/Lib/domain.js, constante DOCS).
 */
final class Poste
{
    public const POSTE_BC = 1;

    public const POSTE_BF = 2;

    public const POSTE_AS = 3;

    public const POSTE_VT = 4;

    public const POSTE_GP = 5;

    public const POSTE_TA = 6;

    public const MAP = [
        self::POSTE_BC => ['key' => 'bc', 'label' => 'Bon de chargement'],
        self::POSTE_BF => ['key' => 'bf', 'label' => 'Bon de fret'],
        self::POSTE_AS => ['key' => 'as', 'label' => 'Assurance'],
        self::POSTE_VT => ['key' => 'vt', 'label' => 'Visite technique'],
        self::POSTE_GP => ['key' => 'gp', 'label' => 'Gate pass'],
        self::POSTE_TA => ['key' => 'ta', 'label' => 'Terminal access'],
    ];

    /**
     * @return array<int, array{key: string, label: string}>
     */
    public static function all(): array
    {
        return self::MAP;
    }

    public static function keyFor(int $poste): ?string
    {
        return self::MAP[$poste]['key'] ?? null;
    }

    public static function posteFor(string $key): ?int
    {
        foreach (self::MAP as $poste => $data) {
            if ($data['key'] === $key) {
                return $poste;
            }
        }

        return null;
    }

    /**
     * Accepte un numéro de poste ou sa clé (insensible à la casse), tels que
     * reçus d'un client mobile.
     */
    public static function normalize(int|string $value): ?int
    {
        if (is_int($value)) {
            return isset(self::MAP[$value]) ? $value : null;
        }

        if (ctype_digit($value)) {
            return self::normalize((int) $value);
        }

        return self::posteFor(strtolower($value));
    }

    /**
     * @throws InvalidArgumentException Si le poste n'existe pas.
     */
    public static function labelFor(int $poste): string
    {
        if (! isset(self::MAP[$poste])) {
            throw new InvalidArgumentException("Poste inconnu : {$poste}");
        }

        return self::MAP[$poste]['label'];
    }
}
