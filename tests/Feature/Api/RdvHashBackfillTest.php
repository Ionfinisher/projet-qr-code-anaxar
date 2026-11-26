<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Creneau;
use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use App\Models\User;
use App\Support\RdvId;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RdvHashBackfillTest extends TestCase
{
    use RefreshDatabase;

    private const MIGRATION = '2026_11_24_000000_add_rdv_hash_to_demande_camions';

    private const CHUNK_SIZE = 100;

    public function test_it_backfills_every_historical_camion_when_the_migration_is_replayed(): void
    {
        $this->assertSame(
            self::MIGRATION,
            DB::table('migrations')->orderByDesc('id')->value('migration'),
            'Le rollback ciblé suppose que la migration du rdv_hash est la dernière appliquée.'
        );

        $this->artisan('migrate:rollback', ['--step' => 1, '--force' => true])->assertSuccessful();
        $this->assertFalse(Schema::hasColumn('demande_camions', 'rdv_hash'));

        $owner = User::factory()->transporteur()->create();
        $creneau = Creneau::factory()->create();
        $first = DemandeRdv::factory()->forUser($owner)->forCreneau($creneau)->create([
            'reference' => 'DR-BACK1',
            'trucks_count' => self::CHUNK_SIZE + 1,
        ]);
        $second = DemandeRdv::factory()->forUser($owner)->forCreneau($creneau)->create([
            'reference' => 'DR-BACK2',
            'trucks_count' => 2,
        ]);

        // Plus de 100 lignes pour forcer plusieurs passages du chunkById et
        // exercer l'alias camion_id utilisé pour la pagination.
        $camions = [];
        for ($position = 1; $position <= self::CHUNK_SIZE + 1; $position++) {
            $camions[] = DemandeCamion::factory()->forDemande($first, $position)->create();
        }
        $camions[] = DemandeCamion::factory()->forDemande($second, 1)->create();
        $camions[] = DemandeCamion::factory()->forDemande($second, 2)->create();
        $demandes = [$first->id => $first, $second->id => $second];
        $expectedCount = self::CHUNK_SIZE + 3;

        $this->assertCount($expectedCount, $camions);
        $this->assertSame($expectedCount, DemandeCamion::count());

        $this->artisan('migrate', ['--force' => true])->assertSuccessful();
        $this->assertTrue(Schema::hasColumn('demande_camions', 'rdv_hash'));
        $this->assertSame($expectedCount, DB::table('demande_camions')->whereNotNull('rdv_hash')->count());

        foreach ($camions as $camion) {
            $rdvHash = $camion->fresh()->rdv_hash;

            $this->assertNotNull($rdvHash);
            $this->assertSame(
                substr(RdvId::for($camion, $demandes[$camion->demande_rdv_id]), strlen(RdvId::PREFIX)),
                $rdvHash
            );
        }
    }
}
