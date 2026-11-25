<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\QrScanException;
use App\Models\DemandeCamion;
use App\Models\DemandeDocument;
use App\Models\DemandeRdv;
use App\Support\MobileDossierPresenter;
use App\Support\QrJwsVerifier;
use App\Support\RdvId;

/**
 * Résolution d'un QR signé en dossier de rendez-vous, sans aucune écriture DB.
 */
final class QrScanService
{
    public function __construct(private readonly QrJwsVerifier $verifier) {}

    /**
     * @return array<string, mixed>
     */
    public function dossier(string $token, ?int $poste = null): array
    {
        $claims = $this->verifier->verify($token);
        $subject = (string) $claims['sub'];
        $hash = substr($subject, strlen(RdvId::PREFIX));

        $candidates = DemandeCamion::query()
            ->where('rdv_hash', $hash)
            ->with(['demande.creneau', 'documents.checker'])
            ->get();

        // Un hash inconnu, un dossier non validé ou un identifiant recalculé
        // différent ne désignent aucun dossier : 404, sans fuite d'information.
        $dossiers = $candidates->filter(
            fn (DemandeCamion $camion): bool => $this->matchesIdentity($camion, $subject)
        );

        if ($dossiers->isEmpty()) {
            throw QrScanException::notFound();
        }

        // Le dossier existe mais le QR porte des claims contradictoires : le QR
        // lui-même est invalide.
        $matches = $dossiers->filter(
            fn (DemandeCamion $camion): bool => $this->matchesClaims($camion, $claims)
        );

        if ($matches->isEmpty()) {
            throw QrScanException::invalid('mismatch');
        }

        if ($matches->count() > 1) {
            throw QrScanException::ambiguous();
        }

        /** @var DemandeCamion $camion */
        $camion = $matches->first();

        // Le filtrage par poste intervient après la vérification complète des
        // claims : un QR falsifié reste rejeté même si le document falsifié
        // n'est pas celui que le client a demandé à afficher.
        return MobileDossierPresenter::dossier($camion, $camion->demande, $poste);
    }

    private function matchesIdentity(DemandeCamion $camion, string $subject): bool
    {
        $demande = $camion->demande;

        return $demande instanceof DemandeRdv
            && $demande->isApproved()
            && RdvId::for($camion, $demande) === $subject;
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function matchesClaims(DemandeCamion $camion, array $claims): bool
    {
        $demande = $camion->demande;

        if (! $demande instanceof DemandeRdv) {
            return false;
        }

        if (($claims['op'] ?? null) !== $demande->operation || ($claims['trm'] ?? null) !== $demande->terminal) {
            return false;
        }

        $creneau = $demande->creneau;
        if ($creneau === null) {
            return false;
        }

        $slot = str_replace('-', '', $creneau->date->format('Y-m-d'))
            .str_replace(':', '', (string) $creneau->start)
            .'-'.str_replace(':', '', (string) $creneau->end);

        if (($claims['slt'] ?? null) !== $slot) {
            return false;
        }

        if (isset($claims['lot'])
            && $claims['lot'] !== "{$demande->reference}/{$camion->position}-{$demande->trucks_count}") {
            return false;
        }

        $documents = $camion->documents->keyBy('type');
        $documentHashes = [];

        foreach (DemandeRdv::DOC_TYPES as $type) {
            $document = $documents->get($type);
            $documentHashes[] = $document instanceof DemandeDocument
                ? substr((string) $document->sha256, 0, 8)
                : '';
        }

        return isset($claims['dh'])
            && is_array($claims['dh'])
            && array_values($claims['dh']) === $documentHashes;
    }
}
