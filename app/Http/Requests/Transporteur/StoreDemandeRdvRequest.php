<?php

namespace App\Http\Requests\Transporteur;

use App\Models\DemandeRdv;

class StoreDemandeRdvRequest extends DemandeRdvRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', DemandeRdv::class) ?? false;
    }
}
