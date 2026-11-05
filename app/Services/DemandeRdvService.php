<?php

namespace App\Services;

use App\Models\Creneau;
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
        $demande = DB::transaction(function () use ($user, $data) {
            $creneau = $this->resolveSlot($data['date'], $data['start']);
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

            $this->replaceCamions($demande, $trucks, $data['op']);
            $this->syncDocuments($demande, $data['docs'], $user);
            $this->record($demande, 'soumise', $user, 'Demande envoyée.');

            return $demande;
        }, 3);

        $demande->loadMissing('creneau');
        $user->notify(new DemandeRdvSubmitted($demande));

        return $demande;
    }

    public function update(DemandeRdv $demande, array $data, User $user): DemandeRdv
    {
        return DB::transaction(function () use ($demande, $data, $user) {
            $locked = DemandeRdv::query()->whereKey($demande->id)->lockForUpdate()->firstOrFail();
            $creneau = $this->resolveSlot($data['date'], $data['start']);
            $trucks = $data['trucks'];
            $this->assertBookable($creneau, count($trucks), $locked->id);

            $locked->update(array_merge([
                'creneau_id' => $creneau->id,
                'operation' => $data['op'],
                'terminal' => $data['terminal'],
                'notes' => $this->nullableString($data['notes'] ?? null),
                'trucks_count' => count($trucks),
            ], $this->mandatedColumns($user, $data)));

            $this->replaceCamions($locked, $trucks, $data['op']);
            $this->syncDocuments($locked, $data['docs'], $user);
            $this->record($locked, 'modifiee', $user, 'Demande modifiée.');

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

    private function resolveSlot(string $date, string $start): Creneau
    {
        $creneau = Creneau::query()
            ->where('date', $date)
            ->where('start', $start)
            ->lockForUpdate()
            ->first();

        if (! $creneau) {
            throw ValidationException::withMessages([
                'slot' => 'Ce créneau n’existe plus : choisissez-en un autre.',
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
     * @param  array<int, array<string, mixed>>  $trucks
     */
    private function replaceCamions(DemandeRdv $demande, array $trucks, string $operation): void
    {
        $demande->camions()->delete();

        foreach ($trucks as $index => $truck) {
            $container = ContainerNumber::normalize($truck['container']['number'] ?? '');

            $demande->camions()->create([
                'position' => $index + 1,
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
            ]);
        }
    }

    /**
     * Rattache les documents validés à la demande et déplace les fichiers temporaires.
     *
     * @param  array<string, string|int>  $docs
     */
    private function syncDocuments(DemandeRdv $demande, array $docs, User $user): void
    {
        $existing = $demande->documents()->get()->keyBy('type');
        $resolved = [];

        foreach (DemandeRdv::DOC_TYPES as $type) {
            $value = $docs[$type] ?? null;
            $raw = is_int($value) ? (string) $value : (is_string($value) ? trim($value) : '');

            if ($raw === '') {
                throw ValidationException::withMessages([
                    "docs.{$type}" => 'Ce document est obligatoire.',
                ]);
            }

            if (Str::isUuid($raw)) {
                $upload = TemporaryUpload::query()
                    ->where('token', $raw)
                    ->where('user_id', $user->id)
                    ->where('type', $type)
                    ->first();

                if (! $upload) {
                    throw ValidationException::withMessages([
                        "docs.{$type}" => 'Le fichier téléversé est introuvable ou expiré.',
                    ]);
                }

                $resolved[$type] = ['kind' => 'temp', 'upload' => $upload];

                continue;
            }

            if (ctype_digit($raw)) {
                $document = $existing->get($type);

                if (! $document || (int) $raw !== $document->id) {
                    throw ValidationException::withMessages([
                        "docs.{$type}" => 'Ce document ne correspond pas à la demande.',
                    ]);
                }

                $resolved[$type] = ['kind' => 'existing', 'document' => $document];

                continue;
            }

            throw ValidationException::withMessages([
                "docs.{$type}" => 'Référence de document invalide.',
            ]);
        }

        $keep = [];

        foreach ($resolved as $type => $item) {
            if ($item['kind'] === 'existing') {
                $keep[] = $item['document']->id;

                continue;
            }

            /** @var TemporaryUpload $upload */
            $upload = $item['upload'];
            $old = $existing->get($type);
            $extension = strtolower(pathinfo($upload->original_name, PATHINFO_EXTENSION));
            $directory = "rendez-vous/{$demande->id}";
            $path = $directory.'/'.$type.'-'.Str::uuid().($extension !== '' ? '.'.$extension : '');

            Storage::disk('local')->makeDirectory($directory);

            if (! Storage::disk('local')->move($upload->path, $path)) {
                throw new RuntimeException('Impossible de déplacer le document téléversé.');
            }

            if ($old) {
                Storage::disk('local')->delete($old->path);
                $old->delete();
            }

            $document = $demande->documents()->create([
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

        $demande->documents()->whereNotIn('id', $keep)->get()->each(function ($document) {
            Storage::disk('local')->delete($document->path);
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
