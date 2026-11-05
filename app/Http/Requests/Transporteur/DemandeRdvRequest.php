<?php

namespace App\Http\Requests\Transporteur;

use App\Models\DemandeRdv;
use App\Models\PieceAFournir;
use App\Support\ContainerNumber;
use App\Support\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
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
        return [
            'op' => ['required', Rule::in(DemandeRdv::OPERATIONS)],
            'terminal' => ['required', Rule::in(DemandeRdv::TERMINALS)],
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

            'docs' => ['required', 'array'],
            'docs.bc' => ['required'],
            'docs.bf' => ['required'],
            'docs.as' => ['required'],
            'docs.vt' => ['required'],
            'docs.gp' => ['required'],
            'docs.ta' => ['required'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $data = $validator->getData();
            $operation = $data['op'] ?? null;
            $trucks = is_array($data['trucks'] ?? null) ? $data['trucks'] : [];

            $containers = [];
            $tractors = [];

            foreach ($trucks as $index => $truck) {
                if (! is_array($truck)) {
                    continue;
                }

                $driver = is_array($truck['driver'] ?? null) ? $truck['driver'] : [];
                $vehicle = is_array($truck['vehicle'] ?? null) ? $truck['vehicle'] : [];
                $containerData = is_array($truck['container'] ?? null) ? $truck['container'] : [];

                $phone = $driver['phone'] ?? null;
                if (! PhoneNumber::isValidE164(is_string($phone) ? $phone : null)) {
                    $validator->errors()->add(
                        "trucks.{$index}.driver.phone",
                        'Numéro de téléphone invalide (format international E.164).'
                    );
                }

                $license = $this->normalizeCode($driver['license'] ?? null);
                if (! $this->licenseValid($license)) {
                    $validator->errors()->add(
                        "trucks.{$index}.driver.license",
                        'N° de permis invalide : 5 à 20 lettres ou chiffres, dont au moins un chiffre.'
                    );
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
                }

                $container = ContainerNumber::normalize($containerData['number'] ?? '');
                if (! ($operation === 'MTP' && $container === '')) {
                    if (! ContainerNumber::isValid($container)) {
                        $validator->errors()->add(
                            "trucks.{$index}.container.number",
                            'Numéro de conteneur invalide (ISO 6346).'
                        );
                    } elseif (isset($containers[$container])) {
                        $validator->errors()->add(
                            "trucks.{$index}.container.number",
                            'Ce conteneur est déjà saisi pour un autre camion.'
                        );
                    } else {
                        $containers[$container] = true;
                    }
                }

                if (in_array($operation, ['IMP', 'EXP'], true)) {
                    $bl = $this->normalizeCode($containerData['bl'] ?? null);
                    if (strlen($bl) < 6 || strlen($bl) > 20) {
                        $validator->errors()->add(
                            "trucks.{$index}.container.bl",
                            'Numéro de connaissement requis (6 à 20 caractères).'
                        );
                    }

                    if (trim((string) ($containerData['goods'] ?? '')) === '') {
                        $validator->errors()->add(
                            "trucks.{$index}.container.goods",
                            'La marchandise est requise.'
                        );
                    }
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
            foreach (DemandeRdv::DOC_TYPES as $type) {
                $value = $docs[$type] ?? null;

                if (is_int($value)) {
                    continue;
                }

                if (! is_string($value) || (! ctype_digit($value) && ! Str::isUuid($value))) {
                    $validator->errors()->add("docs.{$type}", 'Référence de document invalide.');
                }
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
