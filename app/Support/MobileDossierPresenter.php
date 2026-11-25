<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\DemandeCamion;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;

/**
 * Dossier de rendez-vous exposé au scan mobile, strictement en lecture seule.
 */
final class MobileDossierPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function dossier(DemandeCamion $camion, DemandeRdv $demande): array
    {
        $documents = $camion->relationLoaded('documents')
            ? $camion->documents
            : $camion->documents()->get();
        $documentsByType = $documents->keyBy('type');

        $presentedDocuments = [];
        $checks = [];

        foreach (DemandeRdv::DOC_TYPES as $type) {
            $document = $documentsByType->get($type);
            $poste = Poste::posteFor($type);
            $check = $document instanceof DemandeDocument ? self::check($document) : null;

            $presentedDocuments[] = [
                'poste' => $poste,
                'type' => $type,
                'label' => $poste !== null ? Poste::labelFor($poste) : null,
                'id' => $document?->id,
                'name' => $document?->original_name,
                'mime' => $document?->mime,
                'sha256' => $document?->sha256,
                'check' => $check,
            ];

            $checks[$type] = $check;
        }

        return [
            'rdv_id' => RdvId::for($camion, $demande),
            'demande' => [
                'reference' => $demande->reference,
                'status' => $demande->status,
                'operation' => $demande->operation,
                'terminal' => $demande->terminal,
                'slot' => [
                    'date' => $demande->creneau?->date?->format('Y-m-d'),
                    'start' => $demande->creneau?->start,
                    'end' => $demande->creneau?->end,
                ],
                'submitted_at' => $demande->submitted_at?->toIso8601String(),
                'decided_at' => $demande->decided_at?->toIso8601String(),
            ],
            'truck' => [
                'camion_id' => $camion->id,
                'position' => $camion->position,
                'driver' => [
                    'first' => $camion->driver_first,
                    'last' => $camion->driver_last,
                ],
                'vehicle' => [
                    'country' => $camion->vehicle_country,
                    'tractor' => $camion->vehicle_tractor,
                    'trailer' => $camion->vehicle_trailer,
                ],
                'container' => [
                    'number' => $camion->container_number,
                    'iso' => $camion->container_iso,
                    'bl' => $camion->container_bl,
                ],
            ],
            'documents' => $presentedDocuments,
            'checks' => $checks,
        ];
    }

    /**
     * @return array{result: string|null, at: string|null, by: string|null, note: string|null}|null
     */
    private static function check(DemandeDocument $document): ?array
    {
        if ($document->check_result === null) {
            return null;
        }

        return [
            'result' => $document->check_result,
            'at' => $document->checked_at?->toIso8601String(),
            'by' => $document->checker?->name,
            'note' => $document->check_note,
        ];
    }
}
