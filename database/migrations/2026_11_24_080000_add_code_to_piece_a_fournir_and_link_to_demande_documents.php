<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Ajouter la colonne code sur piece_a_fournir si elle n'existe pas
        Schema::table('piece_a_fournir', function (Blueprint $table) {
            if (! Schema::hasColumn('piece_a_fournir', 'code')) {
                $table->string('code')->nullable()->index();
            }
        });

        // 2. Ajouter la clé étrangère piece_a_fournir_id sur demande_documents
        Schema::table('demande_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('demande_documents', 'piece_a_fournir_id')) {
                $table->foreignId('piece_a_fournir_id')->nullable()->constrained('piece_a_fournir')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('demande_documents', function (Blueprint $table) {
            if (Schema::hasColumn('demande_documents', 'piece_a_fournir_id')) {
                $table->dropForeign(['piece_a_fournir_id']);
                $table->dropColumn('piece_a_fournir_id');
            }
        });

        Schema::table('piece_a_fournir', function (Blueprint $table) {
            if (Schema::hasColumn('piece_a_fournir', 'code')) {
                $table->dropColumn('code');
            }
        });
    }
};
