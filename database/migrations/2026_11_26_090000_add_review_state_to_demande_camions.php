<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demande_camions', function (Blueprint $table) {
            $table->string('review_status', 20)->default('en_attente');
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->text('rejection_comment')->nullable();
        });

        DB::table('demande_camions')
            ->join('demandes_rdv', 'demandes_rdv.id', '=', 'demande_camions.demande_rdv_id')
            ->select([
                'demande_camions.id',
                'demande_camions.demande_rdv_id',
                'demandes_rdv.status as demande_status',
                'demandes_rdv.decided_at as demande_decided_at',
                'demandes_rdv.decided_by as demande_decided_by',
                'demandes_rdv.rejection_reason',
                'demandes_rdv.decision_comment',
            ])
            ->orderBy('demande_camions.id')
            ->chunkById(100, function ($camions) {
                foreach ($camions as $camion) {
                    if ($camion->demande_status === 'validee') {
                        DB::table('demande_camions')
                            ->where('id', $camion->id)
                            ->update([
                                'review_status' => 'validee',
                                'decided_at' => $camion->demande_decided_at,
                                'decided_by' => $camion->demande_decided_by,
                            ]);
                    } elseif ($camion->demande_status === 'rejetee') {
                        DB::table('demande_camions')
                            ->where('id', $camion->id)
                            ->update([
                                'review_status' => 'rejetee',
                                'decided_at' => $camion->demande_decided_at,
                                'decided_by' => $camion->demande_decided_by,
                                'rejection_reason' => $camion->rejection_reason,
                                'rejection_comment' => $camion->decision_comment,
                            ]);
                    }
                }
            }, 'demande_camions.id', 'id');
    }

    public function down(): void
    {
        Schema::table('demande_camions', function (Blueprint $table) {
            $table->dropForeign(['decided_by']);
            $table->dropColumn([
                'review_status',
                'decided_at',
                'decided_by',
                'rejection_reason',
                'rejection_comment',
            ]);
        });
    }
};
