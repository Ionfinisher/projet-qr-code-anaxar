<?php

namespace App\Http\Requests\Transporteur;

use App\Models\DemandeRdv;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTemporaryUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', DemandeRdv::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(DemandeRdv::DOC_TYPES)],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
        ];
    }
}
