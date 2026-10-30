<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pays')) {
            Schema::create('pays', function (Blueprint $table) {
                $table->id();
                $table->string('keypays')->nullable();
                $table->string('nom');
                $table->string('indicatif', 10)->nullable();
                $table->string('code', 10)->nullable()->unique();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pays');
    }
};
