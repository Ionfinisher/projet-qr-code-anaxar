<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Colonnes attendues par App\Models\User et le workflow d'inscription.
     * Les gardes `hasColumn` permettent de rejouer la migration sur une base
     * existante sans casser les installations déjà en place.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'keyuser')) {
                $table->string('keyuser')->nullable()->unique();
            }
            if (! Schema::hasColumn('users', 'nom')) {
                $table->string('nom')->nullable();
            }
            if (! Schema::hasColumn('users', 'prenom')) {
                $table->string('prenom')->nullable();
            }
            if (! Schema::hasColumn('users', 'telephone')) {
                $table->string('telephone', 30)->nullable();
            }
            if (! Schema::hasColumn('users', 'adresse')) {
                $table->string('adresse')->nullable();
            }
            if (! Schema::hasColumn('users', 'access_token')) {
                $table->string('access_token')->nullable();
            }
            if (! Schema::hasColumn('users', 'idpays')) {
                $table->unsignedBigInteger('idpays')->nullable()->index();
            }
            if (! Schema::hasColumn('users', 'idtransporteur')) {
                $table->unsignedBigInteger('idtransporteur')->nullable()->index();
            }
            if (! Schema::hasColumn('users', 'statut')) {
                $table->string('statut')->nullable();
            }
            if (! Schema::hasColumn('users', 'user_type')) {
                $table->string('user_type')->nullable();
            }
            if (! Schema::hasColumn('users', 'created_by')) {
                $table->bigInteger('created_by')->nullable();
            }
            if (! Schema::hasColumn('users', 'updated_by')) {
                $table->bigInteger('updated_by')->nullable();
            }
            if (! Schema::hasColumn('users', 'firebase_token')) {
                $table->string('firebase_token')->nullable();
            }
        });
    }

    public function down(): void
    {
        foreach ([
            'keyuser',
            'nom',
            'prenom',
            'telephone',
            'adresse',
            'access_token',
            'idpays',
            'idtransporteur',
            'statut',
            'user_type',
            'created_by',
            'updated_by',
            'firebase_token',
        ] as $column) {
            if (Schema::hasColumn('users', $column)) {
                Schema::table('users', fn (Blueprint $table) => $table->dropColumn($column));
            }
        }
    }
};
