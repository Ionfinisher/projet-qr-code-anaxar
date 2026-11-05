<?php

namespace App\Http\Requests\Transporteur;

use Illuminate\Foundation\Http\FormRequest;

class RejectDemandeRdvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:500'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
