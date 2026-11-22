<?php

namespace App\Http\Requests\Transporteur;

use App\Models\DemandeRdv;
use App\Models\PieceAFournir;
use App\Support\ContainerNumber;
use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class DemandeRdvRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = [
            'op' => ['required', Rule::in(DemandeRdv::OPERATIONS)],
            'terminal' => ['required', 'string', 'max:20'],
            'date' => ['required', 'date_format:Y-m-d'],
            'start' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'transitaire' => ['nullable', 'string', 'max:255'],

            'mandated' => ['nullable', 'array'],
            'mandated.type' => ['nullable', Rule::in(['entreprise', 'particulier'])],
            'mandated.company' => ['nullable', 'string', 'max:255'],
            'mandated.first' => ['nullable', 'string', 'max:80'],
            'mandated.last' => ['nullable', 'string', 'max:80'],
            'mandated.phone' => ['nullable', 'string', 'max:20'],

            'trucks' => ['required', 'array', 'min:1', 'max:20'],
            'trucks.*.key' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+\z/'],
            'trucks.*.rdvId' => ['nullable', 'integer'],
            'trucks.*.driver.first' => ['required', 'string', 'max:80'],
            'trucks.*.driver.last' => ['required', 'string', 'max:80'],
            'trucks.*.driver.phone' => ['required', 'string', 'max:20'],
            'trucks.*.driver.license' => ['required', 'string', 'max:24'],
            'trucks.*.vehicle.country' => [
                'required',
                'string',
                'size:2',
                Rule::in(array_keys(PhoneNumber::COUNTRIES)),
            ],
            'trucks.*.vehicle.tractor' => ['required', 'string', 'max:20'],
            'trucks.*.vehicle.trailer' => ['nullable', 'string', 'max:20'],
            'trucks.*.container.number' => ['nullable', 'string', 'max:11'],
            'trucks.*.container.iso' => [
                'required',
                'string',
                'size:4',
                Rule::in(DemandeRdv::CONTAINER_ISO_TYPES),
            ],
            'trucks.*.container.bl' => ['nullable', 'string', 'max:24'],
            'trucks.*.container.goods' => ['nullable', 'string', 'max:255'],
            'trucks.*.container.vgm' => ['nullable', 'integer', 'between:1000,45000'],

            'docs' => ['required', 'array', 'min:1'],
            'docs.*' => ['required', 'array', 'size:'.count(DemandeRdv::DOC_TYPES)],
        ];

        foreach (DemandeRdv::DOC_TYPES as $type) {
            $rules["docs.*.{$type}"] = ['required'];
        }

        return $rules;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $data = $validator->getData();
            $operation = $data['op'] ?? null;
            $trucks = is_array($data['trucks'] ?? null) ? $data['trucks'] : [];

            $demande = $this->route('demande');
            $validRdvIds = $demande instanceof DemandeRdv
                ? $demande->camions()->pluck('id')->map(fn ($id) => (int) $id)->all()
                : [];
            $seenRdvIds = [];

            $containers = [];
            $tractors = [];
            $trailers = [];
            $phones = [];
            $licenses = [];
            $bls = [];

            foreach ($trucks as $index => $truck) {
                if (! is_array($truck)) {
                    continue;
                }

                $rawRdvId = $truck['rdvId'] ?? null;
                $rdvId = is_numeric($rawRdvId) ? (int) $rawRdvId : null;

                if ($rdvId !== null) {
                    if (isset($seenRdvIds[$rdvId])) {
                        $validator->errors()->add("trucks.{$index}.rdvId", 'Ce camion est référencé plusieurs fois.');
                    }

                    $seenRdvIds[$rdvId] = true;

                    if (! in_array($rdvId, $validRdvIds, true)) {
                        $validator->errors()->add(
                            "trucks.{$index}.rdvId",
                            'Ce camion ne fait pas partie de cette demande.'
                        );
                    }
                }

                $driver = is_array($truck['driver'] ?? null) ? $truck['driver'] : [];
                $vehicle = is_array($truck['vehicle'] ?? null) ? $truck['vehicle'] : [];
                $containerData = is_array($truck['container'] ?? null) ? $truck['container'] : [];

                $phone = is_string($driver['phone'] ?? null) ? trim($driver['phone']) : null;
                if (! PhoneNumber::isValidE164($phone)) {
                    $validator->errors()->add(
                        "trucks.{$index}.driver.phone",
                        'Numéro de téléphone invalide (format international E.164).'
                    );
                } elseif (isset($phones[$phone])) {
                    $validator->errors()->add(
                        "trucks.{$index}.driver.phone",
                        'Ce numéro de téléphone est déjà utilisé pour un autre camion.'
                    );
                } else {
                    $phones[$phone] = true;
                }

                $license = $this->normalizeCode($driver['license'] ?? null);
                if (! $this->licenseValid($license)) {
                    $validator->errors()->add(
                        "trucks.{$index}.driver.license",
                        'N° de permis invalide : 5 à 20 lettres ou chiffres, dont au moins un chiffre.'
                    );
                } elseif (isset($licenses[$license])) {
                    $validator->errors()->add(
                        "trucks.{$index}.driver.license",
                        'Ce n° de permis est déjà utilisé pour un autre camion.'
                    );
                } else {
                    $licenses[$license] = true;
                }

                $tractor = $this->normalizePlate($vehicle['tractor'] ?? null);
                if (! $this->plateValid($tractor)) {
                    $validator->errors()->add(
                        "trucks.{$index}.vehicle.tractor",
                        'Immatriculation du tracteur invalide (4 à 12 caractères, au moins un chiffre).'
                    );
                } elseif (isset($tractors[$tractor])) {
                    $validator->errors()->add(
                        "trucks.{$index}.vehicle.tractor",
                        'Ce tracteur est déjà utilisé pour un autre camion.'
                    );
                } else {
                    $tractors[$tractor] = true;
                }

                $trailer = $this->normalizePlate($vehicle['trailer'] ?? null);
                if ($trailer !== '' && ! $this->plateValid($trailer)) {
                    $validator->errors()->add(
                        "trucks.{$index}.vehicle.trailer",
                        'Immatriculation de la remorque invalide.'
                    );
                } elseif ($trailer !== '' && isset($trailers[$trailer])) {
                    $validator->errors()->add(
                        "trucks.{$index}.vehicle.trailer",
                        'Cette remorque est déjà utilisée pour un autre camion.'
                    );
                } elseif ($trailer !== '') {
                    $trailers[$trailer] = true;
                }

                $container = ContainerNumber::normalize($containerData['number'] ?? '');

                if ($container === '') {
                    // Le numéro de conteneur est requis, sauf pour un retrait de vide (attribué par le terminal).
                    if ($operation !== 'MTP') {
                        $validator->errors()->add(
                            "trucks.{$index}.container.number",
                            'Numéro de conteneur requis.'
                        );
                    }
                } elseif (isset($containers[$container])) {
                    $validator->errors()->add(
                        "trucks.{$index}.container.number",
                        'Ce conteneur est déjà saisi pour un autre camion.'
                    );
                } else {
                    $containers[$container] = true;
                }

                $bl = $this->normalizeCode($containerData['bl'] ?? null);
                if (in_array($operation, ['IMP', 'EXP'], true) && $bl === '') {
                    $validator->errors()->add(
                        "trucks.{$index}.container.bl",
                        'Numéro de connaissement requis.'
                    );
                } elseif ($bl !== '' && isset($bls[$bl])) {
                    $validator->errors()->add(
                        "trucks.{$index}.container.bl",
                        'Ce n° de connaissement est déjà utilisé pour un autre camion.'
                    );
                } elseif ($bl !== '') {
                    $bls[$bl] = true;
                }

                if (in_array($operation, ['IMP', 'EXP'], true) && trim((string) ($containerData['goods'] ?? '')) === '') {
                    $validator->errors()->add(
                        "trucks.{$index}.container.goods",
                        'La marchandise est requise.'
                    );
                }
            }

            if ($this->user()?->user_type === PieceAFournir::TYPE_TRANSITAIRE) {
                $mandated = is_array($data['mandated'] ?? null) ? $data['mandated'] : [];
                $type = $mandated['type'] ?? null;

                if (! in_array($type, ['entreprise', 'particulier'], true)) {
                    $validator->errors()->add('mandated.type', 'Indiquez le type de transporteur mandaté.');
                } elseif ($type === 'entreprise' && trim((string) ($mandated['company'] ?? '')) === '') {
                    $validator->errors()->add('mandated.company', 'Indiquez le transporteur mandaté.');
                } elseif ($type === 'particulier'
                    && (trim((string) ($mandated['first'] ?? '')) === ''
                        || trim((string) ($mandated['last'] ?? '')) === '')) {
                    $validator->errors()->add('mandated.first', 'Indiquez le prénom et le nom du transporteur mandaté.');
                }

                $phone = $mandated['phone'] ?? null;
                if (! PhoneNumber::isValidE164(is_string($phone) ? $phone : null)) {
                    $validator->errors()->add(
                        'mandated.phone',
                        'Numéro de téléphone du transporteur mandaté invalide.'
                    );
                }
            }

            $docs = is_array($data['docs'] ?? null) ? $data['docs'] : [];
            $truckKeys = [];

            foreach ($trucks as $index => $truck) {
                $key = is_array($truck) ? ($truck['key'] ?? null) : null;

                if (! is_string($key) || $key === '') {
                    continue;
                }

                if (isset($truckKeys[$key])) {
                    $validator->errors()->add("trucks.{$index}.key", 'Clé de camion dupliquée.');
                }

                $truckKeys[$key] = true;
            }

            foreach ($docs as $truckKey => $truckDocs) {
                if (! isset($truckKeys[$truckKey])) {
                    $validator->errors()->add("docs.{$truckKey}", 'Ce camion ne fait pas partie de la demande.');

                    continue;
                }

                if (! is_array($truckDocs)) {
                    $validator->errors()->add("docs.{$truckKey}", 'Documents invalides pour ce camion.');

                    continue;
                }

                foreach (DemandeRdv::DOC_TYPES as $type) {
                    $value = $truckDocs[$type] ?? null;

                    if (is_int($value)) {
                        continue;
                    }

                    if (! is_string($value) || (! ctype_digit($value) && ! Str::isUuid($value))) {
                        $validator->errors()->add("docs.{$truckKey}.{$type}", 'Référence de document invalide.');
                    }
                }
            }

            foreach (array_keys($truckKeys) as $key) {
                foreach (DemandeRdv::DOC_TYPES as $type) {
                    if (! isset($docs[$key]) || ! is_array($docs[$key]) || ! isset($docs[$key][$type])) {
                        $validator->errors()->add("docs.{$key}.{$type}", 'Ce document est obligatoire.');
                    }
                }
            }

            if ($validator->errors()->isNotEmpty()) {
                Log::warning('DemandeRdv: validation échouée', [
                    'errors' => $validator->errors()->toArray(),
                    'trucks' => array_keys($trucks),
                    'docs_keys' => array_keys($docs),
                ]);
            }
        });
    }

    private function normalizeCode(?string $value): string
    {
        return (string) preg_replace('/[^A-Z0-9]/', '', Str::upper((string) $value));
    }

    private function licenseValid(string $value): bool
    {
        return strlen($value) >= 5
            && strlen($value) <= 20
            && preg_match('/[0-9]/', $value) === 1;
    }

    private function normalizePlate(?string $value): string
    {
        $value = (string) preg_replace('/[^A-Z0-9 -]/', '', Str::upper((string) $value));
        $value = (string) preg_replace('/\s+/', ' ', $value);

        return trim($value);
    }

    private function plateValid(string $value): bool
    {
        $core = (string) preg_replace('/[^A-Z0-9]/', '', $value);

        return strlen($core) >= 4
            && strlen($core) <= 12
            && preg_match('/[0-9]/', $core) === 1;
    }
}
