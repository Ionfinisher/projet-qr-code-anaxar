<?php

namespace App\Support;

/**
 * Numéros E.164 du corridor Lomé – Sahel, alignés sur le référentiel frontend.
 */
final class PhoneNumber
{
    /**
     * @var array<string, array{dial: string, digits: int}>
     */
    public const COUNTRIES = [
        'TG' => ['dial' => '228', 'digits' => 8],
        'BJ' => ['dial' => '229', 'digits' => 10],
        'BF' => ['dial' => '226', 'digits' => 8],
        'ML' => ['dial' => '223', 'digits' => 8],
        'NE' => ['dial' => '227', 'digits' => 8],
        'GH' => ['dial' => '233', 'digits' => 9],
        'CI' => ['dial' => '225', 'digits' => 10],
    ];

    public static function isValidE164(?string $value): bool
    {
        if (! is_string($value)) {
            return false;
        }

        $value = trim($value);

        if (preg_match('/^\+[1-9][0-9]{5,15}$/', $value) !== 1) {
            return false;
        }

        foreach (self::COUNTRIES as $country) {
            $prefix = '+'.$country['dial'];

            if (! str_starts_with($value, $prefix)) {
                continue;
            }

            $local = substr($value, strlen($prefix));

            return strlen($local) === $country['digits'] && ctype_digit($local);
        }

        return false;
    }

    public static function countryFor(?string $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        foreach (self::COUNTRIES as $code => $country) {
            if (str_starts_with($value, '+'.$country['dial'])) {
                return $code;
            }
        }

        return null;
    }
}
