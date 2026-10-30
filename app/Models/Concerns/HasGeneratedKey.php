<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Génère automatiquement une clé métier unique (type UUID) à la création
 * du modèle, sans exposer de logique de génération dans les contrôleurs.
 */
trait HasGeneratedKey
{
    protected static function bootHasGeneratedKey(): void
    {
        static::creating(function ($model) {
            $column = $model->keyColumn ?? null;

            if ($column !== null && empty($model->{$column})) {
                $model->{$column} = (string) Str::uuid();
            }
        });
    }
}
