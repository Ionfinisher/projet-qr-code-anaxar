<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Numéro de conteneur ISO 6346 : 4 lettres (dont U, J ou Z en 4e position)
 * suivies de 6 chiffres de série et d'un chiffre de contrôle.
 */
final class ContainerNumber
{
    private const PATTERN = '/^[A-Z]{3}[UJZ][0-9]{7}$/';

    public static function normalize(string $value): string
    {
        return (string) preg_replace('/[^A-Z0-9]/', '', strtoupper($value));
    }

    public static function isValid(string $value): bool
    {
        $raw = self::normalize($value);

        if (strlen($raw) !== 11 || preg_match(self::PATTERN, $raw) !== 1) {
            return false;
        }

        return (int) $raw[10] === self::checkDigit(substr($raw, 0, 10));
    }

    public static function checkDigit(string $code): int
    {
        $code = self::normalize($code);

        if (strlen($code) !== 10) {
            throw new InvalidArgumentException('Le code conteneur doit contenir 10 caractères.');
        }

        $sum = 0;

        for ($i = 0; $i < 10; $i++) {
            $char = $code[$i];
            $value = ctype_digit($char) ? (int) $char : self::letterValue($char);
            $sum += $value * (2 ** $i);
        }

        return ($sum % 11) % 10;
    }

    private static function letterValue(string $letter): int
    {
        $values = self::letterValues();

        if (! isset($values[$letter])) {
            throw new InvalidArgumentException("Caractère invalide dans le code conteneur : {$letter}.");
        }

        return $values[$letter];
    }

    /**
     * @return array<string, int>
     */
    private static function letterValues(): array
    {
        static $values = null;

        if ($values === null) {
            $values = [];
            $value = 10;

            foreach (range('A', 'Z') as $letter) {
                if ($value % 11 === 0) {
                    $value++;
                }

                $values[$letter] = $value++;
            }
        }

        return $values;
    }
}
