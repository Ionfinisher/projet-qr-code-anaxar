<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Numéro de pièce d'identité déclaré par un transporteur particulier.
     * Migration additive : aucune donnée existante n'est modifiée.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('transporteur', 'numero_piece_identite')) {
            Schema::table('transporteur', function (Blueprint $table) {
                $table->string('numero_piece_identite', 100)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('transporteur', 'numero_piece_identite')) {
            Schema::table('transporteur', fn (Blueprint $table) => $table->dropColumn('numero_piece_identite'));
        }
    }
};
