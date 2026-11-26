<?php

namespace App\Services;

use App\Models\Creneau;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use App\Models\PieceAFournir;
use App\Models\TemporaryUpload;
use App\Models\User;
use App\Notifications\DemandeRdvDecided;
use App\Notifications\DemandeRdvSubmitted;
use App\Support\ContainerNumber;
use App\Support\SlotTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class DemandeRdvService
{
    public function __construct(private readonly CreneauUsageService $usage)
    {
    }

    public function create(User $user, array $data): DemandeRdv
    {
        $pathsToDelete = [];

        $demande = DB::transaction(function () use ($user, $data, &$pathsToDelete) {
            $creneau = $this->resolveSlot($data['date'], $data['start'], $data['terminal']);
            $trucks = $data['trucks'];
            $this->assertBookable($creneau, count($trucks), null);

            $demande = DemandeRdv::create(array_merge([
                'user_id' => $user->id,
                'creneau_id' => $creneau->id,
                'status' => DemandeRdv::STATUS_PENDING,
                'operation' => $data['op'],
                'terminal' => $data['terminal'],
                'notes' => $this->nullableString($data['notes'] ?? null),
                'trucks_count' => count($trucks),
                'submitted_at' => now(),
            ], $this->mandatedColumns($user, $data)));

            $camionIdsByKey = $this->syncCamions($demande, $trucks, $data['op'], $pathsToDelete);
            $this->syncDocuments($demande, $data['docs'], $user, $camionIdsByKey, $pathsToDelete);
            $this->record($demande, 'soumise', $user, 'Demande envoyée.');

            DB::afterCommit(fn () => $this->deleteFiles($pathsToDelete));

            return $demande;
        }, 3);

        $demande->loadMissing('creneau');
        $user->notify(new DemandeRdvSubmitted($demande));

        return $demande;
    }

    public function update(DemandeRdv $demande, array $data, User $user): DemandeRdv
    {
        $pathsToDelete = [];

        return DB::transaction(function () use ($demande, $data, $user, &$pathsToDelete) {
            $locked = DemandeRdv::query()->whereKey($demande->id)->lockForUpdate()->firstOrFail();
            $creneau = $this->resolveSlot($data['date'], $data['start'], $data['terminal']);
            $trucks = $data['trucks'];
            $this->assertBookable($creneau, count($trucks), $locked->id);

            $locked->update(array_merge([
                'creneau_id' => $creneau->id,
                'operation' => $data['op'],
                'terminal' => $data['terminal'],
                'notes' => $this->nullableString($data['notes'] ?? null),
                'trucks_count' => count($trucks),
            ], $this->mandatedColumns($user, $data)));

            $camionIdsByKey = $this->syncCamions($locked, $trucks, $data['op'], $pathsToDelete);
            $this->syncDocuments($locked, $data['docs'], $user, $camionIdsByKey, $pathsToDelete);
            $this->record($locked, 'modifiee', $user, 'Demande modifiée.');

            DB::afterCommit(fn () => $this->deleteFiles($pathsToDelete));

            return $locked;
        }, 3);
    }

    public function cancel(DemandeRdv $demande, User $user, string $reason): DemandeRdv
    {
        return DB::transaction(function () use ($demande, $user, $reason) {
            $locked = DemandeRdv::query()->whereKey($demande->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isActive()) {
                throw ValidationException::withMessages([
                    'demande' => 'Cette demande ne peut plus être annulée.',
                ]);
            }

            $locked->update([
                'status' => DemandeRdv::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'cancel_reason' => $reason,
            ]);

            $this->record($locked, 'annulee', $user, $reason);

            return $locked;
        }, 3);
    }

    public function approve(DemandeRdv $demande, User $admin, ?string $comment = null): DemandeRdv
    {
        $demande = DB::transaction(function () use ($demande, $admin, $comment) {
            $locked = DemandeRdv::query()->whereKey($demande->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isPending()) {
                throw ValidationException::withMessages([
                    'demande' => 'Cette demande a déjà été traitée.',
                ]);
            }

            $creneau = Creneau::query()->whereKey($locked->creneau_id)->lockForUpdate()->firstOrFail();

            if (! $creneau->open || SlotTime::isPast($creneau)) {
                throw ValidationException::withMessages([
                    'demande' => 'Ce créneau est fermé ou déjà passé.',
                ]);
            }

            $usage = $this->usage->forCreneau($creneau, $locked->id);
            $trucks = $locked->camions()->count();

            if ($usage['remaining'] < $trucks) {
                throw ValidationException::withMessages([
                    'demande' => 'La capacité restante du créneau ne permet plus de valider cette demande.',
                ]);
            }

            $locked->update([
                'status' => DemandeRdv::STATUS_APPROVED,
                'decided_at' => now(),
                'decided_by' => $admin->id,
                'decision_comment' => $this->nullableString($comment),
                'rejection_reason' => null,
            ]);

            $this->record($locked, 'validee', $admin, $this->nullableString($comment));

            return $locked;
        }, 3);

        $demande->load(['user', 'creneau']);
        $demande->user?->notify(new DemandeRdvDecided($demande, true));

        return $demande;
    }

    public function validateDocument(DemandeDocument $document, User $admin): DemandeDocument
    {
        $demande = $document->demande;
        if (! $demande || (! $demande->isPending() && ! $demande->isApproved())) {
            throw ValidationException::withMessages([
                'document' => 'La validation d’un document nécessite que la demande soit en attente ou déjà validée.',
            ]);
        }

        DB::transaction(function () use ($document, $demande, $admin) {
            $document->update([
                'statut' => DemandeDocument::STATUT_VALIDE,
                'validated_at' => now(),
                'validated_by' => $admin->id,
            ]);

            $docLabel = $document->typeLabel();
            $detail = $document->camion
                ? "{$docLabel} (Camion {$document->camion->position}) validé"
                : "{$docLabel} validé";

            $this->record(
                $demande,
                'document_valide',
                $admin,
                $detail
            );

            // Vérifier si tous les documents de la demande sont validés
            $allDocuments = $demande->documents()->get();
            $hasUnvalidated = $allDocuments->contains(fn (DemandeDocument $doc) => ! $doc->isValidated());

            if (! $hasUnvalidated && $demande->isPending()) {
                // Déclencher l'approbation automatique de la demande
                $lockedDemande = DemandeRdv::query()->whereKey($demande->id)->lockForUpdate()->firstOrFail();
                $creneau = Creneau::query()->whereKey($lockedDemande->creneau_id)->lockForUpdate()->firstOrFail();

                if (! $creneau->open || SlotTime::isPast($creneau)) {
                    throw ValidationException::withMessages([
                        'document' => 'Le créneau de cette demande est fermé ou déjà passé.',
                    ]);
                }

                $usage = $this->usage->forCreneau($creneau, $lockedDemande->id);
                $trucks = $lockedDemande->camions()->count();

                if ($usage['remaining'] < $trucks) {
                    throw ValidationException::withMessages([
                        'document' => 'La capacité restante du créneau ne permet plus de valider cette demande.',
                    ]);
                }

                $lockedDemande->update([
                    'status' => DemandeRdv::STATUS_APPROVED,
                    'decided_at' => now(),
                    'decided_by' => $admin->id,
                    'decision_comment' => 'Validation automatique suite à la conformité de l’ensemble des documents.',
                    'rejection_reason' => null,
                ]);

                $this->record(
                    $lockedDemande,
                    'validee',
                    $admin,
                    'Validation complète automatique suite à la conformité de l’ensemble des pièces justificatives.'
                );

                $lockedDemande->load(['user', 'creneau']);
                $lockedDemande->user?->notify(new DemandeRdvDecided($lockedDemande, true));
            }
        }, 3);

        return $document->fresh();
    }

    public function reject(DemandeRdv $demande, User $admin, string $reason, ?string $comment = null): DemandeRdv
    {
        $demande = DB::transaction(function () use ($demande, $admin, $reason, $comment) {
            $locked = DemandeRdv::query()->whereKey($demande->id)->lockForUpdate()->firstOrFail();

            if (! $locked->isPending()) {
                throw ValidationException::withMessages([
                    'demande' => 'Cette demande a déjà été traitée.',
                ]);
            }

            $locked->update([
                'status' => DemandeRdv::STATUS_REJECTED,
                'decided_at' => now(),
                'decided_by' => $admin->id,
                'rejection_reason' => $reason,
                'decision_comment' => $this->nullableString($comment),
            ]);

            $this->record($locked, 'rejetee', $admin, $reason);

            return $locked;
        }, 3);

        $demande->load(['user', 'creneau']);
        $demande->user?->notify(new DemandeRdvDecided($demande, false));

        return $demande;
    }

    private function resolveSlot(string $date, string $start, ?string $terminalCode = null): Creneau
    {
        $query = Creneau::query()
            ->where('date', $date)
            ->where('start', $start);

        if ($terminalCode !== null && $terminalCode !== '') {
            $query->where(function ($q) use ($terminalCode) {
                $q->whereHas('terminal', function ($tq) use ($terminalCode) {
                    $tq->where('code', $terminalCode);
                })->orWhereNull('terminal_id');
            });
        }

        $creneau = $query->lockForUpdate()->first();

        if (! $creneau) {
            throw ValidationException::withMessages([
                'slot' => 'Ce créneau n’existe plus ou n’est pas disponible pour ce terminal : choisissez-en un autre.',
            ]);
        }

        return $creneau;
    }

    private function assertBookable(Creneau $creneau, int $trucks, ?int $exceptDemandeId): void
    {
        if (! $creneau->open) {
            throw ValidationException::withMessages([
                'slot' => 'Ce créneau est fermé : choisissez-en un autre.',
            ]);
        }

        if (SlotTime::isPast($creneau)) {
            throw ValidationException::withMessages([
                'slot' => 'Ce créneau est passé : choisissez-en un autre.',
            ]);
        }

        $usage = $this->usage->forCreneau($creneau, $exceptDemandeId);

        if ($usage['remaining'] < $trucks) {
            $remaining = $usage['remaining'];

            throw ValidationException::withMessages([
                'slot' => "Plus que {$remaining} place".($remaining > 1 ? 's' : '').
                    " sur ce créneau pour {$trucks} camion(s).",
            ]);
        }
    }

    /**
     * @param  array<int, string>  $pathsToDelete
     */
    private function deleteFiles(array $pathsToDelete): void
    {
        if ($pathsToDelete === []) {
            return;
        }

        Storage::disk('local')->delete($pathsToDelete);
    }

    /**
     * Synchronise les camions sans recréer ceux qui sont conservés : les documents
     * restent ainsi rattachés au même enregistrement lors d'une modification.
     *
     * @param  array<int, array<string, mixed>>  $trucks
     * @param  array<int, string>  $pathsToDelete
     * @return array<string, int> clé côté client => identifiant du camion
     */
    private function syncCamions(DemandeRdv $demande, array $trucks, string $operation, array &$pathsToDelete): array
    {
        $existing = $demande->camions()->get()->keyBy('id');

        // La position est unique : on libère d'abord les positions existantes pour
        // autoriser un réordonnancement sans violation temporaire de contrainte.
        $temporaryPosition = 1000;
        foreach ($existing as $camion) {
            $camion->update(['position' => $temporaryPosition++]);
        }

        $kept = [];
        $camionIdsByKey = [];

        foreach ($trucks as $index => $truck) {
            $key = (string) $truck['key'];
            $rdvId = isset($truck['rdvId']) ? (int) $truck['rdvId'] : null;
            $camion = $rdvId !== null ? $existing->get($rdvId) : null;

            if ($camion === null) {
                $camion = $demande->camions()->create($this->camionAttributes($truck, $index + 1, $operation));
            } else {
                $camion->update($this->camionAttributes($truck, $index + 1, $operation));
            }

            if (isset($camionIdsByKey[$key])) {
                throw ValidationException::withMessages([
                    'trucks' => 'Chaque camion doit avoir une clé unique.',
                ]);
            }

            $camionIdsByKey[$key] = $camion->id;
            $kept[] = $camion->id;
        }

        $removedIds = array_values(array_diff($existing->keys()->all(), $kept));

        if ($removedIds !== []) {
            $this->deleteCamionDocuments($demande, $removedIds, $pathsToDelete);
            $demande->camions()->whereIn('id', $removedIds)->delete();
        }

        return $camionIdsByKey;
    }

    /**
     * @param  array<int, int>  $camionIds
     * @param  array<int, string>  $pathsToDelete
     */
    private function deleteCamionDocuments(DemandeRdv $demande, array $camionIds, array &$pathsToDelete): void
    {
        $documents = $demande->documents()->whereIn('demande_camion_id', $camionIds)->get();

        foreach ($documents as $document) {
            $pathsToDelete[] = $document->path;
            $document->delete();
        }
    }

    /**
     * @param  array<string, mixed>  $truck
     * @return array<string, mixed>
     */
    private function camionAttributes(array $truck, int $position, string $operation): array
    {
        $container = ContainerNumber::normalize($truck['container']['number'] ?? '');

        return [
            'position' => $position,
            'driver_first' => trim((string) $truck['driver']['first']),
            'driver_last' => Str::upper(trim((string) $truck['driver']['last'])),
            'driver_phone' => trim((string) $truck['driver']['phone']),
            'driver_license' => $this->normalizeCode($truck['driver']['license'] ?? ''),
            'vehicle_country' => Str::upper((string) $truck['vehicle']['country']),
            'vehicle_tractor' => $this->normalizePlate($truck['vehicle']['tractor'] ?? ''),
            'vehicle_trailer' => $this->normalizePlate($truck['vehicle']['trailer'] ?? '') ?: null,
            'container_number' => $container !== '' ? $container : null,
            'container_iso' => Str::upper((string) $truck['container']['iso']),
            'container_bl' => $this->normalizeCode($truck['container']['bl'] ?? '') ?: null,
            'container_goods' => $this->nullableString($truck['container']['goods'] ?? null),
            'container_vgm' => $operation === 'EXP'
                ? $this->nullableInt($truck['container']['vgm'] ?? null)
                : null,
        ];
    }

    /**
     * Rattache les documents validés à chaque camion et déplace les fichiers temporaires.
     *
     * @param  array<string, array<string, string|int>>  $docs
     * @param  array<string, int>  $camionIdsByKey
     * @param  array<int, string>  $pathsToDelete
     */
    private function syncDocuments(DemandeRdv $demande, array $docs, User $user, array $camionIdsByKey, array &$pathsToDelete): void
    {
        $existing = $demande->documents()->get()->keyBy(
            fn (DemandeDocument $document) => $document->demande_camion_id.'|'.$document->type
        );
        $resolved = [];

        foreach ($camionIdsByKey as $truckKey => $camionId) {
            foreach (DemandeRdv::DOC_TYPES as $type) {
                $value = $docs[$truckKey][$type] ?? null;
                $raw = is_int($value) ? (string) $value : (is_string($value) ? trim($value) : '');
                $errorKey = "docs.{$truckKey}.{$type}";

                if ($raw === '') {
                    throw ValidationException::withMessages([$errorKey => 'Ce document est obligatoire.']);
                }

                if (Str::isUuid($raw)) {
                    // La clé du camion fait partie de la recherche : un token ne peut
                    // pas être réutilisé pour un autre camion ni un autre utilisateur.
                    $upload = TemporaryUpload::query()
                        ->where('token', $raw)
                        ->where('user_id', $user->id)
                        ->where('type', $type)
                        ->where('truck_key', $truckKey)
                        ->first();

                    if (! $upload) {
                        throw ValidationException::withMessages([
                            $errorKey => 'Le fichier téléversé est introuvable ou expiré.',
                        ]);
                    }

                    $resolved[] = [
                        'kind' => 'temp',
                        'upload' => $upload,
                        'camion_id' => $camionId,
                        'type' => $type,
                    ];

                    continue;
                }

                if (ctype_digit($raw)) {
                    $document = $existing->get($camionId.'|'.$type);

                    if (! $document || (int) $raw !== $document->id) {
                        throw ValidationException::withMessages([
                            $errorKey => 'Ce document ne correspond pas à ce camion.',
                        ]);
                    }

                    $resolved[] = [
                        'kind' => 'existing',
                        'document' => $document,
                        'camion_id' => $camionId,
                        'type' => $type,
                    ];

                    continue;
                }

                throw ValidationException::withMessages([$errorKey => 'Référence de document invalide.']);
            }
        }

        $keep = [];
        $piecesMap = PieceAFournir::query()
            ->whereIn('code', DemandeRdv::DOC_TYPES)
            ->get()
            ->keyBy('code');

        foreach ($resolved as $item) {
            if ($item['kind'] === 'existing') {
                $keep[] = $item['document']->id;

                continue;
            }

            /** @var TemporaryUpload $upload */
            $upload = $item['upload'];
            $type = $item['type'];
            $old = $existing->get($item['camion_id'].'|'.$type);
            $extension = strtolower(pathinfo($upload->original_name, PATHINFO_EXTENSION));
            $directory = "rendez-vous/{$demande->id}/{$item['camion_id']}";
            $path = $directory.'/'.$type.'-'.Str::uuid().($extension !== '' ? '.'.$extension : '');

            Storage::disk('local')->makeDirectory($directory);

            if (! Storage::disk('local')->move($upload->path, $path)) {
                throw new RuntimeException('Impossible de déplacer le document téléversé.');
            }

            if ($old) {
                $pathsToDelete[] = $old->path;
                $old->delete();
            }

            $pieceAFournir = $piecesMap->get($type);

            $document = $demande->documents()->create([
                'demande_camion_id' => $item['camion_id'],
                'piece_a_fournir_id' => $pieceAFournir?->id,
                'type' => $type,
                'original_name' => $upload->original_name,
                'path' => $path,
                'mime' => $upload->mime,
                'size' => $upload->size,
                'sha256' => $upload->sha256,
            ]);

            $keep[] = $document->id;
            $upload->delete();
        }

        // Les documents legacy (sans camion) ne sont pas gérés par ce formulaire :
        // ils doivent rester visibles et ne jamais être purgés ici.
        $demande->documents()
            ->whereNotNull('demande_camion_id')
            ->whereNotIn('id', $keep)
            ->get()
            ->each(function (DemandeDocument $document) use (&$pathsToDelete) {
                $pathsToDelete[] = $document->path;
                $document->delete();
            });
    }

    /**
     * @return array<string, string|null>
     */
    private function mandatedColumns(User $user, array $data): array
    {
        if ($user->user_type !== PieceAFournir::TYPE_TRANSITAIRE) {
            return [
                'transitaire' => null,
                'mandated_type' => null,
                'mandated_company' => null,
                'mandated_first' => null,
                'mandated_last' => null,
                'mandated_phone' => null,
            ];
        }

        $mandated = $data['mandated'] ?? [];
        $type = $mandated['type'] ?? 'entreprise';

        return [
            'transitaire' => $this->nullableString($data['transitaire'] ?? null),
            'mandated_type' => $type,
            'mandated_company' => $type === 'entreprise'
                ? $this->nullableString($mandated['company'] ?? null)
                : null,
            'mandated_first' => $type === 'particulier'
                ? $this->nullableString($mandated['first'] ?? null)
                : null,
            'mandated_last' => $type === 'particulier'
                ? $this->nullableString($mandated['last'] ?? null)
                : null,
            'mandated_phone' => $this->nullableString($mandated['phone'] ?? null),
        ];
    }

    private function record(DemandeRdv $demande, string $type, ?User $actor, ?string $detail = null): void
    {
        $demande->evenements()->create([
            'type' => $type,
            'actor_id' => $actor?->id,
            'detail' => $detail,
        ]);
    }

    private function normalizeCode(?string $value): string
    {
        return (string) preg_replace('/[^A-Z0-9]/', '', Str::upper((string) $value));
    }

    private function normalizePlate(?string $value): string
    {
        $value = (string) preg_replace('/[^A-Z0-9 -]/', '', Str::upper((string) $value));
        $value = (string) preg_replace('/\s+/', ' ', $value);

        return trim($value);
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }
}
