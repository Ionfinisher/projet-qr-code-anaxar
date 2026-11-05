<?php

namespace App\Http\Requests\Transporteur;

class UpdateDemandeRdvRequest extends DemandeRdvRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('demande')) ?? false;
    }
}
