<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\DemandeCamion;
use App\Models\DemandeRdv;
use App\Support\RdvId;
use PHPUnit\Framework\TestCase;

class RdvIdTest extends TestCase
{
    public function test_for_uses_the_reference_the_camion_id_and_the_final_position(): void
    {
        $demande = new DemandeRdv(['reference' => 'DR-ABC123']);
        $camion = new DemandeCamion(['position' => 3]);
        $camion->id = 12;

        $expected = 'PF-'.strtoupper(substr(md5('DR-ABC123-12-3'), 0, 6));

        $this->assertSame($expected, RdvId::for($camion, $demande));
        $this->assertMatchesRegularExpression('/^PF-[0-9A-F]{6}$/', RdvId::for($camion, $demande));
    }

    public function test_normalize_accepts_lowercase_and_rejects_malformed_values(): void
    {
        $this->assertSame('PF-A1B2C3', RdvId::normalize('pf-a1b2c3'));
        $this->assertSame('PF-A1B2C3', RdvId::normalize(' PF-a1B2c3 '));
        $this->assertNull(RdvId::normalize('PF-12345'));
        $this->assertNull(RdvId::normalize('PF-GGGGGG'));
        $this->assertNull(RdvId::normalize('A1B2C3'));
        $this->assertNull(RdvId::normalize(null));
    }
}
