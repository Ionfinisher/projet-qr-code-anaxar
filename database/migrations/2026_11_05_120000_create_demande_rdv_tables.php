<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demandes_rdv', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('creneau_id')->constrained('creneaux')->restrictOnDelete();
            $table->string('status', 20)->default('en_attente');
            $table->string('operation', 3);
            $table->string('terminal', 3);
            $table->text('notes')->nullable();
            $table->string('transitaire')->nullable();
            $table->string('mandated_type', 20)->nullable();
            $table->string('mandated_company')->nullable();
            $table->string('mandated_first')->nullable();
            $table->string('mandated_last')->nullable();
            $table->string('mandated_phone', 20)->nullable();
            $table->unsignedSmallInteger('trucks_count')->default(1);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('decision_comment')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['creneau_id', 'status']);
        });

        Schema::create('demande_camions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demande_rdv_id')->constrained('demandes_rdv')->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->string('driver_first');
            $table->string('driver_last');
            $table->string('driver_phone', 20);
            $table->string('driver_license', 24);
            $table->string('vehicle_country', 2);
            $table->string('vehicle_tractor', 20);
            $table->string('vehicle_trailer', 20)->nullable();
            $table->string('container_number', 11)->nullable();
            $table->string('container_iso', 4);
            $table->string('container_bl', 24)->nullable();
            $table->string('container_goods')->nullable();
            $table->unsignedInteger('container_vgm')->nullable();
            $table->timestamps();

            $table->unique(['demande_rdv_id', 'position']);
            $table->index('container_number');
        });

        Schema::create('demande_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demande_rdv_id')->constrained('demandes_rdv')->cascadeOnDelete();
            $table->string('type', 2);
            $table->string('original_name');
            $table->string('path');
            $table->string('mime', 100);
            $table->unsignedBigInteger('size');
            $table->string('sha256', 64);
            $table->timestamps();

            $table->unique(['demande_rdv_id', 'type']);
        });

        Schema::create('temporary_uploads', function (Blueprint $table) {
            $table->id();
            $table->uuid('token')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 2);
            $table->string('original_name');
            $table->string('path');
            $table->string('mime', 100);
            $table->unsignedBigInteger('size');
            $table->string('sha256', 64);
            $table->timestamps();

            $table->index(['user_id', 'type']);
        });

        Schema::create('demande_evenements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demande_rdv_id')->constrained('demandes_rdv')->cascadeOnDelete();
            $table->string('type', 20);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('detail')->nullable();
            $table->timestamps();

            $table->index(['demande_rdv_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demande_evenements');
        Schema::dropIfExists('temporary_uploads');
        Schema::dropIfExists('demande_documents');
        Schema::dropIfExists('demande_camions');
        Schema::dropIfExists('demandes_rdv');
    }
};
