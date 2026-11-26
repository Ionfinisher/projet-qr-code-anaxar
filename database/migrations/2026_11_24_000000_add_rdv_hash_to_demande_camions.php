<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Empreinte courte utilisée pour retrouver un rendez-vous lors d'un scan.
     */
    public function up(): void
    {
        Schema::table('demande_camions', function (Blueprint $table) {
            $table->string('rdv_hash', 6)->nullable()->after('position');
            $table->index('rdv_hash', 'demande_camions_rdv_hash_idx');
        });

        DB::table('demande_camions as c')
            ->join('demandes_rdv as d', 'c.demande_rdv_id', '=', 'd.id')
            ->whereNull('c.rdv_hash')
            ->select('c.id as camion_id', 'c.position', 'd.reference')
            ->orderBy('c.id')
            ->chunkById(100, function ($camions) {
                foreach ($camions as $camion) {
                    $hash = strtoupper(substr(
                        md5("{$camion->reference}-{$camion->camion_id}-{$camion->position}"),
                        0,
                        6
                    ));

                    DB::table('demande_camions')
                        ->where('id', $camion->camion_id)
                        ->update(['rdv_hash' => $hash]);
                }
            }, 'c.id', 'camion_id');
    }

    public function down(): void
    {
        Schema::table('demande_camions', function (Blueprint $table) {
            $table->dropIndex('demande_camions_rdv_hash_idx');
            $table->dropColumn('rdv_hash');
        });
    }
};
