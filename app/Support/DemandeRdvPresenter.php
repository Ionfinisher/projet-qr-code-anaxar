<?php

namespace App\Support;

use App\Models\DemandeCamion;
use App\Models\DemandeDocument;
use App\Models\DemandeEvenement;
use App\Models\DemandeRdv;
use App\Models\User;

final class DemandeRdvPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function summary(DemandeRdv $demande, ?User $viewer = null): array
    {
        $demande->loadMissing('creneau');

        return [
            'id' => $demande->reference,
            'reference' => $demande->reference,
            'status' => $demande->status,
            'operation' => $demande->operation,
            'terminal' => $demande->terminal,
            'slot' => self::slot($demande),
            'trucks_count' => $demande->trucks_count,
            'submitted_at' => $demande->submitted_at?->toIso8601String(),
            'updated_at' => $demande->updated_at?->toIso8601String(),
            'can_modify' => $viewer ? $viewer->can('update', $demande) : false,
            'can_cancel' => $viewer ? $viewer->can('cancel', $demande) : false,
        ];
    }

    /**
     * @param  array{capacity: int, pending: int, approved: int, used: int, remaining: int, rate: float}  $usage
     * @return array<string, mixed>
     */
    public static function detail(DemandeRdv $demande, User $viewer, array $usage): array
    {
        $demande->loadMissing([
            'creneau',
            'camions',
            'documents',
            'evenements.actor',
            'decideur',
        ]);

        $documents = $demande->documents
            ->keyBy('type')
            ->map(fn (DemandeDocument $document) => self::document($demande, $document))
            ->all();

        return array_merge(self::summary($demande, $viewer), [
            'notes' => $demande->notes,
            'transitaire' => $demande->transitaire,
            'mandated' => self::mandated($demande),
            'trucks' => $demande->camions
                ->map(fn (DemandeCamion $camion) => self::truck($camion))
                ->values()
                ->all(),
            'documents' => $documents,
            'history' => $demande->evenements
                ->sortBy('created_at')
                ->values()
                ->map(fn (DemandeEvenement $evenement) => [
                    'type' => $evenement->type,
                    'at' => $evenement->created_at?->toIso8601String(),
                    'by' => $evenement->actor?->name,
                    'detail' => $evenement->detail,
                ])
                ->all(),
            'decision' => $demande->decided_at ? [
                'at' => $demande->decided_at->toIso8601String(),
                'by' => $demande->decideur?->name,
                'comment' => $demande->decision_comment,
                'reason' => $demande->rejection_reason,
            ] : null,
            'cancelled_at' => $demande->cancelled_at?->toIso8601String(),
            'cancel_reason' => $demande->cancel_reason,
            'usage' => $usage,
        ]);
    }

    /**
     * Données du formulaire d'édition (mêmes clés que le formulaire frontend).
     *
     * @return array<string, mixed>
     */
    public static function form(DemandeRdv $demande): array
    {
        $demande->loadMissing(['creneau', 'camions', 'documents']);

        return [
            'reference' => $demande->reference,
            'status' => $demande->status,
            'op' => $demande->operation,
            'terminal' => $demande->terminal,
            'date' => $demande->creneau->date->format('Y-m-d'),
            'start' => $demande->creneau->start,
            'notes' => $demande->notes ?? '',
            'transitaire' => $demande->transitaire ?? '',
            'mandated' => [
                'type' => $demande->mandated_type ?? 'entreprise',
                'company' => $demande->mandated_company ?? '',
                'first' => $demande->mandated_first ?? '',
                'last' => $demande->mandated_last ?? '',
                'phone' => $demande->mandated_phone ?? '',
            ],
            'trucks' => $demande->camions
                ->map(fn (DemandeCamion $camion) => self::truck($camion))
                ->values()
                ->all(),
            'docs' => $demande->documents
                ->keyBy('type')
                ->map(fn (DemandeDocument $document) => self::document($demande, $document))
                ->all(),
        ];
    }

    /**
     * @return array{date: string, start: string, end: string}
     */
    public static function slot(DemandeRdv $demande): array
    {
        return [
            'date' => $demande->creneau->date->format('Y-m-d'),
            'start' => $demande->creneau->start,
            'end' => $demande->creneau->end,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function truck(DemandeCamion $camion): array
    {
        return [
            'id' => $camion->id,
            'position' => $camion->position,
            'driver' => [
                'first' => $camion->driver_first,
                'last' => $camion->driver_last,
                'phone' => $camion->driver_phone,
                'license' => $camion->driver_license,
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
                'goods' => $camion->container_goods,
                'vgm' => $camion->container_vgm,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function document(DemandeRdv $demande, DemandeDocument $document): array
    {
        return [
            'id' => $document->id,
            'name' => $document->original_name,
            'size' => $document->size,
            'mime' => $document->mime,
            'sha256' => $document->sha256,
            'url' => route('transporteur.demandes.documents.download', [$demande, $document]),
        ];
    }

    /**
     * @return array<string, string|null>
     */
    public static function mandated(DemandeRdv $demande): array
    {
        return [
            'type' => $demande->mandated_type,
            'company' => $demande->mandated_company,
            'first' => $demande->mandated_first,
            'last' => $demande->mandated_last,
            'phone' => $demande->mandated_phone,
        ];
    }
}
