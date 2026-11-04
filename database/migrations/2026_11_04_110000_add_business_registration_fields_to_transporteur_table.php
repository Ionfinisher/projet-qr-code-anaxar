<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transporteur', function (Blueprint $table) {
            foreach ([
                'nif',
                'rccm',
                'fonction_representant',
                'ville',
            ] as $column) {
                if (! Schema::hasColumn('transporteur', $column)) {
                    $table->string($column)->nullable();
                }
            }

            if (! Schema::hasColumn('transporteur', 'nombre_camions')) {
                $table->unsignedInteger('nombre_camions')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('transporteur', function (Blueprint $table) {
            foreach ([
                'nif',
                'rccm',
                'fonction_representant',
                'ville',
                'nombre_camions',
            ] as $column) {
                if (Schema::hasColumn('transporteur', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
