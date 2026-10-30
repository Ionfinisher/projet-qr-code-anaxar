<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        if (! Schema::hasTable('transporteur')) {
            Schema::create('transporteur', function (Blueprint $table) {
                $table->id();
                $table->string('keytransporteur');
                $table->string('nom')->nullable();
                $table->string('prenom')->nullable();
                $table->string('email');
                $table->string('telephone');
                $table->string('adresse')->nullable();
                $table->bigInteger('created_by')->nullable();
                $table->bigInteger('updated_by')->nullable();
                $table->string('raisonsociale')->nullable();
                $table->string('typetransporteur')->nullable();
                $table->string('statut')->default('pending');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('inscription')) {
            Schema::create('inscription', function (Blueprint $table) {
                $table->id();
                $table->string('keyinscription');
                $table->string('email');
                $table->string('statut')->default('pending');
                $table->string('token')->nullable();
                $table->bigInteger('created_by')->nullable();
                $table->bigInteger('updated_by')->nullable();
                $table->string('numero_dossier')->unique();
                $table->foreignId('idtransporteur')->nullable()->constrained('transporteur')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('piece_a_fournir')) {
            Schema::create('piece_a_fournir', function (Blueprint $table) {
                $table->id();
                $table->string('keypieceafournir');
                $table->string('libelle')->nullable();
                $table->text('description')->nullable();
                $table->boolean('isrequired')->default(true);
                $table->bigInteger('created_by')->nullable();
                $table->bigInteger('updated_by')->nullable();
                $table->string('extension')->nullable();
                $table->string('statut')->nullable();
                $table->string('type_de_piece')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('piece_inscription')) {
            Schema::create('piece_inscription', function (Blueprint $table) {
                $table->id();
                $table->string('keypieceinscription');
                $table->string('piece');
                $table->string('created_by')->nullable();
                $table->string('updated_by')->nullable();
                $table->string('statut')->default('pending');
                $table->foreignId('idpieceafournir')->constrained('piece_a_fournir')->cascadeOnDelete();
                $table->foreignId('idinscription')->constrained('inscription')->cascadeOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('rejet_inscription')) {
            Schema::create('rejet_inscription', function (Blueprint $table) {
                $table->id();
                $table->string('keyrejetinscription')->nullable();
                $table->foreignId('idinscription')->constrained('inscription')->cascadeOnDelete();
                $table->text('raison');
                $table->string('statut')->default('active');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('rejet_inscription');
        Schema::dropIfExists('piece_inscription');
        Schema::dropIfExists('piece_a_fournir');
        Schema::dropIfExists('inscription');
        Schema::dropIfExists('transporteur');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['user_type', 'country', 'raison_sociale', 'cfe_path', 'nom', 'prenom', 'statut', 'idtransporteur']);
        });
    }
};
