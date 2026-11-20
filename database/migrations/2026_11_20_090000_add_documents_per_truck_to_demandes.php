<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temporary_uploads', function (Blueprint $table) {
            // Clé stable du camion côté client : elle permet de rapprocher un
            // upload temporaire du camion avant même que la demande soit créée.
            $table->string('truck_key', 64)->nullable()->after('type');
            $table->index(['user_id', 'truck_key', 'type'], 'temporary_uploads_user_truck_type_idx');
        });

        Schema::table('demande_documents', function (Blueprint $table) {
            $table->foreignId('demande_camion_id')
                ->nullable()
                ->after('demande_rdv_id')
                ->constrained('demande_camions')
                ->cascadeOnDelete();

            $table->dropUnique(['demande_rdv_id', 'type']);
            $table->unique(
                ['demande_rdv_id', 'demande_camion_id', 'type'],
                'demande_documents_demande_camion_type_unique'
            );
        });

        $this->rattacherDocumentsAuPremierCamion();
    }

    public function down(): void
    {
        Schema::table('demande_documents', function (Blueprint $table) {
            $table->dropUnique('demande_documents_demande_camion_type_unique');
            $table->dropForeign(['demande_camion_id']);
            $table->dropColumn('demande_camion_id');
        });

        Schema::table('temporary_uploads', function (Blueprint $table) {
            $table->dropIndex('temporary_uploads_user_truck_type_idx');
            $table->dropColumn('truck_key');
        });

        // L'ancienne contrainte n'est restaurée que si aucun doublon
        // (demande + type) n'existe : la restaurer sinon supprimerait des documents.
        $doublons = DB::table('demande_documents')
            ->select('demande_rdv_id', 'type')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('demande_rdv_id', 'type')
            ->having('total', '>', 1)
            ->first();

        if ($doublons === null) {
            Schema::table('demande_documents', function (Blueprint $table) {
                $table->unique(['demande_rdv_id', 'type'], 'demande_documents_demande_rdv_id_type_unique');
            });
        }
    }

    private function rattacherDocumentsAuPremierCamion(): void
    {
        // Les identifiants sont lus avant mise à jour : filtrer sur whereNull
        // pendant un chunk() ferait sauter les lignes déjà traitées.
        DB::table('demande_documents')
            ->whereNull('demande_camion_id')
            ->orderBy('id')
            ->pluck('id')
            ->chunk(100)
            ->each(function ($documentIds) {
                $documents = DB::table('demande_documents')
                    ->whereIn('id', $documentIds)
                    ->get(['id', 'demande_rdv_id']);

                foreach ($documents as $document) {
                    $camion = DB::table('demande_camions')
                        ->where('demande_rdv_id', $document->demande_rdv_id)
                        ->orderBy('position')
                        ->first(['id']);

                    if ($camion === null) {
                        // Demande sans camion : on conserve le document non rattaché
                        // plutôt que de le supprimer (affichage legacy en lecture seule).
                        continue;
                    }

                    DB::table('demande_documents')
                        ->where('id', $document->id)
                        ->update(['demande_camion_id' => $camion->id]);
                }
            });
    }
};
