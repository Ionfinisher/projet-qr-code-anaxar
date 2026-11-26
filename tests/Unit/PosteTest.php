<?php

namespace Tests\Unit;

use App\Models\DemandeRdv;
use App\Support\Poste;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class PosteTest extends TestCase
{
    public function test_le_mapping_est_complet_et_aligne_sur_les_types_de_documents(): void
    {
        $this->assertSame([
            Poste::POSTE_BC,
            Poste::POSTE_BF,
            Poste::POSTE_AS,
            Poste::POSTE_VT,
            Poste::POSTE_GP,
            Poste::POSTE_TA,
        ], array_keys(Poste::all()));

        $this->assertSame(DemandeRdv::DOC_TYPES, array_values(array_map(
            fn (array $poste) => $poste['key'],
            Poste::all()
        )));

        $this->assertSame([
            'Bon de chargement',
            'Bon de fret',
            'Assurance',
            'Visite technique',
            'Gate pass',
            'Terminal access',
        ], array_values(array_map(fn (array $poste) => $poste['label'], Poste::all())));
    }

    public function test_les_conversions_sont_bidirectionnelles_et_refusent_les_valeurs_inconnues(): void
    {
        $this->assertSame('bc', Poste::keyFor(Poste::POSTE_BC));
        $this->assertSame('as', Poste::keyFor(Poste::POSTE_AS));
        $this->assertSame('ta', Poste::keyFor(Poste::POSTE_TA));
        $this->assertNull(Poste::keyFor(0));
        $this->assertNull(Poste::keyFor(7));

        $this->assertSame(Poste::POSTE_BC, Poste::posteFor('bc'));
        $this->assertSame(Poste::POSTE_AS, Poste::posteFor('as'));
        $this->assertNull(Poste::posteFor('sup'));
        $this->assertNull(Poste::posteFor(''));

        $this->assertSame('Assurance', Poste::labelFor(Poste::POSTE_AS));

        $this->expectException(InvalidArgumentException::class);
        Poste::labelFor(7);
    }

    public function test_la_normalisation_accepte_les_numeros_et_les_cles_sans_tenir_compte_de_la_casse(): void
    {
        foreach (Poste::all() as $poste => $data) {
            $this->assertSame($poste, Poste::normalize($poste));
            $this->assertSame($poste, Poste::normalize((string) $poste));
            $this->assertSame($poste, Poste::normalize(strtoupper($data['key'])));
        }

        $this->assertNull(Poste::normalize(0));
        $this->assertNull(Poste::normalize(7));
        $this->assertNull(Poste::normalize('sup'));
        $this->assertNull(Poste::normalize(''));
    }
}
