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
            'user',
        ]);

        $documents = $demande->documents
            ->keyBy('type')
            ->map(fn (DemandeDocument $document) => self::document($demande, $document, $viewer))
            ->all();

        $mandated = self::mandated($demande);

        return array_merge(self::summary($demande, $viewer), [
            'op' => $demande->operation,
            'submittedAt' => $demande->submitted_at?->toIso8601String(),
            'updatedAt' => $demande->updated_at?->toIso8601String(),
            'notes' => $demande->notes,
            'transitaire' => $demande->transitaire,
            'mandated' => $mandated,
            'transporter' => $mandated,
            'owner' => $demande->user ? [
                'id' => $demande->user->id,
                'name' => $demande->user->name ?: trim(($demande->user->prenom ?? '').' '.($demande->user->nom ?? '')),
                'company' => $demande->user->raisonsociale,
                'email' => $demande->user->email,
                'phone' => $demande->user->telephone,
                'acct' => $demande->user->user_type,
                'active' => in_array($demande->user->statut, ['approved', 'active'], true) || ! $demande->user->statut,
            ] : null,
            'trucks' => $demande->camions
                ->map(fn (DemandeCamion $camion) => self::truck($camion, $demande))
                ->values()
                ->all(),
            'rdvs' => $demande->isApproved()
                ? $demande->camions->map(fn (DemandeCamion $camion) => self::rdv($camion, $demande))->values()->all()
                : [],
            'documents' => $documents,
            'docs' => $documents,
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
                'byName' => $demande->decideur?->name,
                'comment' => $demande->decision_comment,
                'reason' => $demande->rejection_reason,
                'motif' => $demande->rejection_reason,
            ] : null,
            'cancelled_at' => $demande->cancelled_at?->toIso8601String(),
            'cancelledAt' => $demande->cancelled_at?->toIso8601String(),
            'cancel_reason' => $demande->cancel_reason,
            'cancelMotif' => $demande->cancel_reason,
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
                ->map(fn (DemandeCamion $camion) => self::truck($camion, $demande))
                ->values()
                ->all(),
            'rdvs' => $demande->isApproved()
                ? $demande->camions->map(fn (DemandeCamion $camion) => self::rdv($camion, $demande))->values()->all()
                : [],
            'docs' => $demande->documents
                ->keyBy('type')
                ->map(fn (DemandeDocument $document) => self::document($demande, $document))
                ->all(),
        ];
    }

    /**
     * @return array{id: int|null, date: string|null, start: string|null, end: string|null, capacity: int, open: bool}
     */
    public static function slot(DemandeRdv $demande): array
    {
        return [
            'id' => $demande->creneau?->id,
            'date' => $demande->creneau?->date?->format('Y-m-d'),
            'start' => $demande->creneau?->start,
            'end' => $demande->creneau?->end,
            'capacity' => $demande->creneau?->capacity ?? 40,
            'open' => (bool) ($demande->creneau?->open ?? true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function truck(DemandeCamion $camion, ?DemandeRdv $demande = null): array
    {
        $demande = $demande ?? ($camion->relationLoaded('demande') ? $camion->demande : null);
        $rdvId = $demande ? 'PF-' . strtoupper(substr(md5("{$demande->reference}-{$camion->id}-{$camion->position}"), 0, 6)) : null;
        $token = ($demande && $demande->isApproved()) ? self::generateToken($demande, $camion) : null;

        return [
            'id' => $camion->id,
            'rdv_id' => $rdvId,
            'token' => $token,
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
    public static function rdv(DemandeCamion $camion, ?DemandeRdv $demande = null): array
    {
        $demande = $demande ?? $camion->demande;
        $demande->loadMissing(['creneau', 'user', 'documents']);

        $rdvId = 'PF-' . strtoupper(substr(md5("{$demande->reference}-{$camion->id}-{$camion->position}"), 0, 6));
        $token = self::generateToken($demande, $camion);

        $docsMap = $demande->documents->keyBy('type')->map(fn (DemandeDocument $doc) => [
            'id' => $doc->id,
            'name' => $doc->original_name,
            'size' => $doc->size,
            'sha256' => $doc->sha256,
            'mime' => $doc->mime,
        ])->all();

        return [
            'id' => $rdvId,
            'camion_id' => $camion->id,
            'demandeId' => $demande->reference,
            'lot' => $demande->trucks_count > 1 ? $demande->reference : null,
            'lotIndex' => $camion->position,
            'lotSize' => $demande->trucks_count,
            'status' => 'confirme',
            'validation' => $demande->status === 'validee' ? 'approved' : ($demande->status === 'rejetee' ? 'rejected' : 'pending'),
            'createdAt' => $demande->submitted_at?->toIso8601String() ?? now()->toIso8601String(),
            'issuedAt' => $demande->decided_at?->toIso8601String() ?? $demande->updated_at?->toIso8601String(),
            'op' => $demande->operation,
            'terminal' => $demande->terminal,
            'slot' => self::slot($demande),
            'transporter' => [
                'type' => $demande->mandated_type ?: 'entreprise',
                'company' => $demande->mandated_company ?: ($demande->user?->raisonsociale ?: $demande->user?->name ?: 'Transporteur'),
                'email' => $demande->user?->email ?: '',
                'phone' => $demande->user?->telephone ?: '',
            ],
            'transitaire' => $demande->transitaire ?: '',
            'driver' => [
                'first' => $camion->driver_first,
                'last' => $camion->driver_last,
                'phone' => $camion->driver_phone,
                'license' => $camion->driver_license,
            ],
            'vehicle' => [
                'country' => $camion->vehicle_country,
                'tractor' => $camion->vehicle_tractor,
                'trailer' => $camion->vehicle_trailer ?: '',
            ],
            'container' => [
                'number' => $camion->container_number ?: '',
                'iso' => $camion->container_iso,
                'bl' => $camion->container_bl ?: '',
                'goods' => $camion->container_goods ?: '',
                'vgm' => $camion->container_vgm ?: '',
            ],
            'notes' => $demande->notes ?: '',
            'docs' => $docsMap,
            'checks' => [],
            'token' => $token,
            'arrivedAt' => null,
            'entryAt' => null,
            'exitAt' => null,
            'cancelled' => $demande->status === 'annulee',
        ];
    }

    public static function generateToken(DemandeRdv $demande, DemandeCamion $camion): string
    {
        $rdvId = 'PF-' . strtoupper(substr(md5("{$demande->reference}-{$camion->id}-{$camion->position}"), 0, 6));
        $slot = $demande->creneau;
        $slotDate = $slot?->date ? $slot->date->format('Y-m-d') : now()->format('Y-m-d');
        $slotStart = $slot?->start ?? '08:00';
        $slotEnd = $slot?->end ?? '10:00';

        $startTs = strtotime("{$slotDate} {$slotStart}:00") ?: time();
        $endTs = strtotime("{$slotDate} {$slotEnd}:00") ?: ($startTs + 7200);
        $issuedTs = $demande->decided_at ? $demande->decided_at->timestamp : ($demande->submitted_at ? $demande->submitted_at->timestamp : time());

        $header = [
            'alg' => 'ES256',
            'kid' => 'pf-2026',
        ];

        $company = $demande->mandated_company ?: ($demande->user?->raisonsociale ?: $demande->user?->name ?: 'Transporteur');
        $driver = trim("{$camion->driver_first} {$camion->driver_last}");
        $veh = "{$camion->vehicle_country}|{$camion->vehicle_tractor}|{$camion->vehicle_trailer}";
        $slt = str_replace('-', '', $slotDate) . str_replace(':', '', $slotStart) . '-' . str_replace(':', '', $slotEnd);

        $docHashes = [];
        $demande->loadMissing('documents');
        $docsByType = $demande->documents->keyBy('type');
        foreach (DemandeRdv::DOC_TYPES as $type) {
            $doc = $docsByType->get($type);
            $docHashes[] = $doc ? substr($doc->sha256, 0, 8) : '';
        }

        $claims = [
            'sub' => $rdvId,
            'iat' => $issuedTs,
            'nbf' => $startTs - (12 * 3600),
            'exp' => $endTs + (24 * 3600),
            'op' => $demande->operation,
            'trm' => $demande->terminal,
            'slt' => $slt,
            'trn' => mb_substr($company, 0, 40),
            'drv' => mb_substr($driver, 0, 40),
            'veh' => $veh,
            'ctr' => (string) ($camion->container_number ?? ''),
            'iso' => $camion->container_iso,
            'bl' => (string) ($camion->container_bl ?? ''),
            'dh' => $docHashes,
        ];

        if ($camion->driver_license) {
            $claims['lic'] = mb_substr($camion->driver_license, 0, 24);
        }

        if ($demande->trucks_count > 1) {
            $claims['lot'] = "{$demande->reference}/{$camion->position}-{$demande->trucks_count}";
        }

        $h64 = self::base64UrlEncode((string) json_encode($header, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $p64 = self::base64UrlEncode((string) json_encode($claims, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $sig = self::base64UrlEncode(hash_hmac('sha256', "{$h64}.{$p64}", (string) config('app.key', 'portflow-secret'), true));

        return "{$h64}.{$p64}.{$sig}";
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * @return array<string, mixed>
     */
    public static function document(DemandeRdv $demande, DemandeDocument $document, ?User $viewer = null): array
    {
        $url = $viewer && $viewer->isAdmin()
            ? route('admin.demandes.documents.download', [$demande, $document])
            : route('transporteur.demandes.documents.download', [$demande, $document]);

        return [
            'id' => $document->id,
            'type' => $document->type,
            'name' => $document->original_name,
            'size' => $document->size,
            'mime' => $document->mime,
            'sha256' => $document->sha256,
            'url' => $url,
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
