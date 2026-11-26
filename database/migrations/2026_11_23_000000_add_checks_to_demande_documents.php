<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Colonnes nullable : les contrôles historiques restent inchangés.
     */
    public function up(): void
    {
        Schema::table('demande_documents', function (Blueprint $table) {
            $table->string('check_result', 10)->nullable()->after('sha256');
            $table->timestamp('checked_at')->nullable()->after('check_result');
            $table->foreignId('checked_by')
                ->nullable()
                ->after('checked_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('check_note')->nullable()->after('checked_by');
        });
    }

    public function down(): void
    {
        Schema::table('demande_documents', function (Blueprint $table) {
            $table->dropForeign(['checked_by']);
            $table->dropColumn([
                'check_result',
                'checked_at',
                'checked_by',
                'check_note',
            ]);
        });
    }
};
