<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Support\Poste;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class ScanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'token' => [
                'required',
                'string',
                'max:4096',
                'regex:/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/',
            ],
            'poste' => [
                'sometimes',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ((! is_int($value) && ! is_string($value)) || Poste::normalize($value) === null) {
                        $fail('Le poste demandé est invalide.');
                    }
                },
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'token.required' => 'Le token QR est requis.',
            'token.string' => 'Le token QR est invalide.',
            'token.max' => 'Le token QR est invalide.',
            'token.regex' => 'Le token QR est invalide.',
        ];
    }

    public function poste(): ?int
    {
        $value = $this->validated('poste');

        return is_int($value) || is_string($value) ? Poste::normalize($value) : null;
    }
}
