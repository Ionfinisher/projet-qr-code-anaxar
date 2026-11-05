<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creneaux', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->date('date')->index();
            $table->string('start', 5);
            $table->string('end', 5);
            $table->unsignedInteger('capacity')->default(40);
            $table->boolean('open')->default(true);
            $table->string('close_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['date', 'start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creneaux');
    }
};

