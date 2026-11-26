<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('piece_a_fournir', function (Blueprint $table) {
            if (! Schema::hasColumn('piece_a_fournir', 'post')) {
                $table->string('post')->nullable();
            }
            if (! Schema::hasColumn('piece_a_fournir', 'short')) {
                $table->string('short')->nullable();
            }
            if (! Schema::hasColumn('piece_a_fournir', 'icon')) {
                $table->string('icon')->nullable();
            }
            if (! Schema::hasColumn('piece_a_fournir', 'hint')) {
                $table->string('hint')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('piece_a_fournir');
    }
};
