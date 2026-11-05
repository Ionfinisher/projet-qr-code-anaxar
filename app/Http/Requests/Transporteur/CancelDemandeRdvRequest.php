<?php

namespace App\Http\Requests\Transporteur;

use Illuminate\Foundation\Http\FormRequest;

class CancelDemandeRdvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cancel', $this->route('demande')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:500'],
        ];
    }
}
