<?php

namespace App\Http\Requests\Transporteur;

use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use Illuminate\Validation\Validator;

class ResubmitDemandeCamionRequest extends DemandeRdvRequest
{
    public function authorize(): bool
    {
        $demande = $this->route('demande');
        $camion = $this->route('camion');

        return $demande instanceof DemandeRdv
            && $camion instanceof DemandeCamion
            && $this->user()?->can('updateTruck', [$demande, $camion]);
    }

    public function withValidator(Validator $validator): void
    {
        parent::withValidator($validator);

        $validator->after(function (Validator $validator) {
            $camion = $this->route('camion');
            $trucks = $this->input('trucks', []);
            $truck = is_array($trucks) ? reset($trucks) : null;

            if (! $camion instanceof DemandeCamion
                || ! is_array($truck)
                || count($trucks) !== 1
                || (int) ($truck['rdvId'] ?? 0) !== $camion->id
                || (string) ($truck['key'] ?? '') !== (string) $camion->id) {
                $validator->errors()->add('trucks', 'Le camion à corriger ne correspond pas à cette demande.');
            }
        });
    }
}
