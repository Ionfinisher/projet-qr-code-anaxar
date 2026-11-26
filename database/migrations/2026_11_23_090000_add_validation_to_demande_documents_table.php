<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demande_documents', function (Blueprint $table) {
            $table->string('statut', 20)->default('en_attente')->after('sha256');
            $table->timestamp('validated_at')->nullable()->after('statut');
            $table->foreignId('validated_by')->nullable()->after('validated_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('demande_documents', function (Blueprint $table) {
            $table->dropForeign(['validated_by']);
            $table->dropColumn(['statut', 'validated_at', 'validated_by']);
        });
    }
};

