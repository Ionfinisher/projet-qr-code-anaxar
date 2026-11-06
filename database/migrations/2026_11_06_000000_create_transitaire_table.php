<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Table dédiée aux demandeurs de type transitaire.
     *
     * Les données historiques restent dans `transporteur` : cette migration ne
     * copie ni ne supprime aucune ligne existante.
     */
    public function up(): void
    {
        if (! Schema::hasTable('transitaire')) {
            Schema::create('transitaire', function (Blueprint $table) {
                $table->id();
                $table->string('keytransitaire')->unique();
                $table->string('nom')->nullable();
                $table->string('prenom')->nullable();
                $table->string('email')->index();
                $table->string('telephone')->nullable();
                $table->string('adresse')->nullable();
                $table->string('raisonsociale')->nullable();
                $table->string('nif')->nullable();
                $table->string('rccm')->nullable();
                $table->string('fonction_representant')->nullable();
                $table->string('ville')->nullable();
                $table->unsignedInteger('nombre_camions')->nullable();
                $table->string('statut')->default('pending');
                $table->bigInteger('created_by')->nullable();
                $table->bigInteger('updated_by')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('users', 'idtransitaire')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('idtransitaire')->nullable()->index();
            });
        }

        if (! Schema::hasColumn('inscription', 'idtransitaire')) {
            Schema::table('inscription', function (Blueprint $table) {
                $table->unsignedBigInteger('idtransitaire')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('inscription', 'idtransitaire')) {
            Schema::table('inscription', fn (Blueprint $table) => $table->dropColumn('idtransitaire'));
        }

        if (Schema::hasColumn('users', 'idtransitaire')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropColumn('idtransitaire'));
        }

        Schema::dropIfExists('transitaire');
    }
};
